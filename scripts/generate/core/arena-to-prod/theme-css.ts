/* Turns a consumer's arena.config.json into the one stylesheet Arena cannot ship: the palette
 * blocks, the @font-face rules and the import that pulls the package's own sheet in. Everything
 * else about a token travels inside the package. It runs in the repository, where
 * check-packages.ts holds its output equivalent to Style Dictionary's, and inside both npm
 * packages, where it is the only emitter there is. It reads no file and touches no network, so a
 * path in the config is emitted rather than resolved and a style plugin arrives already read.
 * Every field of an ArenaConfig is optional because a CONSUMER writes it: an invalid one must
 * reach configProblems rather than be refused by a type nobody there can read. A style plugin is
 * checked here and not only shaped, through the same style-plugin-rules.ts Arena's own gate runs,
 * so what a consumer writes is held to the same floors in the PROJECT's build. */

import {
  PALETTE_KEYS, POLARITIES, FONT_ROLES, GENERIC_FAMILIES, SOURCE_FORMATS,
  FILL_PAIRS, SURFACE_PAIRS, TEXT_MIN, catKeys, requiredKeys,
} from './palette-keys.ts';
import { validate, contrast } from './validate-palette.mjs';
import {
  FS_STEP, RHYTHM_STEP, floorProblems, nameProblems, scopeOn, totalityProblems,
} from './style-plugin-rules.ts';
import { serialize } from './serialize-token.ts';
import { errorFill } from './oklab.ts';
import { report } from './reports.ts';
import type { Report } from './reports.ts';
import type { SerializableToken } from './serialize-token.ts';

export type TokenCatalogue = {
  tokens: Record<string, string>;
  roles: Record<string, { type?: string; values?: string[] }>;
};

export type CheckedSheets = {
  layers: string[];
  components: string[];
  roleReferences?: string[];
  catalogue?: TokenCatalogue;
};

export type PackageSheets = CheckedSheets | null;

export type ArenaPalette = {
  name?: string;
  default?: boolean;
  polarity?: string;
  colors?: Record<string, string>;
};

export type ArenaFont = {
  family?: string;
  src?: string;
  fallback?: string[];
  style?: string;
  weight?: string;
  display?: string;
};

export type ArenaStylesheet = { preflight?: boolean; components?: unknown };

export type ArenaConfig = {
  stylePlugins?: unknown;
  gradientMark?: unknown;
  palettes?: ArenaPalette[];
  fonts?: Record<string, ArenaFont>;
  stylesheet?: ArenaStylesheet;
  components?: string | string[];
};

export type CheckedPalette = ArenaPalette & {
  name: string;
  polarity: string;
  colors: Record<string, string>;
};

export type CheckedFont = ArenaFont & { family: string; src: string };

export type CheckedStylesheet = { preflight?: boolean; components: string[] };

