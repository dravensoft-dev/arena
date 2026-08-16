#!/usr/bin/env node
/* The one command an Arena consumer runs: their arena.config.json and their sources in, the two
 * stylesheets a production build needs out. It ships inside both npm packages as
 * bin/arena-to-prod.ts and depends on nothing but node and its own siblings, because inside a
 * package `scripts/` does not exist. The theme step turns their palettes and fonts into the
 * stylesheet a package cannot carry; the icons step writes the Phosphor subset the project and
 * the package between them draw. Theme first, and its failure stops the run: a project whose
 * config does not parse has no theme, and nothing to subset for. hostPackage answers a path
 * rather than a name because the two steps want different things out of it. A configuration
 * problem is always fatal and a report is not, since a consumer owns their brand; --strict is
 * what makes one fatal, and it takes the kinds it holds, on reports.ts's reasoning. */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, basename, join, relative, resolve, sep } from 'node:path';
import {
  DEFAULT_PLUGIN, PLUGIN_TOKENS, configProblems, paletteReports, pluginName, readPlugin, themeCss,
} from './theme-css.ts';
import type { ArenaConfig, PackageSheets, ResolvedPlugins, TokenCatalogue } from './theme-css.ts';
import { POLARITIES } from './palette-keys.ts';
import type { ComponentMap } from './components.ts';
import { scan, drawn, glyphNames, iconsCss, woff2Source, WEIGHT_CLASSES } from './icon-css.ts';
import type { IconScan } from './icon-css.ts';
import { AUTO, resolve as resolveComponents } from './components.ts';
import { markerProblems } from './markers.ts';
import { auditText, paintedParts, sourceScope } from './audit.ts';
import { restatedFindings, sheetFor } from './restated.ts';
import { STRICT_KINDS, report, reported } from './reports.ts';
import type { Report, StrictKind } from './reports.ts';

const here = dirname(fileURLToPath(import.meta.url));

export const THEME_SHEET = 'arena.generated.css';
export const ICONS_SHEET = 'icons.generated.css';
export const PLUGIN_SHEET = 'plugin.generated.css';
export const PLUGIN_CSS = 'plugin.css';
export const PLUGIN_LAYER = 'arena-plugin';
export const PLUGIN_LAYER_ORDER = '@layer properties;\n@layer theme, base, components, utilities, arena-plugin;\n';
export const COMPONENT_MAP = 'components.json';

export const DEFAULT_CONFIG = 'arena.config.json';
export const DEFAULT_SOURCE = 'src';
export const DEFAULT_OUT = 'src';

export const SOURCE_EXTENSIONS = ['.html', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css'];
export const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist', '.git', '.angular', 'coverage']);
export const OUTPUT_SHEETS = new Set([THEME_SHEET, ICONS_SHEET, PLUGIN_SHEET]);

export const USAGE = [
  'usage: arena-to-prod [--config <path>] [--src <path>...] [--out <dir>] [--audit] [--undrawn] [--strict[=<kind>,...]]',
  '',
  `  --config        the palettes and fonts this project declares; defaults to ${DEFAULT_CONFIG}`,
  `  --src           a source tree to scan for Phosphor class names; repeatable, defaults to ${DEFAULT_SOURCE}`,
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
  const options: CliOptions = { strict: [], audit: false, undrawn: false, importHeader: true, paths };
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

export function hostPackage(dir = here) {
  try {
    const root = join(dir, '..');
    return /^@dravensoft\/arena-/.test(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).name) ? root : null;
  } catch {
    return null;
  }
}

export function hostPackageName(root: string) {
  try {
    return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).name;
  } catch {
    return null;
  }
}

export const SHEET_IMPORT = /@import\s+'\.\/([^']+)';/g;

export const CSS_BLOCK = /([^{}]+)\{([^}]*)\}/g;

export const CATALOGUE_FILE = 'arena.tokens.json';

export const REFERENCE_DECLARATION = /^--[\w-]+:\s*var\(--color-[\w-]+\)$/;

