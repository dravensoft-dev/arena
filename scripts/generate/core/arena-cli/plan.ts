/* What a build would leave on disk, worked out without leaving anything. themeSheets and
 * iconsSheet are the theme and icons steps with the writes taken out: they read the disk and answer
 * the sheets, their reports and the code a failure carries. plan runs them in order and answers
 * all the sheets or none, so a tree never pairs a new theme with an old icon subset. */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, basename, join, resolve } from 'node:path';
import { relativeFrom } from './posix.ts';
import { configProblems, paletteReports, themeCss, weightReports } from './theme-css.ts';
import type { PackageSheets } from './theme-css.ts';
import { AUTO } from './components.ts';
import type { ComponentMap } from './components.ts';
import {
  scan, drawn, glyphNames, iconsCss, mergeShipped, shippedNames, woff2Source, WEIGHT_CLASSES,
} from './icon-css.ts';
import type { IconScan } from './icon-css.ts';
import { report } from './reports.ts';
import type { Report } from './reports.ts';
import {
  THEME_SHEET, ICONS_SHEET, PLUGIN_SHEET, PLUGIN_LAYER, ICON_MANIFEST,
  iconManifest, pluginCss, pluginSheets, readPlugins,
} from './sheets.ts';
import { OUTPUT_SHEETS, missingSource, sourceFiles } from './sources.ts';
import { autoComponents, reportLines } from './steps.ts';
import type { Options } from './args.ts';
import type { resolveEnvironment } from './host.ts';

export type PlanOptions = Pick<Options, 'config' | 'paths' | 'out' | 'importHeader'>;
export type PlanEnvironment = ReturnType<typeof resolveEnvironment>;
export type ThemeEnvironment = { packageName: string; sheets: PackageSheets; map?: ComponentMap | null };
export type OutputSheet = typeof THEME_SHEET | typeof ICONS_SHEET | typeof PLUGIN_SHEET;
export type SheetOutput = { name: OutputSheet; path: string; content: string; summary: string };
export type Plan = {
  code: 0 | 1 | 2;
  fatal: string[];
  reports: Report[];
  notes: string[];
  outputs: SheetOutput[];
  orphans: string[];
};
export type SheetState = { path: string; state: 'missing' | 'stale' | 'current' };

export function themeSheets(options: PlanOptions, { packageName, sheets, map }: ThemeEnvironment):
  { code: 0 | 1 | 2; fatal: string[]; reports: Report[]; notes: string[]; sheets: SheetOutput[] } {
  const stop = (code: 1 | 2, fatal: string[]) => ({ code, fatal, reports: [] as Report[], notes: [] as string[], sheets: [] as SheetOutput[] });
  let config;
  try {
    config = JSON.parse(readFileSync(options.config, 'utf8'));
  } catch (error) {
    return stop(2, [`cannot read ${options.config}: ${(error as Error).message}`]);
  }

  const auto = { reports: [] as Report[], notes: [] as string[] };
  if (config.stylesheet?.components === AUTO) {
    if (!map) {
      return stop(1, [`"components": "${AUTO}" reads the component map this package carries, and it is not `
        + 'beside this command, so nothing can be resolved; name the sheets instead']);
    }
    const resolved = autoComponents(config, { paths: options.paths, config: options.config }, map, packageName);
    if (resolved.fatal) return stop(1, resolved.fatal);
    config = { ...config, stylesheet: { ...config.stylesheet, components: resolved.components } };
    auto.reports.push(...resolved.reports.map((line) => report('components', line)));
    auto.notes.push(resolved.note);
  }

  const from = dirname(resolve(options.config));
  const { plugins, fatal } = readPlugins(config, from);
  if (fatal.length) return stop(1, fatal);

  const problems = configProblems(config, sheets, plugins);
  if (problems.length) return stop(1, problems);

  const reports = [...auto.reports,
    ...reportLines(paletteReports(config, sheets?.catalogue ?? null, plugins, sheets?.levels ?? [], sheets?.washes ?? [])),
    ...weightReports(config, sheets?.catalogue ?? null, plugins)];
  const css = themeCss(config, {
    packageName, importHeader: options.importHeader, source: basename(options.config), sheets, plugins,
  });
  const out: SheetOutput[] = [{ name: THEME_SHEET, path: join(options.out, THEME_SHEET), content: css, summary: `${css.length} bytes` }];
  const layered = pluginCss(pluginSheets(config, from));
  if (layered !== null) {
    out.push({
      name: PLUGIN_SHEET,
      path: join(options.out, PLUGIN_SHEET),
      content: layered,
      summary: `${layered.length} bytes, wrapped in @layer ${PLUGIN_LAYER}`,
    });
  }
  return { code: 0, fatal: [], reports, notes: auto.notes, sheets: out };
}