export type CheckedConfig = ArenaConfig & {
  palettes: CheckedPalette[];
  fonts: Record<string, CheckedFont>;
  stylesheet?: CheckedStylesheet;
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

export function defaultPalette(palettes: CheckedPalette[]): CheckedPalette {
  const found = palettes.find((p) => p?.default === true) ?? palettes[0];
  if (!found) throw new Error('defaultPalette: the config declares no palette at all, which configProblems refuses');
  return found;
}

function paletteProblems(palette: ArenaPalette, index: number, seen: Set<string>) {
  const at = `palettes[${index}]`;
  const problems = [];
  if (!isObject(palette)) return [`${at}: not an object`];

  if (typeof palette.name !== 'string' || !KEBAB.test(palette.name)) {
    problems.push(`${at}.name: ${JSON.stringify(palette.name)} is not a kebab-case name`);
  } else if (seen.has(palette.name)) {
    problems.push(`${at}.name: ${palette.name} is declared twice`);
  } else {
    seen.add(palette.name);
  }

  if (typeof palette.polarity !== 'string' || !POLARITIES.includes(palette.polarity)) {
    problems.push(`${at}.polarity: ${JSON.stringify(palette.polarity)} is not one of ${POLARITIES.join(', ')}`);
  }

  if (!isObject(palette.colors)) {
    problems.push(`${at}.colors: not an object`);
    return problems;
  }

  for (const key of requiredKeys()) {
    if (!(key in palette.colors)) problems.push(`${at}.colors: missing ${key}`);
  }
  for (const [key, value] of Object.entries(palette.colors)) {
    if (!PALETTE_KEYS.includes(key)) {
      problems.push(`${at}.colors: ${key} is not an Arena palette key`);
      continue;
    }
    if (typeof value !== 'string' || !HEX.test(value)) {
      problems.push(`${at}.colors.${key}: ${JSON.stringify(value)} is not a #rrggbb hex`);
    }
  }
  return problems;
}

function fontProblems(fonts: Record<string, ArenaFont> | undefined) {
  if (!isObject(fonts)) return ['fonts: not an object'];
  const problems = [];
  for (const role of Object.keys(FONT_ROLES)) {
    const font = fonts[role];
    if (!isObject(font)) {
      problems.push(`fonts.${role}: missing; Arena reads --font-display, --font-body and --font-mono`);
      continue;
    }
    if (typeof font.family !== 'string' || font.family.trim() === '') {
      problems.push(`fonts.${role}.family: not a family name`);
    }
    if (typeof font.src !== 'string' || font.src.trim() === '') {
      problems.push(`fonts.${role}.src: not a URL or a path`);
    }
    if (font.fallback !== undefined && !Array.isArray(font.fallback)) {
      problems.push(`fonts.${role}.fallback: not an array of family names`);
    }
  }
  for (const role of Object.keys(fonts)) {
    if (!(role in FONT_ROLES)) problems.push(`fonts.${role}: not an Arena font role`);
  }
  return problems;
}

export const COMPONENTS_SHEET = 'css/components.css';
export const PREFLIGHT_SHEET = 'css/base.css';
export const STYLESHEET_KEYS = ['components', 'preflight'];

export function stylesheetProblems(stylesheet: ArenaStylesheet, sheets: PackageSheets) {
  if (!isObject(stylesheet)) return ['stylesheet: not an object'];
  const problems = [];

  for (const key of Object.keys(stylesheet)) {
    if (!STYLESHEET_KEYS.includes(key)) problems.push(`stylesheet.${key}: not an Arena stylesheet key`);
  }
  if (stylesheet.preflight !== undefined && typeof stylesheet.preflight !== 'boolean') {
    problems.push(`stylesheet.preflight: ${JSON.stringify(stylesheet.preflight)} is not true or false`);
  }
  if (!Array.isArray(stylesheet.components) || stylesheet.components.length === 0) {
    problems.push('stylesheet.components: name at least one component sheet, or drop stylesheet to import them all');
    return problems;
  }
  if (!sheets) {
    problems.push('stylesheet: the sheets this package ships cannot be read from beside this command, '
      + 'so a name in it can be held to nothing');
    return problems;
  }

  const seen = new Set<string>();
  for (const name of stylesheet.components as unknown[]) {
    if (typeof name !== 'string' || !sheets.components.includes(name)) {
      problems.push(`stylesheet.components: ${JSON.stringify(name)} is not a sheet this package ships, `
        + `which are ${sheets.components.join(', ')}`);
      continue;
    }
    if (seen.has(name)) problems.push(`stylesheet.components: ${name} is named twice`);
    seen.add(name);
  }
  return problems;
}

export type StylePlugin = {
  name: string;
  tokens: Record<string, unknown>;
  light: Record<string, unknown>;
};

export type ResolvedPlugins = (StylePlugin | null)[] | null;

export const DEFAULT_PLUGIN = 'default';

export const PLUGIN_SHEET = 'css/style-plugin-default.css';

export const PLUGIN_TOKENS = 'plugin.tokens.json';

export const THEME_GROUP = 'light';

export function pluginName(entry: string) {
  return entry.trim().replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? '';
}

export function rootIsDefault(config: ArenaConfig) {
  const declared = config.stylePlugins;
  if (!Array.isArray(declared)) return true;
  return declared[0] === DEFAULT_PLUGIN;
}

const ALIAS = /^\{([a-z][\w-]*(?:\.[\w-]+)*)\}$/;

const COLOUR_ALIAS = /^color\.[a-z0-9-]+$/;

export const SKIN_ALIAS = /^(?:color|font)\.[a-z0-9-]+$/;

export function pluginValue(raw: unknown, catalogue: TokenCatalogue | null) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const value = raw.trim();
  const alias = ALIAS.exec(value)?.[1];
  if (!alias) return value;
  const flat = alias.replace(/\./g, '-');
  if (catalogue?.tokens?.[flat] === undefined) return null;
  return SKIN_ALIAS.test(alias) ? `var(--${flat})` : catalogue.tokens[flat];
}