export function packageCatalogue(root: string): TokenCatalogue | null {
  try {
    return JSON.parse(readFileSync(join(root, CATALOGUE_FILE), 'utf8')) as TokenCatalogue;
  } catch {
    return null;
  }
}

export function roleReferencesIn(catalogue: TokenCatalogue | null): string[] {
  if (!catalogue) return [];
  return Object.entries(catalogue.tokens ?? {})
    .map(([name, value]) => `--${name}:${value};`)
    .filter((d) => REFERENCE_DECLARATION.test(d.replace(/;$/, '')));
}

export function packageSheets(root: string): PackageSheets {
  try {
    const layers = [...readFileSync(join(root, 'arena.css'), 'utf8').matchAll(SHEET_IMPORT)]
      .map((m) => m[1] ?? '');
    const components = readdirSync(join(root, 'css', 'components'))
      .filter((name) => name.endsWith('.css'))
      .map((name) => basename(name, '.css'))
      .sort();
    if (!layers.length || !components.length) return null;
    const catalogue = packageCatalogue(root);
    return {
      layers,
      components,
      roleReferences: roleReferencesIn(catalogue),
      catalogue: catalogue ?? undefined,
    };
  } catch {
    return null;
  }
}

export function pluginCss(sheets: { name: string; css: string; root?: boolean }[]) {
  const carried = sheets.filter(({ css }) => css.trim() !== '');
  if (carried.length === 0) return null;
  const scoped = ({ name, css, root }: { name: string; css: string; root?: boolean }) =>
    (root ? css.trim() : `.arena-${name} {\n${css.trim()}\n}`);
  return `${PLUGIN_LAYER_ORDER}\n@layer ${PLUGIN_LAYER} {\n${carried.map(scoped).join('\n')}\n}\n`;
}

export function pluginSheets(config: ArenaConfig, from: string) {
  const declared = Array.isArray(config.stylePlugins) ? config.stylePlugins : [];
  const out: { name: string; css: string; root: boolean }[] = [];
  declared.forEach((entry, i) => {
    if (typeof entry !== 'string' || entry.trim() === DEFAULT_PLUGIN) return;
    const at = join(resolve(from, entry.trim()), PLUGIN_CSS);
    if (!existsSync(at)) return;
    out.push({ name: pluginName(entry), css: readFileSync(at, 'utf8'), root: i === 0 });
  });
  return out;
}

export function readPlugins(config: ArenaConfig, from: string) {
  const declared = Array.isArray(config.stylePlugins) ? config.stylePlugins : [];
  const plugins: ResolvedPlugins = [];
  const fatal: string[] = [];
  declared.forEach((entry, i) => {
    if (typeof entry !== 'string' || entry.trim() === DEFAULT_PLUGIN) { plugins.push(null); return; }
    const dir = resolve(from, entry.trim());
    const file = join(dir, PLUGIN_TOKENS);
    try {
      plugins.push(readPlugin(pluginName(entry), JSON.parse(readFileSync(file, 'utf8'))));
    } catch (error) {
      plugins.push(null);
      fatal.push(`stylePlugins[${i}]: cannot read ${file}: ${(error as Error).message}. An entry is `
        + `the word "${DEFAULT_PLUGIN}" or a directory of your own holding ${PLUGIN_TOKENS}`);
    }
  });
  return { plugins, fatal };
}

export function componentMap(root: string): ComponentMap | null {
  try {
    const map = JSON.parse(readFileSync(join(root, COMPONENT_MAP), 'utf8'));
    return map.match && map.draws ? map : null;
  } catch {
    return null;
  }
}

