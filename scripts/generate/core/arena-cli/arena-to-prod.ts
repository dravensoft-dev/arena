#!/usr/bin/env node
/* The one command an Arena consumer runs: their arena.config.json and their sources in, the two
 * stylesheets a production build needs out. It ships inside both npm packages as
 * bin/arena-to-prod.ts and depends on nothing but node and its own siblings, because inside a
 * package `scripts/` does not exist. The theme step turns their palettes and fonts into the
 * stylesheet a package cannot carry; the icons step writes the Phosphor subset the project and
 * the package between them draw. Theme first, and its failure stops the run: a project whose
 * config does not parse has no theme, and nothing to subset for. This file is the surface: the
 * flags, the two steps that write, and the order they run in. A configuration problem is always
 * fatal and a report is not, since a consumer owns their brand; --strict is what makes one fatal,
 * and it takes the kinds it holds, on reports.ts's reasoning. */

import { readFileSync, writeFileSync, mkdirSync, existsSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, basename, join, resolve } from 'node:path';
import { relativeFrom } from './posix.ts';
import {
  configProblems, paletteReports, themeCss, weightReports,
} from './theme-css.ts';
import type { PackageSheets } from './theme-css.ts';
import type { ComponentMap } from './components.ts';
import {
  scan, drawn, glyphNames, iconsCss, mergeShipped, shippedNames, woff2Source, WEIGHT_CLASSES,
} from './icon-css.ts';
import type { IconScan } from './icon-css.ts';
import { AUTO } from './components.ts';
import { STRICT_KINDS, report, reported } from './reports.ts';
import type { Report, StrictKind } from './reports.ts';
import {
  THEME_SHEET, ICONS_SHEET, PLUGIN_SHEET, PLUGIN_LAYER, ICON_MANIFEST,
  iconManifest, packageCatalogue, pluginCss, pluginSheets, readPlugins,
} from './sheets.ts';
import { DEFAULT_SOURCE, sourceFiles } from './sources.ts';
import { resolveEnvironment } from './host.ts';
import type { HostEnvironment } from './host.ts';
import { auditStep, autoComponents, markersStep, paintedBy, reportLines, undrawnStep } from './steps.ts';

export const DEFAULT_CONFIG = 'arena.config.json';
export const DEFAULT_OUT = 'src';

export const USAGE = [
  'usage: arena-to-prod [--config <path>] [--src <path>...] [--out <dir>] [--audit] [--undrawn] [--strict[=<kind>,...]]',
  '',
  `  --config        the palettes and fonts this project declares; defaults to ${DEFAULT_CONFIG}`,
  `  --src           a source tree of the project's own; repeatable, defaults to ${DEFAULT_SOURCE}`,
  '                  a style plugin declared in the config is walked wherever it lives',
  `  -o, --out       where both stylesheets go; defaults to ${DEFAULT_OUT}`,
  `                  it writes ${THEME_SHEET} and ${ICONS_SHEET}, and you import them last`,
  '  --audit         report where your sources break a rule of the language: a class of your own',
  '                  on an Arena component, one wrapped in your router\'s link, a raw value where',
  '                  a token belongs, an icon as an element, an emoji',
  '  --undrawn       name the components this package ships that your sources draw nowhere',
  `  --strict        exit 1 on a report, not only on a config problem. Bare, it holds every kind;`,
  `                  --strict=${STRICT_KINDS.slice(0, 3).join(',')} holds the ones you name, out of`,
  `                  ${STRICT_KINDS.join(', ')}`,
  '  --no-import     omit the @import of the package stylesheet from the theme output',
  '',
].join('\n');

export type ResolvedOptions = {
  strict: StrictKind[];
  audit: boolean;
  undrawn: boolean;
  importHeader: boolean;
  paths: string[];
  config: string;
  out: string;
};

export type CliOptions = Partial<ResolvedOptions> & { help?: boolean; error?: string };

export function resolved(options: CliOptions): ResolvedOptions {
  const { paths, config, out } = options;
  if (!paths || !config || !out) {
    throw new Error('arena-to-prod: parseArgs returned neither --help, nor an error, nor a '
      + 'resolved option set, so every path this command was given is unknown');
  }
  return {
    strict: options.strict ?? [],
    audit: Boolean(options.audit),
    undrawn: Boolean(options.undrawn),
    importHeader: options.importHeader !== false,
    paths,
    config,
    out,
  };
}

export function strictKinds(value: string) {
  const named = value.split(',').map((one) => one.trim()).filter(Boolean);
  const unknown = named.filter((one) => !STRICT_KINDS.includes(one as StrictKind));
  if (unknown.length) return { error: `--strict does not report on ${unknown.join(', ')}; it reports on ${STRICT_KINDS.join(', ')}` };
  return { kinds: named as StrictKind[] };
}