export function dtcgValue(node: unknown) {
  if (!isObject(node) || !('$value' in node)) return null;
  const raw = node.$value;
  if (typeof raw === 'string' && ALIAS.test(raw.trim())) return raw.trim();
  try {
    return serialize(node as SerializableToken);
  } catch {
    return raw;
  }
}

export function readPlugin(name: string, source: unknown): StylePlugin {
  const tokens: Record<string, unknown> = {};
  const light: Record<string, unknown> = {};
  for (const [key, node] of Object.entries(isObject(source) ? source : {})) {
    if (key.startsWith('$')) continue;
    if (key === THEME_GROUP && isObject(node) && !('$value' in node)) {
      for (const [role, token] of Object.entries(node)) light[role] = dtcgValue(token);
      continue;
    }
    tokens[key] = dtcgValue(node);
  }
  return { name, tokens, light };
}

function declarationsOf(tokens: Record<string, unknown>, catalogue: TokenCatalogue | null) {
  return Object.entries(tokens).map(([key, raw]) => `--${key}:${pluginValue(raw, catalogue)};`);
}

export function resolvedPlugin(
  plugin: StylePlugin, catalogue: TokenCatalogue | null, polarity = 'dark',
) {
  const at = new Map<string, string>(Object.entries(catalogue?.tokens ?? {}));
  for (const [key, raw] of Object.entries(plugin.tokens)) {
    const value = pluginValue(raw, catalogue);
    if (value !== null) at.set(key, value);
  }
  if (polarity !== 'dark') {
    for (const [key, raw] of Object.entries(plugin.light)) {
      const value = pluginValue(raw, catalogue);
      if (value !== null) at.set(key, value);
    }
  }
  return at;
}

export function pluginBlocks(
  plugin: StylePlugin, catalogue: TokenCatalogue | null, polarity: string,
) {
  return [
    ...declarationsOf(plugin.tokens, catalogue),
    ...(polarity === 'light' ? declarationsOf(plugin.light, catalogue) : []),
  ];
}

export function pluginTokenProblems(
  group: string, tokens: Record<string, unknown>, catalogue: TokenCatalogue,
) {
  const problems = [];
  for (const [key, raw] of Object.entries(tokens)) {
    const where = `stylePlugins.${group}`;
    const role = catalogue.roles?.[key];
    if (!role && !FS_STEP.test(key) && !RHYTHM_STEP.test(key)) {
      problems.push(`${where}: "${key}" is neither a role this package ships nor an fs or rhythm step. `
        + 'A style plugin re-values those only: a scale, a colour or a spacing step is shared by every '
        + 'use that wants that value, so moving one is not a style plugin but a different Arena.');
      continue;
    }
    if (pluginValue(raw, catalogue) === null) {
      problems.push(`${where}: "${key}" is ${JSON.stringify(raw)}, which resolves to nothing this package `
        + 'ships. Write a value outright, or an alias like {fs.h3} or {color.base-200} naming a token '
        + 'Arena emits.');
      continue;
    }
    if (role?.type === 'color' && !/^\{color\.[a-z0-9-]+\}$/.test(String(raw).trim()))
      problems.push(`${where}: "${key}" is ${JSON.stringify(raw)}, and a colour role takes a {color.*} alias `
        + 'only. A style plugin assigns one of your colours to a role and never authors one of its own.');
    if (role?.type === 'keyword' && Array.isArray(role.values) && !role.values.includes(String(raw)))
      problems.push(`${where}: "${key}" is ${JSON.stringify(raw)}, not one of ${role.values.join(', ')}.`);
  }
  return problems;
}

