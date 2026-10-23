/* What a build would leave on disk, worked out without leaving anything. themeSheets and
 * spriteFiles are the theme and sprite steps with the writes taken out: they read the disk and
 * answer the files, their reports and the code a failure carries. plan runs them in order and answers
 * all the files or none, so a tree never pairs a new theme with an old sprite. A named
 * component list is closed against the same map before the config is validated, so a sheet its
 * components draw is never left out, and with no map it is used as written. */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, basename, join, resolve } from 'node:path';
import { configProblems, defaultedNote, paletteReports, rootWithDefaults, runtimeData, themeCss, weightReports } from './theme-css.ts';
import type { PackageSheets } from './theme-css.ts';
import { AUTO, resolve as resolveComponents } from './components.ts';
import type { ComponentMap } from './components.ts';
import { scan, drawnGlyphs, fillSourceGlyphs, glyphNames, mergeShipped, shippedNames, WEIGHT_CLASSES } from './icon-css.ts';
import type { IconScan } from './icon-css.ts';
import { report } from './reports.ts';
import type { Report } from './reports.ts';
import {
  THEME_SHEET, PLUGIN_SHEET, RUNTIME_DATA, PLUGIN_LAYER, ICON_MANIFEST, SPRITE_MODULE, SPRITE_TYPES, SPRITE_STEM,
  iconManifest, pluginCss, pluginSheets, readPlugins,
} from './sheets.ts';
import { OUTPUT_SHEETS, missingSource, sourceFiles, spriteFilesIn } from './sources.ts';
import { contentName, glyphFile, spriteModule, spriteSvg } from './sprite.ts';
import { autoComponents, namedComponents, reportLines } from './steps.ts';
import type { Options } from './args.ts';
import type { resolveEnvironment } from './host.ts';

