/* Turns a consumer's arena.config.json into the stylesheet Arena cannot ship: the palette
 * blocks and the @font-face rules (themeCss), and the package sheet's imports (packageCss). Everything
 * else about a token travels inside the package. It runs in the repository, where
 * check-packages.ts holds its output equivalent to Style Dictionary's, and inside both npm
 * packages, where it is the only emitter there is. It reads no file and touches no network, so a
 * path in the config is emitted rather than resolved and a style plugin arrives already read.
 * Every field of an ArenaConfig is optional because a CONSUMER writes it: an invalid one must
 * reach configProblems rather than be refused by a type nobody there can read. A style plugin is
 * checked here and not only shaped, through the same style-plugin-rules.ts Arena's own gate runs,
 * so what a consumer writes is held to the same floors in the PROJECT's build. */

import {
  PALETTE_KEYS, POLARITIES, pickerInvert, FONT_ROLES, GENERIC_FAMILIES, SOURCE_FORMATS,
  FILL_PAIRS, SURFACE_PAIRS, TEXT_MIN, catKeys, heatKeys, requiredKeys,
} from './palette-keys.ts';
import { validate, contrast } from './validate-palette.mjs';
import {
  FS_STEP, RHYTHM_STEP, aliasName, colourAnswer, keywordAnswer, type KnownAnswers, floorProblems, highContrastFor, nameProblems, reservedProblems, rootOnlyFor, scopeOn, totalityProblems, withDefaults,
} from './style-plugin-rules.ts';
import { serialize } from './serialize-token.ts';
import { HEAT_MIN_DL, errorFill, heatCramped, heatLadder, toOklab } from './oklab.ts';
import { axisReports, derivedLevels, emphasisReports, levelReports, onInkReports, raisedReports, washReports } from './levels.ts';
import type { Level, Wash } from './levels.ts';
import { unicodeRange } from './font-cut.ts';
import { report } from './report.ts';
import type { Report } from './report.ts';
import type { SerializableToken } from './serialize-token.ts';

export type TokenCatalogue = {
  tokens: Record<string, string>;
  roles: Record<string, { type?: string; values?: string[]; default?: string }>;
  aliases?: Record<string, string>;
};

export type CheckedSheets = {
  layers: string[];
  components: string[];
  levels?: Level[];
  washes?: Wash[];
  scopes?: string[];
  roleReferences?: string[];
  aliases?: string[];
  rootOnly?: { contrast: string; environment: string };
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
  runtimePalettes?: unknown;
  palettes?: ArenaPalette[];
  fonts?: Record<string, ArenaFont>;
  stylesheet?: ArenaStylesheet;
  components?: string | string[];
};

export const ARENA_CONFIG_KEYS: readonly (keyof ArenaConfig)[] = ['palettes', 'fonts', 'stylePlugins', 'stylesheet', 'gradientMark', 'runtimePalettes'];
export const ARENA_FONT_KEYS: readonly (keyof ArenaFont)[] = ['family', 'src', 'fallback', 'style', 'weight', 'display'];

export type CheckedPalette = ArenaPalette & {
  name: string;
  polarity: string;
  colors: Record<string, string>;
};

export type CheckedFont = ArenaFont & { family: string; src: string };

export type CheckedStylesheet = { preflight?: boolean; components: string[] };

export const ARENA_FONT_DEFAULTS = { style: 'normal', weight: '400 900', display: 'swap' } as const;

export type CheckedConfig = ArenaConfig & {
  palettes: CheckedPalette[];
  fonts: Record<string, CheckedFont>;
  stylesheet?: CheckedStylesheet;
};

export const HEX = /^#[0-9a-fA-F]{6}$/;
export const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

export function defaultPalette(palettes: CheckedPalette[]): CheckedPalette {
  const found = palettes.find((p) => p?.default === true) ?? palettes[0];
  if (!found) throw new Error('defaultPalette: the config declares no palette at all, which configProblems refuses');
  return found;
}