export function parseArgs(argv: string[]): CliOptions {
  const paths: string[] = [];
  const options: CliOptions = {
    strict: [], audit: false, undrawn: false, importHeader: true, paths,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--strict') { options.strict = [...STRICT_KINDS]; continue; }
    if (arg.startsWith('--strict=')) {
      const named = strictKinds(arg.slice('--strict='.length));
      if (named.error) return { error: named.error };
      options.strict = named.kinds;
      continue;
    }
    if (arg === '--audit') { options.audit = true; continue; }
    if (arg === '--undrawn') { options.undrawn = true; continue; }
    if (arg === '--no-import') { options.importHeader = false; continue; }
    if (arg === '--config') {
      const next = argv[++i];
      if (!next) return { error: `${arg} needs a path` };
      options.config = next;
      continue;
    }
    if (arg.startsWith('--config=')) { options.config = arg.slice('--config='.length); continue; }
    if (arg === '--src') {
      const path = argv[++i];
      if (!path) return { error: `${arg} needs a path` };
      paths.push(path);
      continue;
    }
    if (arg.startsWith('--src=')) { paths.push(arg.slice('--src='.length)); continue; }
    if (arg === '-o' || arg === '--out') {
      const next = argv[++i];
      if (!next) return { error: `${arg} needs a directory` };
      options.out = next;
      continue;
    }
    if (arg.startsWith('--out=')) { options.out = arg.slice('--out='.length); continue; }
    if (arg.startsWith('-')) return { error: `unknown flag: ${arg}` };
    return { error: `unexpected argument: ${arg}; every path this command takes is named by a flag` };
  }
  options.config ??= DEFAULT_CONFIG;
  options.out ??= DEFAULT_OUT;
  if (paths.length === 0) paths.push(DEFAULT_SOURCE);
  return options;
}

export function themeStep(
  options: ResolvedOptions,
  { packageName, sheets, map }: ThemeEnvironment,
) {
  let config;
  try {
    config = JSON.parse(readFileSync(options.config, 'utf8'));
  } catch (error) {
    return { code: 2, reports: [] as Report[], fatal: [`cannot read ${options.config}: ${(error as Error).message}`] };
  }

  const auto = { reports: [] as Report[], notes: [] as string[] };
  if (config.stylesheet?.components === AUTO) {
    if (!map) {
      return { code: 1,
        reports: [],
        fatal: [`"components": "${AUTO}" reads the component map this package carries, and it is not `
          + 'beside this command, so nothing can be resolved; name the sheets instead'] };
    }
    const resolved = autoComponents(config, options, map, packageName);
    if (resolved.fatal) return { code: 1, reports: [], fatal: resolved.fatal };
    config = { ...config, stylesheet: { ...config.stylesheet, components: resolved.components } };
    auto.reports.push(...resolved.reports.map((line) => report('components', line)));
    auto.notes.push(resolved.note);
  }

  const { plugins, fatal } = readPlugins(config, dirname(resolve(options.config)));
  if (fatal.length) return { code: 1, reports: [] as Report[], fatal };

  const problems = configProblems(config, sheets, plugins);
  if (problems.length) return { code: 1, reports: [], fatal: problems };

  const reports = [...auto.reports,
    ...reportLines(paletteReports(config, sheets?.catalogue ?? null, plugins, sheets?.levels ?? [], sheets?.washes ?? [])),
    ...weightReports(config, sheets?.catalogue ?? null, plugins)];
  const out = join(options.out, THEME_SHEET);
  const css = themeCss(config, {
    packageName, importHeader: options.importHeader, source: basename(options.config), sheets, plugins,
  });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, css);

  const wrote = [`${out} (${css.length} bytes)`];
  const layered = pluginCss(pluginSheets(config, dirname(resolve(options.config))));
  if (layered !== null) {
    const at = join(options.out, PLUGIN_SHEET);
    writeFileSync(at, layered);
    wrote.push(`${at} (${layered.length} bytes, wrapped in @layer ${PLUGIN_LAYER})`);
  }

  return { code: 0, reports, fatal: [] as string[], notes: auto.notes, wrote: wrote.join(' and ') };
}