export function iconsSheet(options: PlanOptions, { arena, phosphor }: { arena: string | null; phosphor: string | null }):
  { code: 0 | 1 | 2; fatal: string[]; reports: Report[]; sheet: SheetOutput | null } {
  if (!phosphor) {
    return { code: 2, reports: [], sheet: null, fatal: ['cannot find @phosphor-icons/web; it is a peer of this package, so install it'] };
  }

  const found: IconScan = { pairs: new Map(), loose: new Set() };
  const reports: Report[] = [];

  const shipped = arena ? iconManifest(arena) : null;
  if (shipped) {
    mergeShipped(shipped, found);
  } else if (arena) {
    reports.push(report('environment', `${ICON_MANIFEST} is not beside this package, so the icons Arena `
      + 'draws itself were not counted and your sheet carries only what your own sources name'));
  } else {
    reports.push(report('environment', 'not running from inside an Arena package, so the icons Arena draws itself were not counted'));
  }

  const yours: IconScan = { pairs: new Map(), loose: new Set() };
  for (const path of options.paths) {
    const files = sourceFiles(path);
    if (!files) return { code: 2, reports, sheet: null, fatal: [`${path} is not there`] };
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      scan(source, found);
      scan(source, yours);
    }
  }

  const wanted = drawn(found);
  if (wanted.length === 0) {
    return {
      code: 1,
      reports,
      sheet: null,
      fatal: ['no Phosphor weight class was found beside a glyph, so no rule can be written; '
        + `a class list reads ${WEIGHT_CLASSES.bold} ph-bell, and the weight is what names the font`],
    };
  }

  const path = join(options.out, ICONS_SHEET);
  const outDir = dirname(resolve(path));
  const weights = [];
  for (const { weight, glyphs } of wanted) {
    const dir = join(phosphor, 'src', weight);
    const sheet = join(dir, 'style.css');
    if (!existsSync(sheet)) {
      return { code: 2, reports, sheet: null, fatal: [`${sheet} is not there, so the ${weight} weight cannot be subset`] };
    }
    const css = readFileSync(sheet, 'utf8');
    const woff2 = woff2Source(css, weight);
    if (!woff2 || !existsSync(join(dir, woff2))) {
      return { code: 2, reports, sheet: null, fatal: [`the ${weight} sheet names no woff2 this package has, so its @font-face would be dead`] };
    }
    weights.push({ weight, css, glyphs, fontPath: relativeFrom(outDir, join(dir, woff2)) });
  }

  const { css, missing, kept } = iconsCss(weights, options.paths.join(', '));
  for (const [weight, names] of missing) {
    for (const name of names) reports.push(report('glyph', `${weight}: ${name} is not an icon Phosphor draws at that weight`));
  }

  return {
    code: 0,
    reports,
    fatal: [],
    sheet: {
      name: ICONS_SHEET,
      path,
      content: css,
      summary: `${kept} glyph(s), ${glyphNames(yours).size} named by your sources and `
        + `${shipped ? shippedNames(shipped).size : 0} drawn by Arena's own components, `
        + `${weights.length} weight(s), ${css.length} bytes`,
    },
  };
}

const failed = (code: 1 | 2, fatal: string[], reports: Report[] = []): Plan =>
  ({ code, fatal, reports, notes: [], outputs: [], orphans: [] });

export function plan(options: PlanOptions, env: PlanEnvironment): Plan {
  const absent = missingSource(options.paths);
  if (absent !== null) return failed(2, [`${absent} is not there`]);

  const theme = themeSheets(options, env);
  if (theme.fatal.length) return failed(theme.code === 2 ? 2 : 1, theme.fatal, theme.reports);

  const icons = iconsSheet(options, env);
  if (icons.fatal.length || !icons.sheet) return failed(icons.code === 2 ? 2 : 1, icons.fatal, [...theme.reports, ...icons.reports]);

  const outputs = [...theme.sheets, icons.sheet];
  const carried = new Set<string>(outputs.map((one) => one.name));
  const orphans = [...OUTPUT_SHEETS].filter((name) => !carried.has(name) && existsSync(join(options.out, name)));
  return {
    code: 0,
    fatal: [],
    reports: [...theme.reports, ...icons.reports],
    notes: theme.notes,
    outputs,
    orphans,
  };
}

export function sheetStates(outputs: SheetOutput[]): SheetState[] {
  return outputs.map(({ path, content }) => {
    if (!existsSync(path)) return { path, state: 'missing' };
    return { path, state: readFileSync(path, 'utf8') === content ? 'current' : 'stale' };
  });
}
