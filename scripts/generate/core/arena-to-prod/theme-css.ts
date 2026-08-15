/* Turns a consumer's arena.config.json into the one stylesheet Arena cannot ship: the palette
 * blocks, the @font-face rules and the import that pulls the package's own sheet in. Everything
 * else about a token travels inside the package. It runs in the repository, where
 * check-packages.ts holds its output equivalent to Style Dictionary's, and inside both npm
 * packages, where it is the only emitter there is. It reads no file and touches no network, so a
 * path in the config is emitted, never resolved. Every field of an ArenaConfig is optional because
 * a CONSUMER writes it: an invalid one must reach configProblems rather than be refused by a type
 * nobody there can read. A local extension is checked here and not only shaped, through the same
 * extension-rules.ts Arena's own gate runs, so what a consumer writes is held to the same floors
 * in the PROJECT's build. */

import {
  PALETTE_KEYS, POLARITIES, FONT_ROLES, GENERIC_FAMILIES, SOURCE_FORMATS,
  catKeys, requiredKeys,
} from './palette-keys.ts';
import { validate, contrast } from './validate-palette.mjs';
import {
  FS_STEP, RHYTHM_STEP, floorProblems, nameProblems,
} from './extension-rules.ts';

export type ShippedExtension = {
  grouping?: string;
  base: string[];
  byPolarity: Record<string, string[]>;
};

export type TokenCatalogue = {
  tokens: Record<string, string>;
  roles: Record<string, { type?: string; values?: string[] }>;
  extensions: Record<string, ShippedExtension>;
};

export type CheckedSheets = {
  layers: string[];
  components: string[];
  extensions?: Record<string, ShippedExtension>;
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
  extension?: unknown;
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

export const NO_EXTENSION = 'none';

export type LocalExtension = {
  name?: unknown;
  extends?: unknown;
  tokens?: unknown;
  light?: unknown;
};

const ALIAS = /^\{([a-z][\w-]*(?:\.[\w-]+)+)\}$/;

export function localValue(raw: unknown, catalogue: TokenCatalogue | null) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const value = raw.trim();
  const alias = ALIAS.exec(value)?.[1];
  if (!alias) return value;
  const flat = alias.replace(/\./g, '-');
  return catalogue?.tokens?.[flat] ?? null;
}

function declarationsOf(tokens: Record<string, unknown>, catalogue: TokenCatalogue | null) {
  return Object.entries(tokens).map(([key, raw]) => `--${key}:${localValue(raw, catalogue)};`);
}

export function resolvedLocal(
  local: LocalExtension, parent: ShippedExtension | undefined, catalogue: TokenCatalogue | null,
  polarity = 'dark',
) {
  const at = new Map<string, string>(Object.entries(catalogue?.tokens ?? {}));
  const take = (declarations: string[]) => {
    for (const d of declarations) {
      const body = d.replace(/;$/, '');
      const i = body.indexOf(':');
      if (i > 0 && body.startsWith('--')) at.set(body.slice(2, i).trim(), body.slice(i + 1).trim());
    }
  };
  if (parent) take([...parent.base, ...(parent.byPolarity[polarity] ?? [])]);
  for (const [key, raw] of Object.entries((local.tokens ?? {}) as Record<string, unknown>)) {
    const value = localValue(raw, catalogue);
    if (value !== null) at.set(key, value);
  }
  if (polarity !== 'dark') {
    for (const [key, raw] of Object.entries((local.light ?? {}) as Record<string, unknown>)) {
      const value = localValue(raw, catalogue);
      if (value !== null) at.set(key, value);
    }
  }
  return at;
}

export function localBlocks(
  local: LocalExtension, parent: ShippedExtension | undefined, catalogue: TokenCatalogue | null,
  polarity: string,
) {
  const tokens = (local.tokens ?? {}) as Record<string, unknown>;
  const themed = (local.light ?? {}) as Record<string, unknown>;
  return [
    ...(parent ? [...parent.base, ...(parent.byPolarity[polarity] ?? [])] : []),
    ...declarationsOf(tokens, catalogue),
    ...(polarity === 'light' ? declarationsOf(themed, catalogue) : []),
  ];
}