export function paletteInputProblems(at: string, palette: { polarity?: unknown; colors?: unknown }) {
  const problems: string[] = [];
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
  const colors = palette.colors;
  const pinned = heatKeys().filter((k) => k in colors).length;
  if (pinned > 0 && pinned < heatKeys().length) {
    problems.push(`${at}.colors: pins heat-1 to heat-${heatKeys().length} together or none`);
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

function paletteProblems(
  palette: ArenaPalette, index: number, seen: Set<string>, shipped: readonly string[] = [],
) {
  const at = `palettes[${index}]`;
  const problems = [];
  if (!isObject(palette)) return [`${at}: not an object`];

  if (typeof palette.name !== 'string' || !KEBAB.test(palette.name)) {
    problems.push(`${at}.name: ${JSON.stringify(palette.name)} is not a kebab-case name`);
  } else if (seen.has(palette.name)) {
    problems.push(`${at}.name: ${palette.name} is declared twice`);
  } else {
    seen.add(palette.name);
    if (shipped.includes(palette.name) && palette.name !== palette.polarity) {
      problems.push(`${at}.name: "${palette.name}" is already a class this package ships, and both `
        + `would be .arena-${palette.name}. A palette shares one class namespace with every scope, `
        + 'utility and component Arena draws, so the colours would land on whatever that class '
        + `already selects. The one name a palette may take out of that set is its own polarity, `
        + `which is the scope a palette of that polarity is meant to answer to.`);
    } else {
      problems.push(...reservedProblems(palette.name, `${at}.name`));
    }
  }

  problems.push(...paletteInputProblems(at, palette));
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
  const named = stylesheet.components;
  if (named !== undefined && (!Array.isArray(named) || named.length === 0)) {
    problems.push('stylesheet.components: name at least one component sheet, or drop stylesheet to let arena build work them out');
    return problems;
  }
  if (!sheets) {
    problems.push('stylesheet: the sheets this package ships cannot be read from beside this command, '
      + 'so a name in it can be held to nothing');
    return problems;
  }
  if (named === undefined) return problems;

  const seen = new Set<string>();
  for (const name of named as unknown[]) {
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
  if (catalogue?.roles?.[flat]?.type === 'color') return `var(--${flat})`;
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
  const roles = catalogue?.roles ?? {};
  const bound = Object.keys(roles).length;
  for (const [key, first] of at) {
    let value = first;
    for (let hop = 0; hop < bound; hop += 1) {
      const name = /^var\(--([\w-]+)\)$/.exec(value)?.[1];
      if (!name || roles[name]?.type !== 'color' || !at.has(name)) break;
      value = at.get(name) as string;
    }
    if (value !== first) at.set(key, value);
  }
  return at;
}

function knownOf(catalogue: TokenCatalogue): KnownAnswers {
  return {
    colourRoles: (name) => catalogue.roles?.[name]?.type === 'color',
    resolve: (flat) => catalogue.tokens?.[flat],
  };
}

function roleAlias(raw: unknown, catalogue: TokenCatalogue) {
  const alias = aliasName(String(raw));
  return alias && catalogue.roles?.[alias]?.type === 'color' ? alias : null;
}

function ringOf(key: string, tokens: Record<string, unknown>, catalogue: TokenCatalogue) {
  const seen = [key];
  let at = roleAlias(tokens[key], catalogue);
  while (at !== null && at !== undefined) {
    if (at === key) {
      const via = seen[seen.length - 1] as string;
      return {
        members: seen,
        message: seen.length === 1
          ? `"${key}" is "{${key}}", so it names itself and never resolves`
          : `"${seen[0]}" is "{${seen[1]}}", and "${via}" leads back to "${key}", so neither resolves`,
      };
    }
    if (seen.includes(at)) return null;
    seen.push(at);
    at = roleAlias(tokens[at], catalogue);
  }
  return null;
}

export function ringsOf(tokens: Record<string, unknown>, catalogue: TokenCatalogue) {
  const named = new Set<string>();
  const rings: { id: string; message: string }[] = [];
  for (const key of Object.keys(tokens)) {
    if (named.has(key)) continue;
    const ring = ringOf(key, tokens, catalogue);
    if (!ring) continue;
    for (const member of ring.members) named.add(member);
    rings.push({ id: [...ring.members].sort().join(' '), message: ring.message });
  }
  return rings;
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
  const known = knownOf(catalogue);
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
    if (role?.type === 'color' && !colourAnswer(String(raw), key, known)) {
      const selfNamed = aliasName(String(raw)) === key;
      if (!selfNamed)
        problems.push(`${where}: "${key}" is ${JSON.stringify(raw)}, and a colour role takes a {color.*} alias `
          + 'or another colour role. A style plugin assigns one of your colours to a role and never authors one '
          + 'of its own.');
    }
    if (role?.type === 'keyword' && Array.isArray(role.values) && !keywordAnswer(String(raw).trim(), role.values, known))
      problems.push(`${where}: "${key}" is ${JSON.stringify(raw)}, not one of ${role.values.join(', ')}.`);
  }
  for (const { message } of ringsOf(tokens, catalogue)) problems.push(`stylePlugins.${group}: ${message}.`);
  return problems;
}

function entryProblems(
  entry: unknown, at: string, index: number, paletteNames: string[], seen: Set<string>,
  shipped: readonly string[] = [],
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
  const problems = nameProblems(name, POLARITIES, at, shipped);
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
  plugin: StylePlugin, at: string, root: StylePlugin | null, sheets: PackageSheets,
) {
  const isRoot = plugin === root;
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

  const whole = withDefaults(plugin, catalogue.roles ?? {}, isRoot ? undefined : { root }).plugin;
  problems.push(...pluginTokenProblems(plugin.name, plugin.tokens, catalogue));
  problems.push(...pluginTokenProblems(`${plugin.name}.${THEME_GROUP}`, plugin.light, catalogue));
  if (isRoot) {
    problems.push(...totalityProblems(Object.keys(catalogue.roles ?? {}), Object.keys(whole.tokens))
      .map((problem) => `${at}: ${problem}`));
  }
  const reported = new Set([plugin.tokens, plugin.light]
    .flatMap((group) => ringsOf(group, catalogue).map((ring) => ring.id)));
  for (const polarity of POLARITIES) {
    const merged = polarity === 'dark' ? whole.tokens : { ...whole.tokens, ...whole.light };
    for (const { id, message } of ringsOf(merged, catalogue)) {
      if (reported.has(id)) continue;
      reported.add(id);
      problems.push(`stylePlugins.${plugin.name}: ${message}.`);
    }
  }
  if (problems.length) return problems;

  for (const polarity of POLARITIES) {
    problems.push(...floorProblems(resolvedPlugin(whole, catalogue, polarity), polarity, `${at}: "${plugin.name}"`));
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
    .flatMap((entry, i) => entryProblems(entry, `stylePlugins[${i}]`, i, paletteNames, seen, sheets?.scopes ?? []));
  if (problems.length || !plugins) return problems;

  return plugins.flatMap((plugin, i) => (plugin
    ? resolvedProblems(plugin, `stylePlugins[${i}]`, plugins[0] ?? null, sheets)
    : []));
}

export function rootWithDefaults(plugins: ResolvedPlugins, catalogue: TokenCatalogue | null) {
  const root = plugins?.[0] ?? null;
  if (!plugins || !catalogue) return { plugins, defaulted: [] as string[] };
  const { plugin, defaulted } = root ? withDefaults(root, catalogue.roles ?? {}) : { plugin: null, defaulted: [] as string[] };
  const later = plugins.slice(1).map((one) => (one ? withDefaults(one, catalogue.roles ?? {}, { root }).plugin : one));
  return { plugins: [plugin, ...later], defaulted };
}

export const defaultedNote = (roles: string[]) =>
  `${roles.length} role(s) your root style plugin leaves unanswered take Arena's default: ${roles.join(', ')}`;

export function gradientMarkProblems(config: ArenaConfig) {
  const declared = config.gradientMark;
  if (declared === undefined || typeof declared === 'boolean') return [];
  return [`gradientMark: declare true or false, not ${typeof declared}. It says the mark this `
    + 'project is drawn with is a gradient, so the audit stops reporting one in your own sources, '
    + 'and a value that is not a boolean would read as true while meaning nothing'];
}

export function runtimePalettesProblems(config: ArenaConfig) {
  const declared = config.runtimePalettes;
  if (declared === undefined || typeof declared === 'boolean') return [];
  return [`runtimePalettes: declare true or false, not ${typeof declared}. It says this build also emits `
    + 'the polarity hooks, the root marker and the runtime data a browser palette reads, and a value that '
    + 'is not a boolean would read as true while meaning nothing'];
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
    const shipped = sheets?.scopes ?? [];
    (config.palettes as ArenaPalette[]).forEach((p, i) => problems.push(...paletteProblems(p, i, seen, shipped)));
    const defaults = config.palettes.filter((p) => isObject(p) && p.default === true);
    if (defaults.length > 1) {
      problems.push(`palettes: ${defaults.length} palettes declare default; exactly one reaches :root`);
    }
  }

  problems.push(...gradientMarkProblems(config));
  problems.push(...runtimePalettesProblems(config));
  problems.push(...stylePluginProblems(config, sheets, plugins));
  problems.push(...fontProblems(config.fonts));
  if (config.stylesheet !== undefined) problems.push(...stylesheetProblems(config.stylesheet, sheets));
  return problems;
}

const POLARITY_MIDPOINT = 0.5;

export const SURFACE_ROLE = 'fill-surface';

export const rampFailed = (state: unknown) => state !== true && state !== 'pass';

export function surfaceOf(palette: { colors: Record<string, string> }, roles: Map<string, string>) {
  const key = roles.get(SURFACE_ROLE)?.match(/^var\(--color-([\w-]+)\)$/)?.[1];
  return (key && palette.colors[key]) || palette.colors['base-100'];
}

export function heatReports(pinned: Record<string, string>, colors: Record<string, string>): Report[] {
  if (!heatKeys().every((k) => pinned[k] === undefined) || !heatKeys().every((k) => colors[k] !== undefined)) return [];
  const { ordered, cramped } = heatCramped(heatKeys().map((k) => colors[k]!));
  const lines = cramped.map(({ from, to, gap }) =>
    `heat, steps ${from} and ${to}: lightness gap ${gap.toFixed(3)}, under the ${HEAT_MIN_DL} a reader needs to tell them apart`);
  if (!ordered && lines.length === 0) lines.push('heat: the derived steps do not rise or fall in lightness');
  return lines.map((line) => report('heat', line));
}

export function heatOrderReports(steps: readonly string[], surface: string): Report[] {
  const ground = toOklab(surface)[0];
  const reach = steps.map((hex) => Math.abs(toOklab(hex)[0] - ground));
  const out: Report[] = [];
  reach.slice(1).forEach((far, i) => {
    if (far > reach[i]!) return;
    out.push(report('heat', `heat, steps ${i + 1} and ${i + 2}: step ${i + 2} is no further from the surface than step ${i + 1}, `
      + 'and the heatmap reads the steps by magnitude'));
  });
  return out;
}

export function rolesFor(root: StylePlugin | null, catalogue: TokenCatalogue | null, polarity: string) {
  return root
    ? resolvedPlugin(root, catalogue, polarity)
    : new Map<string, string>(Object.entries(catalogue?.tokens ?? {}));
}

export function polarityReports(polarity: string, ground: string | undefined): Report[] {
  if (!ground || (polarity !== 'dark' && polarity !== 'light')) return [];
  const reads = toOklab(ground)[0] >= POLARITY_MIDPOINT ? 'light' : 'dark';
  return reads === polarity ? [] : [report('contrast', `polarity, base-100 ${ground} reads as ${reads}, and the palette declares ${polarity}`)];
}

export function paletteMessages(
  palette: { polarity: string; colors: Record<string, string> }, roles: Map<string, string>,
  levels: Level[], washes: Wash[],
) {
  const mode = palette.polarity;
  const colors = derivedColours(palette.colors, mode);
  const surface = surfaceOf({ colors }, roles);
  const ramp = catKeys().map((k) => colors[k]).filter(Boolean);
  const messages: Report[] = [...polarityReports(palette.polarity, palette.colors['base-100'])];

  if (ramp.length) {
    const rampOptions = { mode, surface };
    for (const [name, state, detail] of validate(ramp, rampOptions).report as [string, any, string][]) {
      if (rampFailed(state)) messages.push(report('ramp', `ramp, ${name}: ${detail}`));
    }
  }

  messages.push(...heatReports(palette.colors, colors));
  if (surface && heatKeys().every((key) => palette.colors[key] !== undefined)) {
    const steps = heatKeys().map((key) => colors[key]);
    if (steps.every((hex) => hex !== undefined)) messages.push(...heatOrderReports(steps as string[], surface));
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

  messages.push(...axisReports(roles, colors, mode), ...onInkReports(roles, colors, mode), ...emphasisReports(roles, colors, mode));

  const derived = derivedLevels(levels, roles, colors);
  messages.push(...levelReports(levels, roles, colors, derived));
  messages.push(...raisedReports(derived));
  messages.push(...washReports(washes, roles, colors));
  return messages;
}

export function paletteReports(
  config: CheckedConfig, catalogue: TokenCatalogue | null = null, plugins: ResolvedPlugins = null,
  levels: Level[] = [], washes: Wash[] = [],
) {
  const root = (plugins ?? [])[0] ?? null;
  const out = [];
  for (const palette of config.palettes) {
    const messages = paletteMessages(palette, rolesFor(root, catalogue, palette.polarity), levels, washes);
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

export type CutLoss = { family: string; label: string; axis: [number, number] | null; lost: number[] };

export function weightReports(
  config: CheckedConfig, catalogue: TokenCatalogue | null = null, plugins: ResolvedPlugins = null,
  cuts: Record<string, CutLoss> = {},
) {
  const root = (plugins ?? [])[0] ?? null;
  const out: Report[] = [];
  const seen = new Set<string>();
  for (const [role, cut] of Object.entries(cuts)) {
    const reach = cut.axis ? `${cut.axis[0]}-${cut.axis[1]}` : 'its one weight';
    for (const weight of cut.lost) {
      out.push(report('weight', `fonts.${role} paints ${weight} and ${cut.family} (${cut.label}) does not reach it, `
        + `its weights run ${reach}; the cut keeps what the file has, and the browser draws ${weight} from the nearest one`));
    }
  }
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

export type FontFaces = { faces: { name: string; weight: string }[] };

function fontFace(font: CheckedFont, cut?: FontFaces) {
  const src = font.src;
  const bare = src.split('?')[0] ?? '';
  const extension = Object.keys(SOURCE_FORMATS).find((e) => bare.endsWith(e));
  const format = extension ? ` format('${(SOURCE_FORMATS as Record<string, string>)[extension]}')` : '';
  const face = (url: string, weight: string, extra: string[], withFormat: string) => [
    '@font-face{',
    `  font-family:'${font.family}';`,
    `  font-style:${font.style ?? ARENA_FONT_DEFAULTS.style};`,
    `  font-weight:${weight};`,
    `  font-display:${font.display ?? ARENA_FONT_DEFAULTS.display};`,
    `  src:url('${url}')${withFormat};`,
    ...extra,
    '}',
  ].join('\n');
  if (!cut) return face(font.src, font.weight ?? ARENA_FONT_DEFAULTS.weight, [], format);
  return cut.faces
    .map(({ name, weight }) => face(`./${name}`, weight, [`  unicode-range:${unicodeRange()};`], " format('woff2')"))
    .join('\n');
}

function block(selector: string, declarations: string[]) {
  return [`${selector}{`, ...declarations.map((d) => `  ${d}`), '}'].join('\n');
}

export function derivedColours(colors: Record<string, string>, polarity: string) {
  const { error, primary } = colors;
  const content = colors['error-content'];
  const out: Record<string, string> = colors['error-fill'] === undefined && error !== undefined && content !== undefined
    ? { ...colors, 'error-fill': errorFill(error, content) }
    : { ...colors };
  if (out['primary-fill'] === undefined && primary !== undefined) out['primary-fill'] = primary;
  const slot = colors['cat-4'];
  const surface = colors['base-200'];
  const ink = colors['base-content'];
  if (heatKeys().every((k) => colors[k] === undefined) && slot && surface && ink) {
    heatLadder(slot, surface, ink, polarity).forEach((hex, i) => { out[`heat-${i + 1}`] = hex; });
  }
  return out;
}

export function paletteDeclarations(
  palette: { polarity: string; colors: Record<string, string> }, roles: Map<string, string>, levels: Level[],
) {
  const colors = derivedColours(palette.colors, palette.polarity);
  const declared = PALETTE_KEYS.flatMap((key) => {
    const value = colors[key];
    return value === undefined ? [] : [`--color-${key}:${value.toLowerCase()};`];
  });
  const stepped = [...derivedLevels(levels, roles, colors)]
    .flatMap(([name, one]) => (one.percent === null ? [] : [`--${name}:${one.percent}%;`]));
  return [...declared, ...stepped];
}

export function restatedBy(plugin: StylePlugin, catalogue: TokenCatalogue | null, polarity: string) {
  return pluginBlocks(plugin, catalogue, polarity).filter((d) => d.includes('var(--color-'));
}

export type PolarityContext = {
  aliases: string[]; roleReferences: string[]; root: StylePlugin | null; catalogue: TokenCatalogue | null;
};

export function polarityDeclarations(polarity: string, context: PolarityContext) {
  const { aliases, roleReferences, root, catalogue } = context;
  return [
    `--picker-invert:${pickerInvert(polarity)};`,
    `color-scheme:${polarity};`,
    ...aliases,
    ...roleReferences,
    ...(root ? restatedBy(root, catalogue, polarity) : []),
  ];
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

export const RUNTIME_MARKER = '--arena-runtime-palettes';
export const polarityClass = (polarity: string) => `arena-polarity-${polarity}`;

export type ArenaRuntimeDataShape = {
  arenaRuntimePalettes: 1;
  declared: string[];
  taken: string[];
  levels: Level[];
  washes: Wash[];
  roles: { dark: Record<string, string>; light: Record<string, string> };
};

export function runtimeData(config: CheckedConfig, sheets: PackageSheets, plugins: ResolvedPlugins): ArenaRuntimeDataShape {
  const root = plugins?.[0] ?? null;
  const catalogue = sheets?.catalogue ?? null;
  const rolesIn = (polarity: string) => Object.fromEntries(rolesFor(root, catalogue, polarity));
  return {
    arenaRuntimePalettes: 1,
    declared: (config.palettes as CheckedPalette[]).map((palette) => palette.name),
    taken: sheets?.scopes ?? [],
    levels: sheets?.levels ?? [],
    washes: sheets?.washes ?? [],
    roles: { dark: rolesIn('dark'), light: rolesIn('light') },
  };
}

export type PackageOptions = { packageName?: string; sheets?: PackageSheets };

export function packageImports(config: CheckedConfig, { packageName = '@dravensoft/arena-react', sheets = null }: PackageOptions) {
  const withDefault = rootIsDefault(config);
  if (!config.stylesheet && withDefault && !sheets) return [`@import '${packageName}/arena.css';`];
  if (!sheets) return null;
  const stylesheet = { ...config.stylesheet, components: config.stylesheet?.components ?? sheets.components };
  return scopedImports(packageName, stylesheet, sheets, withDefault);
}

export function packageCss(config: CheckedConfig, options: PackageOptions = {}) {
  const lines = packageImports(config, options);
  if (lines === null) {
    throw new Error('packageCss: the config names component sheets or a root style plugin of its own '
      + 'and the package\'s own sheets were never read, which configProblems refuses; emitting here '
      + 'would import nothing or import an appearance the config replaced');
  }
  return `/* GENERATED by arena build. Arena's half of the stylesheet: it changes with the Arena package and the components your sources draw. */\n${lines.join('\n')}\n`;
}

export type ThemeOptions = {
  source?: string;
  sheets?: PackageSheets;
  plugins?: ResolvedPlugins;
  cuts?: Record<string, FontFaces>;
};

export function themeCss(config: CheckedConfig, options: ThemeOptions = {}) {
  const {
    source = 'arena.config.json', sheets = null, plugins = null, cuts = {},
  } = options;
  const fonts = config.fonts ?? {};
  const fontFor = (role: string) => {
    const font = fonts[role];
    if (!font) throw new Error(`themeCss: the config declares no fonts.${role}, which configProblems refuses`);
    return font;
  };
  const fallbackFor = (role: string) => fontFor(role).fallback ?? (FONT_ROLES as Record<string, string[]>)[role];

  const parts = [`/* GENERATED by arena build from ${source}. Edit that, not this file. */`];
  const roles = Object.keys(FONT_ROLES);
  const fontSheets = [...new Set(roles.map((r) => fontFor(r).src).filter(isStylesheet))];
  for (const sheet of fontSheets) parts.push(`@import url('${sheet}');`);
  for (const role of roles) {
    if (!isStylesheet(fontFor(role).src)) parts.push(fontFace(fontFor(role), cuts[role]));
  }

  const catalogue = sheets?.catalogue ?? null;
  const declared = (plugins ?? []).flatMap((plugin, i) =>
    (plugin ? [{ plugin, at: i === 0 ? ':root' : `.arena-${plugin.name}` }] : []));
  const root = declared.find(({ at }) => at === ':root')?.plugin;

  const levels = sheets?.levels ?? [];
  const rolesOf = (palette: CheckedPalette) => rolesFor(root ?? null, catalogue, palette.polarity);

  const fallback = defaultPalette(config.palettes);
  const aliases = sheets?.aliases ?? [];
  parts.push(block(':root', [
    ...paletteDeclarations(fallback, rolesOf(fallback), levels),
    `--arena-palette:${fallback.name};`,
    ...(config.runtimePalettes === true ? [`${RUNTIME_MARKER}:1;`] : []),
    `--picker-invert:${pickerInvert(fallback.polarity)};`,
    `color-scheme:${fallback.polarity};`,
    ...aliases,
    ...Object.keys(FONT_ROLES).map((role) => `--font-${role}:${family(fontFor(role).family, fallbackFor(role) as string[])};`),
  ]));

  for (const { plugin, at } of declared) {
    const answers = pluginBlocks(plugin, catalogue, fallback.polarity);
    if (at === ':root') {
      if (answers.length) {
        parts.push(block(at, answers));
        const widened = sheets?.rootOnly ? highContrastFor(at, sheets.rootOnly) : '';
        if (widened) parts.push(widened);
      }
    } else {
      parts.push(block(at, [`--arena-plugin:${plugin.name};`, ...answers]));
      const again = sheets?.rootOnly ? rootOnlyFor(at, sheets.rootOnly) : '';
      if (again) parts.push(again);
    }
  }

  const context: PolarityContext = {
    aliases, roleReferences: sheets?.roleReferences ?? [], root: root ?? null, catalogue,
  };

  const crossesOf = (cross: ReturnType<typeof scopeOn>, polarity: string) => declared.flatMap(({ plugin, at }) => {
    const answers = at === ':root' ? [] : restatedBy(plugin, catalogue, polarity);
    return answers.length ? [cross(at, `\n${answers.map((d) => `  ${d}`).join('\n')}\n`)] : [];
  });

  for (const palette of config.palettes) {
    const cross = scopeOn(`.arena-${palette.name}`);
    parts.push(block(`.arena-${palette.name}`, [
      ...paletteDeclarations(palette, rolesOf(palette), levels),
      `--arena-palette:${palette.name};`,
      ...polarityDeclarations(palette.polarity, context),
    ]));
    parts.push(...crossesOf(cross, palette.polarity));
  }

  if (config.runtimePalettes === true) {
    for (const polarity of POLARITIES) {
      const cross = scopeOn(`.${polarityClass(polarity)}`);
      parts.push(block(`.${polarityClass(polarity)}`, polarityDeclarations(polarity, context)));
      parts.push(...crossesOf(cross, polarity));
    }
  }

  return `${parts.join('\n\n')}\n`;
}