export function iconsStep(options: ResolvedOptions,
  { arena, phosphor }: { arena: string | null; phosphor: string | null }) {
  if (!phosphor) {
    return { code: 2, reports: [], fatal: ['cannot find @phosphor-icons/web; it is a peer of this package, so install it'] };
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
    if (!files) return { code: 2, reports, fatal: [`${path} is not there`] };
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
      fatal: ['no Phosphor weight class was found beside a glyph, so no rule can be written; '
        + `a class list reads ${WEIGHT_CLASSES.bold} ph-bell, and the weight is what names the font`],
    };
  }

  const out = join(options.out, ICONS_SHEET);
  const outDir = dirname(resolve(out));
  const sheets = [];
  for (const { weight, glyphs } of wanted) {
    const dir = join(phosphor, 'src', weight);
    const sheet = join(dir, 'style.css');
    if (!existsSync(sheet)) {
      return { code: 2, reports, fatal: [`${sheet} is not there, so the ${weight} weight cannot be subset`] };
    }
    const css = readFileSync(sheet, 'utf8');
    const woff2 = woff2Source(css, weight);
    if (!woff2 || !existsSync(join(dir, woff2))) {
      return { code: 2, reports, fatal: [`the ${weight} sheet names no woff2 this package has, so its @font-face would be dead`] };
    }
    sheets.push({ weight, css, glyphs, fontPath: relativeFrom(outDir, join(dir, woff2)) });
  }

  const { css, missing, kept } = iconsCss(sheets, options.paths.join(', '));
  for (const [weight, names] of missing) {
    for (const name of names) reports.push(report('glyph', `${weight}: ${name} is not an icon Phosphor draws at that weight`));
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(out, css);

  return { code: 0,
    reports,
    fatal: [] as string[],
    wrote: `${out} (${kept} glyph(s), ${glyphNames(yours).size} named by your sources and `
      + `${shipped ? shippedNames(shipped).size : 0} drawn by Arena's own components, `
      + `${sheets.length} weight(s), ${css.length} bytes)` };
}


export type ThemeEnvironment = {
  packageName: string;
  sheets: PackageSheets;
  map?: ComponentMap | null;
};

export type Environment = HostEnvironment;

export function main(argv: string[], environment: Environment = {}) {
  const parsed = parseArgs(argv);
  if (parsed.help) { console.log(USAGE); return 0; }
  if (parsed.error) { console.error(`arena-to-prod: ${parsed.error}\n\n${USAGE}`); return 2; }
  const options = resolved(parsed);

  const { arena, packageName, sheets, map, vocabulary, phosphor } = resolveEnvironment(environment);

  const theme = themeStep(options, { packageName, sheets, map });
  for (const line of theme.fatal) console.error(`arena-to-prod: ${line}`);
  for (const one of theme.reports) console.error(`arena-to-prod: ${one.message}`);
  if (theme.code !== 0) return theme.code;
  for (const line of theme.notes ?? []) console.log(`arena-to-prod: ${line}`);
  console.log(`arena-to-prod: wrote ${theme.wrote}`);

  if (options.undrawn) {
    const undrawn = undrawnStep(options, packageName, map);
    for (const line of undrawn.fatal) console.error(`arena-to-prod: ${line}`);
    if (undrawn.fatal.length) return 1;
    for (const line of undrawn.notes) console.log(`arena-to-prod: ${line}`);
  }

  const audit = auditStep(options, arena, arena ? packageCatalogue(arena) : null, vocabulary);
  for (const one of audit.reports) console.error(`arena-to-prod: ${one.message}`);
  if (options.audit) {
    console.log(`arena-to-prod: audited ${audit.scanned} file(s), `
      + `${audit.reports.length || 'no'} finding(s). No gate reads your application, so these hold `
      + 'because you hold them');
    console.log(`arena-to-prod: ${paintedBy(audit.painted)}`);
  }

  const markers = markersStep(options, map);
  for (const one of markers.reports) console.error(`arena-to-prod: ${one.message}`);

  const icons = iconsStep(options, { arena, phosphor });
  for (const line of icons.fatal) console.error(`arena-to-prod: ${line}`);
  for (const one of icons.reports) console.error(`arena-to-prod: ${one.message}`);
  if (icons.code !== 0) return icons.code;
  console.log(`arena-to-prod: wrote ${icons.wrote}`);

  const held = reported([...theme.reports, ...audit.reports, ...markers.reports, ...icons.reports],
    options.strict);
  if (held.length) {
    console.error(`arena-to-prod: --strict holds ${options.strict.join(', ')}, and this run reports `
      + `${held.length} of them: ${[...new Set(held.map((one) => one.kind))].join(', ')}`);
  }
  return held.length ? 1 : 0;
}

export function isProgram(entry: string | undefined, self: string) {
  if (entry === undefined) return false;
  if (entry === self) return true;
  try {
    return realpathSync(entry) === realpathSync(self);
  } catch {
    return false;
  }
}

if (isProgram(process.argv[1], fileURLToPath(import.meta.url))) process.exit(main(process.argv.slice(2)));