export type PlanOptions = Pick<Options, 'config' | 'paths' | 'out' | 'importHeader'>;
export type PlanEnvironment = ReturnType<typeof resolveEnvironment>;
export type ThemeEnvironment = { packageName: string; sheets: PackageSheets; map?: ComponentMap | null };
export type SheetOutput = { name: string; path: string; content: string; summary: string };
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
  { code: 0 | 1 | 2; fatal: string[]; reports: Report[]; notes: string[]; sheets: SheetOutput[]; components: string[] | null } {
  const stop = (code: 1 | 2, fatal: string[]) => ({
    code, fatal, reports: [] as Report[], notes: [] as string[], sheets: [] as SheetOutput[], components: null,
  });
  let config;
  try {
    config = JSON.parse(readFileSync(options.config, 'utf8'));
  } catch (error) {
    return stop(2, [`cannot read ${options.config}: ${(error as Error).message}`]);
  }

  const closure = { reports: [] as Report[], notes: [] as string[] };
  const byDefault = config.stylesheet?.components === undefined;
  let drawn: string[] | null = null;
  if (byDefault && sheets && !map) {
    closure.reports.push(report('environment', 'the component map is not beside this package, so every component sheet '
      + 'is imported instead of the ones the sources draw'));
  }
  if (config.stylesheet?.components === AUTO || (byDefault && sheets && map)) {
    if (!map && !byDefault) {
      return stop(1, [`"components": "${AUTO}" reads the component map this package carries, and it is not `
        + 'beside this command, so nothing can be resolved; name the sheets instead']);
    }
    const resolved = autoComponents(config, { paths: options.paths, config: options.config }, map!, packageName, !byDefault);
    if (resolved.fatal) return stop(1, resolved.fatal);
    if (byDefault) drawn = resolved.components;
    else config = { ...config, stylesheet: { ...config.stylesheet, components: resolved.components } };
    closure.reports.push(...resolved.reports.map((line) => report('components', line)));
    closure.notes.push(resolved.note);
  } else if (Array.isArray(config.stylesheet?.components) && map) {
    const named = namedComponents(config.stylesheet.components, map);
    config = { ...config, stylesheet: { ...config.stylesheet, components: named.components } };
    if (named.note) closure.notes.push(named.note);
  }

  const from = dirname(resolve(options.config));
  const { plugins, fatal } = readPlugins(config, from);
  if (fatal.length) return stop(1, fatal);

  const problems = configProblems(config, sheets, plugins);
  if (problems.length) return stop(1, problems);

  if (drawn) config = { ...config, stylesheet: { ...config.stylesheet, components: drawn } };

  const completed = rootWithDefaults(plugins, sheets?.catalogue ?? null);
  if (completed.defaulted.length) closure.notes.push(defaultedNote(completed.defaulted));
  const reports = [...closure.reports,
    ...reportLines(paletteReports(config, sheets?.catalogue ?? null, completed.plugins, sheets?.levels ?? [], sheets?.washes ?? [])),
    ...weightReports(config, sheets?.catalogue ?? null, completed.plugins)];
  const css = themeCss(config, {
    packageName, importHeader: options.importHeader, source: basename(options.config), sheets, plugins: completed.plugins,
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
  if (config.runtimePalettes === true) {
    const data = `${JSON.stringify(runtimeData(config, sheets, completed.plugins), null, 2)}\n`;
    out.push({ name: RUNTIME_DATA, path: join(options.out, RUNTIME_DATA), content: data, summary: `${data.length} bytes` });
  }
  const resolved = map && Array.isArray(config.stylesheet?.components) ? config.stylesheet.components as string[] : null;
  return { code: 0, fatal: [], reports, notes: closure.notes, sheets: out, components: resolved };
}

export type SpriteEnvironment = { arena: string | null; phosphor: string | null; map?: ComponentMap | null; packageName?: string };

const bare = (glyph: string) => glyph.replace(/^ph-/, '');

export function spriteFiles(options: PlanOptions, { arena, phosphor, map = null, packageName = '' }: SpriteEnvironment,
  drawn: string[] | null = null):
  { code: 0 | 1 | 2; fatal: string[]; reports: Report[]; files: SheetOutput[] } {
  if (!phosphor) {
    return { code: 2, reports: [], files: [], fatal: ['cannot find @phosphor-icons/core; it is a dependency of this package, so install the package again'] };
  }

  const found: IconScan = { pairs: new Map(), loose: new Set() };
  const reports: Report[] = [];

  const shipped = arena ? iconManifest(arena) : null;
  const counted = shipped && map && drawn
    ? new Set(Object.entries(map.draws).filter(([, sheet]) => sheet && drawn.includes(sheet)).map(([key]) => key))
    : null;
  if (shipped) {
    mergeShipped(shipped, found, counted);
    if (!map) {
      reports.push(report('environment', 'the component map is not beside this package, so every component\'s '
        + 'glyphs are in the sprite instead of the ones the sources draw'));
    }
  } else if (arena) {
    reports.push(report('environment', `${ICON_MANIFEST} is not beside this package, so the icons Arena `
      + 'draws itself were not counted and your sprite carries only what your own sources name'));
  } else {
    reports.push(report('environment', 'not running from inside an Arena package, so the icons Arena draws itself were not counted'));
  }

  const yours: IconScan = { pairs: new Map(), loose: new Set() };
  const swapping = new Set(shipped?.fills ?? []);
  const sources: string[] = [];
  for (const path of options.paths) {
    const files = sourceFiles(path);
    if (!files) return { code: 2, reports, files: [], fatal: [`${path} is not there`] };
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      scan(source, found);
      scan(source, yours);
      sources.push(source);
    }
  }

  const drawsFill = (source: string) => !map
    ? true
    : resolveComponents(map, [source], packageName)?.keys.some((key) => swapping.has(String(key))) ?? true;
  const wanted = drawnGlyphs(found, fillSourceGlyphs(sources, drawsFill));
  if (wanted.length === 0 && !shipped) {
    return {
      code: 1,
      reports,
      files: [],
      fatal: ['no Phosphor weight class was found beside a glyph, so no symbol can be written; '
        + `a class list reads ${WEIGHT_CLASSES.bold} ph-bell, and the weight is what names the glyph`],
    };
  }

  const { svg, missing, kept } = spriteSvg(
    wanted.map(({ weight, glyphs }) => ({ weight, glyphs: new Set([...glyphs].map(bare)) })),
    (weight, name) => {
      try {
        return readFileSync(glyphFile(phosphor, weight, name), 'utf8');
      } catch {
        return null;
      }
    },
  );
  for (const [weight, names] of missing) {
    for (const name of names) reports.push(report('glyph', `${weight}: ph-${name} is not an icon Phosphor draws at that weight`));
  }

  const name = contentName(SPRITE_STEM, 'svg', svg);
  const module = spriteModule(name);
  const empty = kept === 0;
  const summary = empty
    ? `0 symbol(s), no weight drawn by your sources or by the Arena components they draw, ${svg.length} bytes`
    : `${kept} symbol(s), ${glyphNames(yours).size} named by your sources and `
      + `${shipped ? shippedNames(shipped, counted).size : 0} drawn by Arena's own components, `
      + `${wanted.length} weight(s), ${svg.length} bytes`;
  return {
    code: 0,
    reports,
    fatal: [],
    files: [
      { name, path: join(options.out, name), content: svg, summary },
      { name: SPRITE_MODULE, path: join(options.out, SPRITE_MODULE), content: module.js, summary: `exports ${name}` },
      { name: SPRITE_TYPES, path: join(options.out, SPRITE_TYPES), content: module.dts, summary: `${module.dts.length} bytes` },
    ],
  };
}

const failed = (code: 1 | 2, fatal: string[], reports: Report[] = []): Plan =>
  ({ code, fatal, reports, notes: [], outputs: [], orphans: [] });

export function plan(options: PlanOptions, env: PlanEnvironment): Plan {
  const absent = missingSource(options.paths);
  if (absent !== null) return failed(2, [`${absent} is not there`]);

  const theme = themeSheets(options, env);
  if (theme.fatal.length) return failed(theme.code === 2 ? 2 : 1, theme.fatal, theme.reports);

  const icons = spriteFiles(options, env, theme.components);
  if (icons.fatal.length) return failed(icons.code === 2 ? 2 : 1, icons.fatal, [...theme.reports, ...icons.reports]);

  const outputs = [...theme.sheets, ...icons.files];
  const carried = new Set<string>(outputs.map((one) => one.name));
  const orphans = [...OUTPUT_SHEETS, ...spriteFilesIn(options.out)]
    .filter((name) => !carried.has(name) && existsSync(join(options.out, name)));
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
