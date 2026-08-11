/* Turns a consumer's arena.config.json into the one stylesheet Arena cannot ship: the
 * palette blocks, the @font-face rules and the import that pulls the package's own sheet
 * in. Everything else about a token travels inside the package. It runs in the repository,
 * where check-packages.ts holds its output equivalent to Style Dictionary's, and inside
 * both npm packages, where it is the only emitter there is. It reads no file and touches
 * no network, so a path in the config is emitted, never resolved. Every field of an
 * ArenaConfig is optional because a CONSUMER writes it: an invalid one must reach
 * configProblems, which decides usable, rather than be refused by a type nobody there can
 * read. PackageSheets is what the package this command ships inside can offer. */

import {
  PALETTE_KEYS, POLARITIES, FONT_ROLES, GENERIC_FAMILIES, SOURCE_FORMATS,
  catKeys, requiredKeys,
} from './palette-keys.ts';
import { validate, contrast } from './validate-palette.mjs';

export type ShippedExtension = { base: string[]; byPolarity: Record<string, string[]> };

export type CheckedSheets = {
  layers: string[];
  components: string[];
  extensions?: Record<string, ShippedExtension>;
  roleReferences?: string[];
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

export function extensionProblems(value: unknown, sheets: PackageSheets) {
  if (value === undefined) return [];
  if (typeof value !== 'string')
    return [`extension: one name and never a list, so a build carries at most one extension`];
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

  problems.push(...extensionProblems(config.extension, sheets));
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

  const chosen = typeof config.extension === 'string' && config.extension !== NO_EXTENSION
    ? sheets?.extensions?.[config.extension] : undefined;
  if (chosen) parts.push(block(':root', [...chosen.base, ...(chosen.byPolarity[fallback.polarity] ?? [])]));

  for (const palette of config.palettes) {
    if (palette === fallback) continue;
    parts.push(block(`.arena-${palette.name}`, [
      ...colourDeclarations(palette),
      `--picker-invert:${palette.polarity === 'light' ? 0 : 1};`,
      ...(sheets?.roleReferences ?? []),
      ...(chosen?.byPolarity[palette.polarity] ?? []),
    ]));
  }

  return `${parts.join('\n\n')}\n`;
}