function entryProblems(
  entry: unknown, at: string, index: number, paletteNames: string[], seen: Set<string>,
) {
  if (typeof entry !== 'string' || !entry.trim()) {
    return [`${at}: ${JSON.stringify(entry)} is not a style plugin. An entry is the word `
      + `"${DEFAULT_PLUGIN}", which is the sheet this package assembles, or a path to a directory `
      + `holding ${PLUGIN_TOKENS}`];
  }
  const value = entry.trim();
  if (value === DEFAULT_PLUGIN) {
    if (index === 0) return [];
    return [`${at}: "${DEFAULT_PLUGIN}" is the sheet this package assembles on :root, so it is the `
      + 'first entry of the list or none of it. A later entry emits under its own class, and a sheet '
      + 'compiled ahead of your build cannot be moved into one'];
  }

  const name = pluginName(value);
  const problems = nameProblems(name, POLARITIES, at);
  if (paletteNames.includes(name)) {
    problems.push(`${at}: "${name}" is also the name of a palette, and both would be the class `
      + `.arena-${name}; rename one of them`);
  }
  if (seen.has(name)) {
    problems.push(`${at}: "${name}" is the directory name of another entry, and the two would be one `
      + `class .arena-${name}; a plugin is named by the directory that holds it`);
  }
  seen.add(name);
  return problems;
}

function resolvedProblems(
  plugin: StylePlugin, at: string, isRoot: boolean, sheets: PackageSheets,
) {
  const catalogue = sheets?.catalogue;
  const problems = [];
  if (Object.keys(plugin.tokens).length === 0) {
    problems.push(`${at}: a style plugin answers at least one role, or it is a class nobody can tell `
      + 'from its absence');
  }
  if (!catalogue) {
    return [...problems, `${at}: the role catalogue this package ships cannot be read from beside this `
      + 'command, so a style plugin cannot be checked against it'];
  }

  problems.push(...pluginTokenProblems(plugin.name, plugin.tokens, catalogue));
  problems.push(...pluginTokenProblems(`${plugin.name}.${THEME_GROUP}`, plugin.light, catalogue));
  if (isRoot) {
    problems.push(...totalityProblems(Object.keys(catalogue.roles ?? {}), Object.keys(plugin.tokens))
      .map((problem) => `${at}: ${problem}`));
  }
  if (problems.length) return problems;

  for (const polarity of POLARITIES) {
    problems.push(...floorProblems(resolvedPlugin(plugin, catalogue, polarity), polarity, `${at}: "${plugin.name}"`));
  }
  return problems;
}

export function stylePluginProblems(
  config: ArenaConfig, sheets: PackageSheets, plugins: ResolvedPlugins = null,
) {
  const declared = config.stylePlugins;
  if ((config as Record<string, unknown>).extension !== undefined) {
    return ['stylePlugins: "extension" is not a field Arena reads. The axis is stylePlugins, it takes '
      + 'a list, and the word extension is spoken for twice over: by the DTCG vendor key and by the '
      + 'Claude Code plugin the repository ships.'];
  }
  if (declared === undefined) return [];
  if (!Array.isArray(declared))
    return ['stylePlugins: a list, because a build can carry more than one register and the first of '
      + 'them is what a page with no class on it looks like'];
  if (declared.length === 0)
    return ['stylePlugins: name at least one style plugin, or drop the field. An empty list answers no '
      + 'role at all, and a custom property with no value is invalid at computed-value time: the '
      + 'declaration reading it is dropped and the property disappears'];

  const paletteNames = (Array.isArray(config.palettes) ? config.palettes : [])
    .filter(isObject).map((p) => String((p as ArenaPalette).name ?? ''));
  const seen = new Set<string>();
  const problems = declared
    .flatMap((entry, i) => entryProblems(entry, `stylePlugins[${i}]`, i, paletteNames, seen));
  if (problems.length || !plugins) return problems;

  return plugins.flatMap((plugin, i) => (plugin
    ? resolvedProblems(plugin, `stylePlugins[${i}]`, i === 0, sheets)
    : []));
}

export function gradientMarkProblems(config: ArenaConfig) {
  const declared = config.gradientMark;
  if (declared === undefined || typeof declared === 'boolean') return [];
  return [`gradientMark: declare true or false, not ${typeof declared}. It says the mark this `
    + 'project is drawn with is a gradient, so the audit stops reporting one in your own sources, '
    + 'and a value that is not a boolean would read as true while meaning nothing'];
}