function localTokenProblems(
  group: string, tokens: Record<string, unknown>, catalogue: TokenCatalogue,
) {
  const problems = [];
  for (const [key, raw] of Object.entries(tokens)) {
    const where = `extension.${group}`;
    const role = catalogue.roles?.[key];
    if (!role && !FS_STEP.test(key) && !RHYTHM_STEP.test(key)) {
      problems.push(`${where}: "${key}" is neither a role this package ships nor an fs or rhythm step. `
        + 'An extension re-values those only: a scale, a colour or a spacing step is shared by every use '
        + 'that wants that value, so moving one is not an extension but a different Arena.');
      continue;
    }
    if (localValue(raw, catalogue) === null) {
      problems.push(`${where}: "${key}" is ${JSON.stringify(raw)}, which resolves to nothing this package `
        + 'ships. Write a value outright, or an alias like {fs.h3} or {color.base-200} naming a token '
        + 'Arena emits.');
      continue;
    }
    if (role?.type === 'color' && !/^\{color\.[a-z0-9-]+\}$/.test(String(raw).trim()))
      problems.push(`${where}: "${key}" is ${JSON.stringify(raw)}, and a colour role takes a {color.*} alias `
        + 'only. An extension assigns one of your colours to a role and never authors one of its own.');
    if (role?.type === 'keyword' && Array.isArray(role.values) && !role.values.includes(String(raw)))
      problems.push(`${where}: "${key}" is ${JSON.stringify(raw)}, not one of ${role.values.join(', ')}.`);
  }
  return problems;
}

export function localExtensionProblems(
  value: LocalExtension, sheets: PackageSheets, paletteNames: string[] = [],
) {
  const shipped = sheets?.extensions ?? {};
  const catalogue = sheets?.catalogue;
  const name = value.name;
  if (typeof name !== 'string' || !name)
    return ['extension: a local extension declares a name, which becomes the class .arena-<name>'];

  const problems = nameProblems(name, POLARITIES, 'extension');
  if (Object.hasOwn(shipped, name))
    problems.push(`extension: "${name}" is a name this package already ships, and both would `
      + `be the class .arena-${name}. Name yours something else and extend that one instead.`);
  if (paletteNames.includes(name))
    problems.push(`extension: "${name}" is also the name of a palette, and both would be the class `
      + `.arena-${name}; rename one of them`);

  const parentName = value.extends;
  let parent: ShippedExtension | undefined;
  if (parentName !== undefined) {
    if (typeof parentName !== 'string' || !Object.hasOwn(shipped, parentName))
      problems.push(`extension: extends "${String(parentName)}", which this package does not ship. `
        + `The names are ${Object.keys(shipped).sort().join(', ')}.`);
    else parent = shipped[parentName];
  }

  const tokens = value.tokens;
  if (!isObject(tokens) || Object.keys(tokens).length === 0)
    problems.push('extension: a local extension moves at least one role, or it is a class nobody can tell '
      + 'from its absence. Write "extension": "<name>" to take a shipped one unchanged.');
  if (value.light !== undefined && !isObject(value.light))
    problems.push('extension: "light" is a group of tokens that differ in the light theme, so it is an object');

  if (!catalogue)
    return [...problems, 'extension: the role catalogue this package ships cannot be read from beside this '
      + 'command, so a local extension cannot be checked against it'];

  if (isObject(tokens)) problems.push(...localTokenProblems(name, tokens, catalogue));
  if (isObject(value.light)) problems.push(...localTokenProblems(`${name}.light`, value.light, catalogue));
  if (problems.length) return problems;

  for (const polarity of ['dark', 'light']) {
    const at = resolvedLocal(value, parent, catalogue, polarity);
    problems.push(...floorProblems(at, polarity, `extension: "${name}"`));
  }
  return problems;
}

export function extensionProblems(value: unknown, sheets: PackageSheets, paletteNames: string[] = []) {
  if (value === undefined) return [];
  if (isObject(value)) return localExtensionProblems(value as LocalExtension, sheets, paletteNames);
  if (typeof value !== 'string')
    return ['extension: one name, or one object deriving one of your own, and never a list, '
      + 'so a build carries at most one extension'];
  if (value === NO_EXTENSION) return [];
  const shipped = sheets?.extensions;
  if (!shipped)
    return ['extension: the extensions this package ships cannot be read from beside this command, '
      + 'so the name cannot be checked against them'];
  const names = Object.keys(shipped).sort();
  if (!names.includes(value))
    return [`extension: "${value}" is not an extension this package ships, which are `
      + `${names.join(', ')}. Omit the field or write "${NO_EXTENSION}" for no extension.`];
  return [];
}

export function configProblems(config: ArenaConfig, sheets: PackageSheets = null) {
  if (!isObject(config)) return ['the configuration is not an object'];
  const problems = [];

  if (!Array.isArray(config.palettes) || config.palettes.length === 0) {
    problems.push('palettes: declare at least one palette');
  } else {
    const seen = new Set<string>();
    (config.palettes as ArenaPalette[]).forEach((p, i) => problems.push(...paletteProblems(p, i, seen)));
    for (const name of Object.keys(sheets?.extensions ?? {}))
      if ((config.palettes as ArenaPalette[]).some((p) => isObject(p) && p.name === name))
        problems.push(`palettes: "${name}" is the name of an extension this package ships, and both `
          + `would be the class .arena-${name}; rename the palette`);
    const defaults = config.palettes.filter((p) => isObject(p) && p.default === true);
    if (defaults.length > 1) {
      problems.push(`palettes: ${defaults.length} palettes declare default; exactly one reaches :root`);
    }
  }

  const paletteNames = (Array.isArray(config.palettes) ? config.palettes : [])
    .filter(isObject).map((p) => String((p as ArenaPalette).name ?? ''));
  problems.push(...extensionProblems(config.extension, sheets, paletteNames));
  problems.push(...fontProblems(config.fonts));
  if (config.stylesheet !== undefined) problems.push(...stylesheetProblems(config.stylesheet, sheets));
  return problems;
}