const byCodeUnit = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function sourceFiles(path: string) {
  const found: string[] = [];
  const walk = (at: string) => {
    for (const entry of readdirSync(at, { withFileTypes: true }).sort((a, b) => byCodeUnit(a.name, b.name))) {
      if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
      const full = join(at, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (OUTPUT_SHEETS.has(entry.name)) continue;
      if (SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) found.push(full);
    }
  };
  if (!existsSync(path)) return null;
  if (statSync(path).isDirectory()) walk(path); else found.push(path);
  return found;
}

export function phosphorRoot(from = process.cwd(), fallback = here) {
  for (const start of [from, fallback]) {
    let at = resolve(start);
    for (;;) {
      const candidate = join(at, 'node_modules', '@phosphor-icons', 'web');
      if (existsSync(join(candidate, 'package.json'))) return candidate;
      const up = dirname(at);
      if (up === at) break;
      at = up;
    }
  }
  return null;
}

export function relativeFrom(outDir: string, target: string) {
  const path = relative(outDir, target).split(sep).join('/');
  return path.startsWith('.') ? path : `./${path}`;
}

export function reportLines(reports: { palette: string; messages: Report[] }[]) {
  return reports.flatMap(({ palette, messages }) =>
    messages.map((one) => report(one.kind, `${palette}: ${one.message}`)));
}

export function autoComponents(config: ArenaConfig, options: ResolvedOptions,
  map: ComponentMap, packageName: string) {
  const sources = [];
  for (const path of options.paths) {
    for (const file of sourceFiles(path) ?? []) sources.push(readFileSync(file, 'utf8'));
  }

  const found = resolveComponents(map, sources, packageName);
  if (!found) {
    return { fatal: [`"components": "${AUTO}" cannot be read against a map keyed by ${JSON.stringify(map.match)}, `
      + 'which this command does not know how to scan for; name the sheets instead'] };
  }
  if (found.components.length === 0) {
    return { fatal: [`"components": "${AUTO}" found no Arena component under ${options.paths.join(', ')}, `
      + 'so the subset would be empty; point --src at the sources that render them, or name the sheets'] };
  }

  return {
    components: found.components,
    reports: found.unplaced.map((one) => `${one} is not a component this package ships, so no sheet was added for it`),
    note: `${found.drawn.length} component sheet(s) drawn`
      + (found.pulled.length ? `, and ${found.pulled.length} Arena draws for you: ${found.pulled.join(', ')}` : ''),
  };
}

export function readSources(paths: string[]) {
  const sources = [];
  for (const path of paths) {
    for (const file of sourceFiles(path) ?? []) sources.push(readFileSync(file, 'utf8'));
  }
  return sources;
}

export function pluginDirs(options: ResolvedOptions) {
  let config;
  try {
    config = JSON.parse(readFileSync(options.config, 'utf8'));
  } catch {
    return [] as string[];
  }
  const declared = Array.isArray(config.stylePlugins) ? config.stylePlugins : [];
  return declared
    .filter((entry: unknown): entry is string => typeof entry === 'string' && entry.trim() !== DEFAULT_PLUGIN)
    .map((entry: string) => resolve(dirname(resolve(options.config)), entry.trim()));
}

export function gradientMark(options: ResolvedOptions) {
  try {
    return JSON.parse(readFileSync(options.config, 'utf8')).gradientMark === true;
  } catch {
    return false;
  }
}

export function auditStep(options: ResolvedOptions, arena: string | null = null) {
  if (!options.audit) return { reports: [] as Report[], scanned: 0, painted: [] as string[] };
  const dirs = pluginDirs(options);
  const declaredMark = gradientMark(options);
  const reports: Report[] = [];
  const painted = new Set<string>();
  let scanned = 0;
  const sheetOf = (part: string) => {
    if (!arena) return null;
    const path = join(arena, 'css', 'components', sheetFor(part));
    return existsSync(path) ? readFileSync(path, 'utf8') : null;
  };
  for (const path of options.paths) {
    for (const file of sourceFiles(path) ?? []) {
      scanned += 1;
      const text = readFileSync(file, 'utf8');
      const scope = sourceScope(resolve(file), dirs);
      reports.push(...auditText(file, text, scope, declaredMark).map((line) => report('audit', line)));
      if (scope !== 'plugin') continue;
      for (const part of paintedParts(text)) painted.add(part);
      if (!file.endsWith('.css')) continue;
      for (const one of restatedFindings(text, sheetOf)) {
        reports.push(report('restated', `${file}: ${one.property} on [data-arena-part="${one.part}"] `
          + `is already ${one.value} on that slot, so the declaration changes nothing. The audit `
          + 'counts a part as painted by reading source text, and a role is grown from that count, '
          + 'so a restatement is evidence for a question nobody asked'));
      }
    }
  }
  return { reports, scanned, painted: [...painted].sort() };
}

export function markersStep(options: ResolvedOptions, map: ComponentMap | null) {
  if (!map?.markers) return { reports: [] as Report[] };
  const files = [];
  for (const path of options.paths) {
    for (const file of sourceFiles(path) ?? []) {
      if (!file.endsWith('.ts')) continue;
      files.push({ path: file, source: readFileSync(file, 'utf8') });
    }
  }
  return { reports: markerProblems(files, map.markers).map((line) => report('markers', line)) };
}

export function undrawnStep(options: ResolvedOptions, packageName: string, map: ComponentMap | null) {
  if (!map) {
    return { notes: [] as string[],
      fatal: ['--undrawn reads the component map this package carries, and it is not beside this '
        + 'command, so what you draw cannot be compared against what ships'] };
  }
  const found = resolveComponents(map, readSources(options.paths), packageName);
  if (!found) {
    return { notes: [] as string[],
      fatal: [`--undrawn cannot read a map keyed by ${JSON.stringify(map.match)}`] };
  }

  const shipped = Object.keys(map.draws).sort();
  const undrawn = shipped.filter((key) => !found.keys.includes(key));
  const notes = [
    `${found.keys.length} of ${shipped.length} shipped component(s) drawn under ${options.paths.join(', ')}`,
  ];
  notes.push(undrawn.length === 0
    ? 'every component this package ships is drawn somewhere'
    : `${undrawn.length} drawn nowhere: ${undrawn.join(', ')}`);
  return { notes, fatal: [] as string[] };
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

  const reports = [...auto.reports, ...reportLines(paletteReports(config))];
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
  const ours: IconScan = { pairs: new Map(), loose: new Set() };

  if (arena) {
    for (const file of sourceFiles(arena) ?? []) {
      if (dirname(file) === join(arena, 'bin')) continue;
      const source = readFileSync(file, 'utf8');
      scan(source, found);
      scan(source, ours);
    }
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
      + `${glyphNames(ours).size} by Arena's own components, ${sheets.length} weight(s), `
      + `${css.length} bytes)` };
}

export type ThemeEnvironment = {
  packageName: string;
  sheets: PackageSheets;
  map?: ComponentMap | null;
};

export type Environment = {
  packageName?: string;
  arena?: string | null;
  phosphor?: string | null;
  sheets?: PackageSheets;
  map?: ComponentMap | null;
};

export function main(argv: string[], environment: Environment = {}) {
  const parsed = parseArgs(argv);
  if (parsed.help) { console.log(USAGE); return 0; }
  if (parsed.error) { console.error(`arena-to-prod: ${parsed.error}\n\n${USAGE}`); return 2; }
  const options = resolved(parsed);

  const arena = ('arena' in environment ? environment.arena : hostPackage()) ?? null;
  const packageName = environment.packageName
    ?? (arena ? hostPackageName(arena) : null)
    ?? '@dravensoft/arena-react';
  const sheets = ('sheets' in environment ? environment.sheets : (arena ? packageSheets(arena) : null)) ?? null;
  const map = ('map' in environment ? environment.map : (arena ? componentMap(arena) : null)) ?? null;
  const phosphor = ('phosphor' in environment ? environment.phosphor : phosphorRoot()) ?? null;

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

  const audit = auditStep(options, arena);
  for (const one of audit.reports) console.error(`arena-to-prod: ${one.message}`);
  if (options.audit) {
    console.log(`arena-to-prod: audited ${audit.scanned} file(s), `
      + `${audit.reports.length || 'no'} finding(s). No gate reads your application, so these hold `
      + 'because you hold them');
    const named = audit.painted.length ? `: ${audit.painted.join(', ')}` : '';
    console.log(`arena-to-prod: your style plugin(s) paint ${audit.painted.length || 'no'} part(s)${named}. `
      + 'A role is added to Arena when several style plugins are measured painting the same decision '
      + 'by hand through the same part, so this note is where the evidence for one comes from');
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