export function configProblems(
  config: ArenaConfig, sheets: PackageSheets = null, plugins: ResolvedPlugins = null,
) {
  if (!isObject(config)) return ['the configuration is not an object'];
  const problems = [];

  if (!Array.isArray(config.palettes) || config.palettes.length === 0) {
    problems.push('palettes: declare at least one palette');
  } else {
    const seen = new Set<string>();
    (config.palettes as ArenaPalette[]).forEach((p, i) => problems.push(...paletteProblems(p, i, seen)));
    const defaults = config.palettes.filter((p) => isObject(p) && p.default === true);
    if (defaults.length > 1) {
      problems.push(`palettes: ${defaults.length} palettes declare default; exactly one reaches :root`);
    }
  }

  problems.push(...gradientMarkProblems(config));
  problems.push(...stylePluginProblems(config, sheets, plugins));
  problems.push(...fontProblems(config.fonts));
  if (config.stylesheet !== undefined) problems.push(...stylesheetProblems(config.stylesheet, sheets));
  return problems;
}

export const SURFACE_ROLE = 'fill-surface';

export const rampFailed = (state: unknown) => state !== true && state !== 'pass';

export function surfaceOf(palette: CheckedPalette, roles: Map<string, string>) {
  const key = roles.get(SURFACE_ROLE)?.match(/^var\(--color-([\w-]+)\)$/)?.[1];
  return (key && palette.colors[key]) || palette.colors['base-100'];
}

export function paletteReports(
  config: CheckedConfig, catalogue: TokenCatalogue | null = null, plugins: ResolvedPlugins = null,
) {
  const root = (plugins ?? [])[0] ?? null;
  const out = [];
  for (const palette of config.palettes) {
    const mode = palette.polarity;
    const colors = derivedColours(palette.colors);
    const roles = root
      ? resolvedPlugin(root, catalogue, mode)
      : new Map<string, string>(Object.entries(catalogue?.tokens ?? {}));
    const surface = surfaceOf({ ...palette, colors }, roles);
    const ramp = catKeys().map((k) => colors[k]).filter(Boolean);
    const messages: Report[] = [];

    if (ramp.length) {
      const rampOptions = { mode, surface };
      for (const [name, state, detail] of validate(ramp, rampOptions).report as [string, any, string][]) {
        if (rampFailed(state)) messages.push(report('ramp', `ramp, ${name}: ${detail}`));
      }
    }

    const text = [
      ...SURFACE_PAIRS.map(({ ink, on }) => [`${ink} on ${on}`, colors[ink], colors[on]]),
      ...FILL_PAIRS.map(({ fill, content }) => [`${content} on ${fill}`, colors[content], colors[fill]]),
    ];
    for (const [what, fg, bg] of text) {
      if (!fg || !bg) continue;
      const ratio = contrast(fg, bg);
      if (ratio < TEXT_MIN) {
        messages.push(report('contrast',
          `text, ${what}: ${ratio.toFixed(2)}:1, under the ${TEXT_MIN}:1 Arena holds itself to`));
      }
    }

    if (messages.length) out.push({ palette: palette.name, messages });
  }
  return out;
}

function family(name: string, fallback: string[]) {
  return [name, ...fallback]
    .map((f) => (GENERIC_FAMILIES.has(f) ? f : `'${f}'`))
    .join(',');
}

export const WEIGHT_ROLES = [
  { weight: 'fw-heading', through: 'ff-heading' },
  { weight: 'fw-eyebrow', through: 'ff-eyebrow' },
  { weight: 'fw-control', font: 'body' },
];

const FACE_REFERENCE = /^var\(--font-([\w-]+)\)$/;

const GOOGLE_DEFAULT: [number, number][] = [[400, 400]];