export function paletteReports(config: CheckedConfig) {
  const out = [];
  for (const palette of config.palettes) {
    const mode = palette.polarity;
    const surface = palette.colors['base-100'];
    const ramp = catKeys().map((k) => palette.colors[k]).filter(Boolean);
    const messages = [];

    if (ramp.length) {
      const rampOptions = { mode, surface };
      for (const [name, state, detail] of validate(ramp, rampOptions).report as [string, any, string][]) {
        if (state === false || state === 'fail') messages.push(`ramp, ${name}: ${detail}`);
      }
    }

    const text = [
      ['base-content on base-100', palette.colors['base-content'], palette.colors['base-100']],
      ['base-content on base-200', palette.colors['base-content'], palette.colors['base-200']],
      ['primary-content on primary', palette.colors['primary-content'], palette.colors.primary],
      ['error on base-200', palette.colors.error, palette.colors['base-200']],
    ];
    for (const [what, fg, bg] of text) {
      if (!fg || !bg) continue;
      const ratio = contrast(fg, bg);
      if (ratio < 4.5) messages.push(`text, ${what}: ${ratio.toFixed(2)}:1, under the 4.5:1 Arena holds itself to`);
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

function colourDeclarations(palette: CheckedPalette) {
  return PALETTE_KEYS
    .flatMap((key) => {
      const value = palette.colors[key];
      return value === undefined ? [] : [`--color-${key}:${value.toLowerCase()};`];
    });
}

export function scopedImports(packageName: string, stylesheet: CheckedStylesheet, sheets: CheckedSheets) {
  const lines = [];
  for (const layer of sheets.layers) {
    if (layer === PREFLIGHT_SHEET && stylesheet.preflight === false) continue;
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
};

export function themeCss(config: CheckedConfig, options: ThemeOptions = {}) {
  const { packageName = '@dravensoft/arena-react', importHeader = true, source = 'arena.config.json', sheets = null } = options;
  const fonts = config.fonts ?? {};
  const fontFor = (role: string) => {
    const font = fonts[role];
    if (!font) throw new Error(`themeCss: the config declares no fonts.${role}, which configProblems refuses`);
    return font;
  };
  const fallbackFor = (role: string) => fontFor(role).fallback ?? (FONT_ROLES as Record<string, string[]>)[role];

  const parts = [`/* GENERATED by arena-to-prod from ${source}. Edit that, not this file. */`];
  if (importHeader) {
    if (!config.stylesheet) parts.push(`@import '${packageName}/arena.css';`);
    else if (!sheets) {
      throw new Error('themeCss: the config names component sheets and the package\'s own sheets '
        + 'were never read, which configProblems refuses; emitting here would import nothing');
    } else {
      parts.push(scopedImports(packageName, config.stylesheet, sheets).join('\n'));
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

  const local = isObject(config.extension) ? config.extension as LocalExtension : undefined;
  const parent = local && typeof local.extends === 'string'
    ? sheets?.extensions?.[local.extends] : undefined;
  const catalogue = sheets?.catalogue ?? null;

  const chosen = typeof config.extension === 'string' && config.extension !== NO_EXTENSION
    ? sheets?.extensions?.[config.extension] : undefined;

  const wholeVoice = local
    ? localBlocks(local, parent, catalogue, fallback.polarity)
    : (chosen ? [...chosen.base, ...(chosen.byPolarity[fallback.polarity] ?? [])] : []);
  if (wholeVoice.length) parts.push(block(':root', wholeVoice));

  const restated = (polarity: string) => (local
    ? localBlocks(local, parent, catalogue, polarity).filter((d) => d.includes('var(--color-')
      || (parent?.byPolarity[polarity] ?? []).includes(d))
    : (chosen?.byPolarity[polarity] ?? []));

  for (const palette of config.palettes) {
    if (palette === fallback) continue;
    parts.push(block(`.arena-${palette.name}`, [
      ...colourDeclarations(palette),
      `--picker-invert:${palette.polarity === 'light' ? 0 : 1};`,
      ...(sheets?.roleReferences ?? []),
      ...restated(palette.polarity),
    ]));
  }

  return `${parts.join('\n\n')}\n`;
}