export function googleWeights(src: string): [number, number][] | null {
  if (!/^https?:\/\/fonts\.googleapis\.com\//.test(src)) return null;
  const family = /[?&]family=([^&]*)/.exec(src)?.[1];
  if (family === undefined) return null;
  const axed = /^[^:]*:([^@]+)@(.*)$/.exec(family);
  if (!axed) return GOOGLE_DEFAULT;
  const at = (axed[1] ?? '').split(',').indexOf('wght');
  if (at < 0) return GOOGLE_DEFAULT;
  const out: [number, number][] = [];
  for (const tuple of (axed[2] ?? '').split(';')) {
    const [lo, hi] = (tuple.split(',')[at] ?? '').split('..').map(Number);
    if (Number.isFinite(lo)) out.push([lo as number, Number.isFinite(hi) ? hi as number : lo as number]);
  }
  return out.length ? out : null;
}

export function weightsCovered(font: ArenaFont): [number, number][] | null {
  const declared = font.weight;
  if (typeof declared === 'number') return [[declared, declared]];
  if (typeof declared === 'string' && declared.trim()) {
    const parts = declared.trim().split(/\s+/).map(Number).filter((n) => Number.isFinite(n));
    if (parts.length === 1) return [[parts[0] as number, parts[0] as number]];
    if (parts.length === 2) return [[parts[0] as number, parts[1] as number]];
    return null;
  }
  return typeof font.src === 'string' ? googleWeights(font.src) : null;
}

export function weightReports(
  config: CheckedConfig, catalogue: TokenCatalogue | null = null, plugins: ResolvedPlugins = null,
) {
  const root = (plugins ?? [])[0] ?? null;
  const out: Report[] = [];
  const seen = new Set<string>();
  for (const polarity of new Set(config.palettes.map((p) => p.polarity))) {
    const resolved = root
      ? resolvedPlugin(root, catalogue, polarity)
      : new Map<string, string>(Object.entries(catalogue?.tokens ?? {}));
    for (const role of WEIGHT_ROLES) {
      const asked = Number(resolved.get(role.weight));
      const face = role.font ?? FACE_REFERENCE.exec(resolved.get(role.through ?? '') ?? '')?.[1];
      const font = face ? config.fonts?.[face] : undefined;
      if (!Number.isFinite(asked) || !font) continue;
      const covered = weightsCovered(font);
      if (!covered || covered.some(([lo, hi]) => asked >= lo && asked <= hi)) continue;
      const has = covered.map(([lo, hi]) => (lo === hi ? `${lo}` : `${lo}-${hi}`)).join(', ');
      const message = `${role.weight} is ${asked} and fonts.${face} loads ${font.family} at ${has}; `
        + 'the browser draws the rest by smearing the nearest one, which is not the face you chose';
      if (seen.has(message)) continue;
      seen.add(message);
      out.push(report('weight', message));
    }
  }
  return out;
}

export function isStylesheet(src: string) {
  const path = src.split('?')[0] ?? '';
  return path.endsWith('.css') || /^https?:\/\/fonts\.googleapis\.com\//.test(src);
}

function fontFace(font: CheckedFont) {
  const src = font.src;
  const bare = src.split('?')[0] ?? '';
  const extension = Object.keys(SOURCE_FORMATS).find((e) => bare.endsWith(e));
  const format = extension ? ` format('${(SOURCE_FORMATS as Record<string, string>)[extension]}')` : '';
  return [
    '@font-face{',
    `  font-family:'${font.family}';`,
    `  font-style:${font.style ?? 'normal'};`,
    `  font-weight:${font.weight ?? '400 900'};`,
    `  font-display:${font.display ?? 'swap'};`,
    `  src:url('${font.src}')${format};`,
    '}',
  ].join('\n');
}

function block(selector: string, declarations: string[]) {
  return [`${selector}{`, ...declarations.map((d) => `  ${d}`), '}'].join('\n');
}

export function derivedColours(colors: Record<string, string>) {
  const { error } = colors;
  const content = colors['error-content'];
  return colors['error-fill'] === undefined && error !== undefined && content !== undefined
    ? { ...colors, 'error-fill': errorFill(error, content) }
    : colors;
}

function colourDeclarations(palette: CheckedPalette) {
  const colors = derivedColours(palette.colors);
  return PALETTE_KEYS
    .flatMap((key) => {
      const value = colors[key];
      return value === undefined ? [] : [`--color-${key}:${value.toLowerCase()};`];
    });
}

export function scopedImports(
  packageName: string, stylesheet: CheckedStylesheet, sheets: CheckedSheets, withDefault = true,
) {
  const lines = [];
  for (const layer of sheets.layers) {
    if (layer === PREFLIGHT_SHEET && stylesheet.preflight === false) continue;
    if (layer === PLUGIN_SHEET && !withDefault) continue;
    if (layer === COMPONENTS_SHEET) {
      for (const name of stylesheet.components as string[]) lines.push(`@import '${packageName}/css/components/${name}.css';`);
      continue;
    }
    lines.push(`@import '${packageName}/${layer}';`);
  }
  return lines;
}

export type ThemeOptions = {
  packageName?: string;
  importHeader?: boolean;
  source?: string;
  sheets?: PackageSheets;
  plugins?: ResolvedPlugins;
};

export function themeCss(config: CheckedConfig, options: ThemeOptions = {}) {
  const {
    packageName = '@dravensoft/arena-react', importHeader = true,
    source = 'arena.config.json', sheets = null, plugins = null,
  } = options;
  const fonts = config.fonts ?? {};
  const fontFor = (role: string) => {
    const font = fonts[role];
    if (!font) throw new Error(`themeCss: the config declares no fonts.${role}, which configProblems refuses`);
    return font;
  };
  const fallbackFor = (role: string) => fontFor(role).fallback ?? (FONT_ROLES as Record<string, string[]>)[role];

  const withDefault = rootIsDefault(config);
  const parts = [`/* GENERATED by arena-to-prod from ${source}. Edit that, not this file. */`];
  if (importHeader) {
    if (!config.stylesheet && withDefault) parts.push(`@import '${packageName}/arena.css';`);
    else if (!sheets) {
      throw new Error('themeCss: the config names component sheets or a root style plugin of its own '
        + 'and the package\'s own sheets were never read, which configProblems refuses; emitting here '
        + 'would import nothing or import an appearance the config replaced');
    } else {
      const stylesheet = config.stylesheet ?? { components: sheets.components };
      parts.push(scopedImports(packageName, stylesheet, sheets, withDefault).join('\n'));
    }
  }

  const roles = Object.keys(FONT_ROLES);
  const fontSheets = [...new Set(roles.map((r) => fontFor(r).src).filter(isStylesheet))];
  for (const sheet of fontSheets) parts.push(`@import url('${sheet}');`);
  for (const role of roles) {
    if (!isStylesheet(fontFor(role).src)) parts.push(fontFace(fontFor(role)));
  }

  const fallback = defaultPalette(config.palettes);
  parts.push(block(':root', [
    ...colourDeclarations(fallback),
    `--picker-invert:${fallback.polarity === 'light' ? 0 : 1};`,
    ...Object.keys(FONT_ROLES).map((role) => `--font-${role}:${family(fontFor(role).family, fallbackFor(role) as string[])};`),
  ]));

  const catalogue = sheets?.catalogue ?? null;
  const declared = (plugins ?? []).flatMap((plugin, i) =>
    (plugin ? [{ plugin, at: i === 0 ? ':root' : `.arena-${plugin.name}` }] : []));
  const root = declared.find(({ at }) => at === ':root')?.plugin;

  for (const { plugin, at } of declared) {
    const answers = pluginBlocks(plugin, catalogue, fallback.polarity);
    if (answers.length) parts.push(block(at, answers));
  }

  const restated = (plugin: StylePlugin, polarity: string) =>
    pluginBlocks(plugin, catalogue, polarity).filter((d) => d.includes('var(--color-'));

  for (const palette of config.palettes) {
    if (palette === fallback) continue;
    const cross = scopeOn(`.arena-${palette.name}`);
    parts.push(block(`.arena-${palette.name}`, [
      ...colourDeclarations(palette),
      `--picker-invert:${palette.polarity === 'light' ? 0 : 1};`,
      ...(sheets?.roleReferences ?? []),
      ...(root ? restated(root, palette.polarity) : []),
    ]));
    for (const { plugin, at } of declared) {
      if (at === ':root') continue;
      const answers = restated(plugin, palette.polarity);
      if (answers.length) parts.push(block(cross(at), answers));
    }
  }

  return `${parts.join('\n\n')}\n`;
}
