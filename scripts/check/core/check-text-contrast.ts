/* Reads both sheets from disk inside main() and not at module top level, because the graph
 * collects a node's declaration by importing the script that carries it. A gate doing its work
 * where an import reaches it cannot be collected, and this one exits the process outright.
 * Every accent the palette carries is read as ink somewhere, so each one in ON_SURFACE owes
 * 4.5:1 on the base surfaces like every other ink, and none is a brand value let through. */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { relPosix } from '../../utils/posix-path.ts';
import { contrast } from '../../lib/core/validate-palette.mjs';
import { paletteBlock, readHex, THEMES } from '../../lib/core/palette-read.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { resolvedFor } from './check-style-plugin.ts';
import { parseDecls } from '../../lib/arena/css-decls.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { HUE_SHEETS } from '../../lib/tailwind/hue-sheet.ts';
import { PALETTE_KEYS } from '../../generate/core/arena-cli/palette-keys.ts';
import {
  derivedLevels, drawnBy, inlineHues, levelDefaults, levelReports, levelsIn, paletteKey, raisedReports,
  STATE_PAIRS, STATUS_HUES, stateReports as measureStates, washesIn, washReports,
} from '../../generate/core/arena-cli/levels.ts';
import { ARENA_EXT } from '../../generate/core/arena-cli/style-plugin-rules.ts';
import { CATALOGUE, entries } from './check-catalogue.ts';
import { derivedColours, rolesFor, paletteMessages, readPlugin, resolvedPlugin, slotMessages } from '../../generate/core/arena-cli/theme-css.ts';
import { tokenCatalogue } from '../../lib/arena/package-assembly.ts';
import { unresolvedPairs } from '../../generate/core/arena-cli/slot-contrast.ts';
import {
  composite, darkenOklab, errorFill, FILL_FALLBACK_KEEP,
} from '../../generate/core/arena-cli/oklab.ts';

export const PALETTE = 'contracts/design-generated/palette.generated.css';
export const COLORS = 'contracts/design/colors.css';
export const ROLE_SHEETS = [
  'contracts/design-generated/effects.generated.css',
  'contracts/design-generated/style-plugin.default.generated.css',
  'contracts/design-generated/style-plugin.complete.generated.css',
];

export const SCOPED_PLUGINS = ['complete'];

export const VOCABULARY_SHEETS = 'frameworks/tailwind/consume/vocabulary/*.generated.css';

export const COMPONENT_SHEETS = ['frameworks/tailwind/consume/components/**/*.styles.generated.css', VOCABULARY_SHEETS];

export const ROLES = 'contracts/design/roles.json';

export const node = {
  name: 'check:text-contrast',
  reads: [PALETTE, COLORS, ...ROLE_SHEETS, ...COMPONENT_SHEETS, `${HUE_SHEETS}/**/*.hues.generated.css`, ROLES,
    `${CATALOGUE}/*/plugin.tokens.json`, `${CATALOGUE}/*/arena.config.json`,
    'plugin-style-store/default/plugin.tokens.json', 'plugin-style-store/complete/plugin.tokens.json'],
  writes: [],
  feeds: [],
};

export function componentSheets(roles: Map<string, string> = new Map(), levels: Record<string, string> = {}) {
  const at = join(root, 'frameworks/tailwind/consume/components');
  const family = walkFiles(join(root, 'frameworks/tailwind/consume/vocabulary'))
    .filter((file) => file.endsWith('.generated.css'))
    .map((file) => readFileSync(file, 'utf8'));
  const components = walkFiles(at)
    .filter((file) => file.endsWith('.styles.generated.css'))
    .map((file) => {
      const css = readFileSync(file, 'utf8');
      const hue = join(root, HUE_SHEETS, relPosix(at, file).replace('.styles.generated.css', '.hues.generated.css'));
      return existsSync(hue) ? inlineHues(css, readFileSync(hue, 'utf8'), roles, levels) : css;
    });
  return [...components, ...family];
}

export function paletteColours(body: string) {
  const colours: Record<string, string> = {};
  for (const key of PALETTE_KEYS) {
    const hex = tryHex(body, `color-${key}`);
    if (hex) colours[key] = hex;
  }
  return colours;
}

const block = paletteBlock;

function tryHex(body: string, name: string) {
  try { return readHex(body, name); } catch { return null; }
}
const MISSING = 'not declared in contracts/design-generated/palette.generated.css — every theme block must define it';

export const paletteSelectors = (palette: string) =>
  [...parseDecls(palette).keys()].filter((key) => !key.startsWith('@'));

const ALIAS_ANCHOR = /--text-strong\s*:/;

export function structureOf(colors: string, selectors: string[]) {
  for (const [, head, body] of colors.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (head === undefined || body === undefined || !ALIAS_ANCHOR.test(body)) continue;
    const carried = head.replace(/\/\*[\s\S]*?\*\//g, '').split(',').map((one) => one.trim());
    for (const selector of selectors) {
      if (carried.includes(selector)) continue;
      throw new Error(`colors.css: the alias block's selector does not carry ${selector}, a palette `
        + `palette.generated.css declares. Every palette that block does not name is left without --text-strong and its siblings.`);
    }
    return body;
  }
  throw new Error('colors.css: no block declares the aliases (--text-strong)');
}

export function resolvePercent(structure: string, name: string, seen = new Set()): number | null {
  if (seen.has(name)) throw new Error(`colors.css: --${name} is a circular reference`);
  seen.add(name);
  const m = structure.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`))?.[1];
  if (!m) return null;
  const value = m.trim();
  if (/^var\(\s*--color-base-content\s*\)$/.test(value)) return 100;
  const mix = value.match(/^color-mix\(\s*in oklab\s*,\s*var\(\s*--color-base-content\s*\)\s*([\d.]+)%\s*,\s*transparent\s*\)$/);
  if (mix?.[1]) return Number(mix[1]);
  const read = value.match(/^color-mix\(\s*in oklab\s*,\s*var\(\s*--color-base-content\s*\)\s*var\(\s*--(level-[\w-]+)\s*\)\s*,\s*transparent\s*\)$/);
  if (read?.[1]) {
    const level = structure.match(new RegExp(`--${read[1]}\\s*:\\s*([\\d.]+)%\\s*;`))?.[1];
    if (level === undefined) throw new Error(`colors.css: --${name} reads --${read[1]}, which the block does not declare`);
    return Number(level);
  }
  const alias = value.match(/^var\(\s*--([\w-]+)\s*\)$/);
  if (alias?.[1]) return resolvePercent(structure, alias[1], seen);
  throw new Error(`colors.css: --${name} resolves to "${value}", which is neither base-content, a color-mix of it, nor a var() alias`);
}

const LEVELS = [
  { token: 'text-strong', gate: 4.5, note: 'body text' },
  { token: 'text-body', gate: 4.5, note: 'body text' },
  { token: 'text-muted', gate: 4.5, note: 'body text — tightest survivor in light' },
  { token: 'status-offline', gate: 3, note: 'graphical object (WCAG 1.4.11) — presence only' },

  { token: 'mute-2-disabled', gate: null, note: 'EXEMPT — disabled controls (WCAG 1.4.3/1.4.11 inactive-component exemption)' },
];

export const PAIRS = [
  { fill: 'primary-fill', content: 'primary-content', gate: 4.5, note: 'every ground primary-content sits on: a filled button, a checked box, a switch track, a current page, a count badge; ArenaCheckbox tick and ArenaSwitch knob are the content, and primary itself is the accent read as ink and as a line' },

  { fill: 'error-fill', content: 'error-content', gate: 4.5, deriveFrom: 'error', keep: FILL_FALLBACK_KEEP, note: "ArenaConfirmDialog's final confirmation" },
  { fill: 'secondary', content: 'secondary-content', gate: 4.5, note: 'daisyUI pair — legible content on the fill' },
  { fill: 'neutral', content: 'neutral-content', gate: 4.5, note: 'daisyUI pair — legible content on the fill' },
  { fill: 'info', content: 'info-content', gate: 4.5, note: 'daisyUI pair — legible content on the fill' },
  { fill: 'success', content: 'success-content', gate: 4.5, note: 'daisyUI pair — legible content on the fill' },
  { fill: 'warning', content: 'warning-content', gate: 4.5, note: 'daisyUI pair — legible content on the fill' },
];

export const ON_SURFACE = [
  { token: 'error', gate: 4.5, note: 'danger as text and border, measured on the base surfaces (.btn.danger, .iconbtn.danger, .mitem.danger)' },
  { token: 'primary', gate: 4.5, note: 'crimson as text on the base surfaces: ink-eyebrow and accent-primary-ink' },
  { token: 'secondary', gate: 4.5, note: 'gold as text and as a line on the base surfaces: accent-gold-ink and edge-focus' },
  { token: 'info', gate: 4.5, note: 'the info hue as text and glyph on the base surfaces: hue-info-ink' },
  { token: 'success', gate: 4.5, note: 'the success hue as text and glyph on the base surfaces: hue-success-ink' },
  { token: 'warning', gate: 4.5, note: 'the warning hue as text and glyph on the base surfaces: hue-warning-ink' },
];

export const ON_INK_GATE = 4.5;

export function onInkPairs(roles: Map<string, string>, body: string) {
  const hex = (role: string) => {
    const key = paletteKey(roles.get(role));
    return key ? tryHex(body, `color-${key}`) : null;
  };
  return STATUS_HUES.map((hue) => {
    const ink = hex(`hue-${hue}-ink`);
    const onInk = hex(`hue-${hue}-on-ink`);
    return { hue, ink, onInk, ratio: ink && onInk ? contrast(onInk, ink) : null };
  });
}

type Answers = Record<string, { $value?: unknown } | undefined>;
type EntryPalette = { name?: string; polarity?: string; colors?: Record<string, string> };

const ALIAS = /^\{([\w.-]+)\}$/;

export function answeredKey(role: string, answers: Answers, light: Answers, defaults: Record<string, string>,
  polarity: string, seen: string[] = []): string | null {
  if (seen.includes(role)) return null;
  const own = (polarity === 'light' ? light[role]?.$value : undefined) ?? answers[role]?.$value ?? defaults[role];
  const target = ALIAS.exec(typeof own === 'string' ? own.trim() : '')?.[1];
  if (!target) return null;
  if (target.startsWith('color.')) return target.slice('color.'.length);
  return answeredKey(target, answers, light, defaults, polarity, [...seen, role]);
}

export function answeredColour(role: string, answers: Answers, light: Answers, defaults: Record<string, string>,
  colors: Record<string, string>, polarity: string): string | null {
  const key = answeredKey(role, answers, light, defaults, polarity);
  return key === null ? null : colors[key] ?? null;
}

export const JUDGED = ['plugin-style-store/default/plugin.tokens.json'];

export type ContrastScope = { where: string; theme: string; colors: Record<string, string>; judged: boolean };

export function contrastScopes(at = root): ContrastScope[] {
  const palette = readFileSync(join(at, PALETTE), 'utf8');
  const generated = THEMES.map((theme) => ({
    theme: theme.name, colors: paletteColours(block(palette, theme.selector, PALETTE)),
  }));
  const dir = join(at, CATALOGUE);
  return [
    ...['default', 'complete'].flatMap((name) => generated.map((one) => ({
      where: `plugin-style-store/${name}/plugin.tokens.json`, ...one,
      judged: JUDGED.includes(`plugin-style-store/${name}/plugin.tokens.json`),
    }))),
    ...catalogueEntries(at).flatMap((entry) => {
      const config = JSON.parse(readFileSync(join(dir, entry, 'arena.config.json'), 'utf8')) as { palettes?: EntryPalette[] };
      return (config.palettes ?? []).map((one) => ({
        where: `${CATALOGUE}/${entry}/plugin.tokens.json`,
        theme: one.polarity ?? 'dark', colors: one.colors ?? {}, judged: false,
      }));
    }),
  ];
}

const STATE_ROLES = [...new Set(STATE_PAIRS.flatMap((pair) => [pair.role, pair.over, ...(pair.wash ? ['fill-surface'] : [])]))];

function stateLines(prefix: string, scopes: ContrastScope[], at: string) {
  const defaults = roleDefaults(at);
  const level = levelDefaults(readFileSync(join(at, COLORS), 'utf8'));
  return scopes.flatMap(({ where, theme, colors, judged }) => {
    const answers = JSON.parse(readFileSync(join(at, where), 'utf8')) as Answers & { light?: Answers };
    const roles = new Map<string, string>();
    for (const role of STATE_ROLES) {
      const key = answeredKey(role, answers, (answers.light ?? {}) as Answers, defaults, theme);
      if (key) roles.set(role, `var(--color-${key})`);
    }
    return measureStates(roles, colors, theme, level, true)
      .filter((one) => one.message.startsWith(`--${prefix}`))
      .map((one) => ({ judged, line: `${where}: ${one.message}` }));
  });
}

export function stateProblems(prefix: string, scopes = contrastScopes(), at = root) {
  return stateLines(prefix, scopes, at).filter((one) => one.judged).map((one) => one.line);
}

export function stateReports(prefix: string, scopes = contrastScopes(), at = root) {
  return stateLines(prefix, scopes, at).filter((one) => !one.judged).map((one) => one.line);
}

export const DEFAULT_PLUGIN = 'plugin-style-store/default/plugin.tokens.json';

export function defaultBuildProblems(at = root) {
  const catalogue = tokenCatalogue(at);
  const palette = readFileSync(join(at, PALETTE), 'utf8');
  const plugin = readPlugin('default', JSON.parse(readFileSync(join(at, DEFAULT_PLUGIN), 'utf8')));
  const levels = levelDefaults(readFileSync(join(at, COLORS), 'utf8'));
  return THEMES.flatMap((theme) => {
    const colors = paletteColours(block(palette, theme.selector, PALETTE));
    const roles = rolesFor(plugin, catalogue, theme.name);
    const answers = new Map([...roles].filter(([name]) => Object.hasOwn(catalogue.slots.slots, name)));
    const unresolved = unresolvedPairs(catalogue.slots, answers, roles, derivedColours(colors, theme.name), levels)
      .map((pair) => `${theme.name}: --${pair.slot} over --${pair.over} resolves to no palette colour, so the pair is never measured`);
    return [...unresolved, ...paletteMessages({ polarity: theme.name, colors }, roles, [], [], { catalogue: catalogue.slots, levels })
      .filter((one) => one.kind === 'contrast' || one.kind === 'heat')
      .map((one) => `${theme.name}: ${one.message}`)];
  });
}

export function slotReportLines(scopes = contrastScopes(), at = root) {
  const catalogue = tokenCatalogue(at);
  const levels = levelDefaults(readFileSync(join(at, COLORS), 'utf8'));
  return scopes.filter((scope) => !scope.judged).flatMap(({ where, theme, colors }) => {
    const plugin = readPlugin(where, JSON.parse(readFileSync(join(at, where), 'utf8')));
    const roles = rolesFor(plugin, catalogue, theme);
    return slotMessages({ catalogue: catalogue.slots, levels }, roles, derivedColours(colors, theme), theme, [])
      .map((one) => `${where} (${theme}): ${one.message}`);
  });
}

export function roleDefaults(at = root) {
  const roles = JSON.parse(readFileSync(join(at, ROLES), 'utf8')) as Record<string, { $extensions?: Record<string, { default?: string }> }>;
  return Object.fromEntries(Object.entries(roles)
    .map(([name, role]) => [name, role.$extensions?.[ARENA_EXT]?.default])
    .filter((pair): pair is [string, string] => typeof pair[1] === 'string'));
}

export function catalogueEntries(at = root) {
  return entries(at).filter((name) => existsSync(join(at, CATALOGUE, name, 'plugin.tokens.json')));
}

export function catalogueOnInk(at = root) {
  const defaults = roleDefaults(at);
  const dir = join(at, CATALOGUE);
  return catalogueEntries(at).flatMap((entry) => {
    const answers = JSON.parse(readFileSync(join(dir, entry, 'plugin.tokens.json'), 'utf8')) as Answers & { light?: Answers };
    const config = JSON.parse(readFileSync(join(dir, entry, 'arena.config.json'), 'utf8')) as { palettes?: EntryPalette[] };
    return (config.palettes ?? []).flatMap((palette) => STATUS_HUES.map((hue) => {
      const colour = (role: string) => answeredColour(role, answers, (answers.light ?? {}) as Answers, defaults,
        palette.colors ?? {}, palette.polarity ?? 'dark');
      const ink = colour(`hue-${hue}-ink`);
      const onInk = colour(`hue-${hue}-on-ink`);
      return { entry, palette: palette.name ?? palette.polarity ?? '', hue, ink, onInk, ratio: ink && onInk ? contrast(onInk, ink) : null };
    }));
  });
}

export function catalogueReports(at = root) {
  const catalogue = tokenCatalogue(at);
  const dir = join(at, CATALOGUE);
  return catalogueEntries(at).flatMap((entry) => {
    const plugin = readPlugin(entry, JSON.parse(readFileSync(join(dir, entry, 'plugin.tokens.json'), 'utf8')));
    const config = JSON.parse(readFileSync(join(dir, entry, 'arena.config.json'), 'utf8')) as { palettes?: EntryPalette[] };
    return (config.palettes ?? []).flatMap((one) => {
      const polarity = one.polarity ?? 'dark';
      const roles = resolvedPlugin(plugin, catalogue, polarity);
      return paletteMessages({ polarity, colors: one.colors ?? {} }, roles, [], [])
        .filter((message) => message.kind === 'contrast' || message.kind === 'heat')
        .map((message) => `${entry}, ${one.name ?? polarity}: ${message.message}`);
    });
  });
}

export const REMOVED = [
  { token: 'mute-2', use: '--mute (--text-muted)' },
  { token: 'text-faint', use: '--text-muted' },
];

export { THEMES };

export const SURFACE_ROLES = ['fill-surface', 'fill-surface-floating'];

export const PAGE = 'color-base-100';

const REFERENCE = /^var\(\s*--([\w-]+)\s*\)$/;

export function surfacesUnder(resolved: Map<string, string>) {
  const names = [PAGE];
  for (const role of SURFACE_ROLES) {
    const referenced = REFERENCE.exec(resolved.get(role)?.trim() ?? '')?.[1];
    if (referenced && !names.includes(referenced)) names.push(referenced);
  }
  return names;
}

export function scopesToMeasure(effects: string, theme: string, plugins: string[]) {
  const base = surfacesUnder(resolvedFor(effects, '', theme));
  const out = [{ label: 'the root plugin', surfaces: base, judged: true }];
  for (const name of plugins) {
    const surfaces = surfacesUnder(resolvedFor(effects, name, theme));
    if (surfaces.join() === base.join()) continue;
    out.push({ label: `.arena-${name}`, surfaces, judged: false });
  }
  return out;
}

function main() {
  const palette = readFileSync(join(root, PALETTE), 'utf8');
  const structure = structureOf(readFileSync(join(root, COLORS), 'utf8'), paletteSelectors(palette));
  const effects = ROLE_SHEETS.map((sheet) => readFileSync(join(root, sheet), 'utf8')).join('\n');
  const scoped = SCOPED_PLUGINS;
  let ok = true;

  for (const { token, use } of REMOVED) {
    if (resolvePercent(structure, token) === null) continue;
    ok = false;
    console.log(`\n[FAIL] --${token} is declared in contracts/design/colors.css. It is not a token Arena has; use ${use}.`);
  }
  const defaults = levelDefaults(readFileSync(join(root, COLORS), 'utf8'));
  const sheets = componentSheets(
    resolvedFor(effects, '', THEMES[0]?.name ?? 'light'),
    Object.fromEntries(Object.entries(defaults).map(([name, percent]) => [name, `${percent}%`])),
  );
  const levels = sheets.flatMap((css) => levelsIn(css, defaults));
  const washes = sheets.flatMap((css) => washesIn(css, defaults));
  for (const t of THEMES) {
    const body = block(palette, t.selector, 'palette.generated.css');
    const content = readHex(body, 'color-base-content');

    const roles = resolvedFor(effects, '', t.name);
    const colours = paletteColours(body);
    const derived = derivedLevels(levels, roles, colours);
    const painted = [...levelReports(levels, roles, colours, derived), ...raisedReports(derived)];
    console.log(`\n${t.name} — the ${drawnBy(levels).length} levels the component sheets compile, `
      + 'each composited over the surfaces the root plugin names');
    for (const one of painted) console.log(`  [FAIL] ${one.message}`);
    if (painted.length) ok = false;
    else console.log('  [PASS] every level clears the bar its property carries');

    const washed = washReports(washes, resolvedFor(effects, '', t.name), paletteColours(body));
    console.log(`\n${t.name} — a token drawn on a wash of its own colour`);
    for (const one of washed) console.log(`  [FAIL] ${one.message}`);
    if (washed.length) ok = false;
    else {
      console.log('  [PASS] no slot paints an accent as ink on a wash of that same accent, so no '
        + 'palette can be pushed to the top of its lightness range by one component\'s state');
    }

    for (const scope of scopesToMeasure(effects, t.name, scoped)) {
      const surfaces: [string, string][] = scope.surfaces
        .map((name) => [name.replace(/^color-/, ''), readHex(body, name)]);
      console.log(`\n${t.name}, ${scope.label} — --color-base-content ${content} over ${surfaces.map(([n, h]) => `${n} ${h}`).join(', ')}`);
      for (const { token, gate, note } of LEVELS) {
        const percent = resolvePercent(structure, token);
        if (percent === null) {
          ok = false;
          console.log(`  [FAIL] --${token.padEnd(16)} not declared in contracts/design/colors.css`);
          continue;
        }
        const ratios: [string, number][] = surfaces.map(([n, hex]) => [n, contrast(composite(content, hex, percent), hex)]);
        const failed = gate !== null && ratios.some(([, r]) => r < gate);
        if (failed && scope.judged) ok = false;
        const glyph = gate === null ? 'INFO' : failed ? (scope.judged ? 'FAIL' : 'REPORT') : 'PASS';
        const detail = ratios.map(([n, r]) => `${n} ${r.toFixed(2)}:1`).join('  ');
        const bar = gate === null ? 'not gated' : `gate ${gate}:1`;
        console.log(`  [${glyph}] --${token.padEnd(16)} ${String(percent).padStart(3)}%  ${detail}  ${bar}`);
        console.log(`         ${note}`);
      }

      console.log(`\n${t.name}, ${scope.label} — accents on the base surfaces (no fill of their own)`);
      for (const { token, gate, note } of ON_SURFACE) {
        const hex = tryHex(body, `color-${token}`);
        if (!hex) {
          ok = false;
          console.log(`  [FAIL] --color-${token.padEnd(18)} ${MISSING}`);
          console.log(`         ${note}`);
          continue;
        }
        const ratios: [string, number][] = surfaces.map(([n, s]) => [n, contrast(hex, s)]);
        const failed = gate !== null && ratios.some(([, r]) => r < gate);
        if (failed && scope.judged) ok = false;
        const glyph = gate === null ? 'INFO' : failed ? (scope.judged ? 'FAIL' : 'REPORT') : 'PASS';
        const bar = gate === null ? 'not gated' : `gate ${gate}:1`;
        const detail = ratios.map(([n, r]) => `${n} ${r.toFixed(2)}:1`).join('  ');
        console.log(`  [${glyph}] --color-${token.padEnd(18)} ${hex}  ${detail}  ${bar}`);
        console.log(`         ${note}`);
      }

    }
    console.log(`\n${t.name} — fill/content pairs`);
    for (const { fill, content, gate, deriveFrom, keep, note } of PAIRS) {
      let fillHex = tryHex(body, `color-${fill}`);
      let source = 'pinned';

      if (!fillHex && deriveFrom) {
        const base = tryHex(body, `color-${deriveFrom}`);
        if (base) { fillHex = darkenOklab(base, keep); source = `derived from --color-${deriveFrom}`; }
      }
      const contentHex = tryHex(body, `color-${content}`);
      if (!fillHex || !contentHex) {
        ok = false;
        console.log(`  [FAIL] --color-${(!fillHex ? fill : content).padEnd(18)} ${MISSING}`);
        console.log(`         ${note}`);
        continue;
      }
      const ratio = contrast(fillHex, contentHex);
      const failed = gate !== null && ratio < gate;
      if (failed) ok = false;
      const glyph = gate === null ? 'INFO' : failed ? 'FAIL' : 'PASS';
      const bar = gate === null ? 'not gated' : `gate ${gate}:1`;
      console.log(`  [${glyph}] --color-${content.padEnd(18)} ${contentHex} on ${fillHex} (${source})  ${ratio.toFixed(2)}:1  ${bar}`);
      console.log(`         ${note}`);
    }

    for (const name of ['', ...scoped]) {
      console.log(`\n${t.name}, ${name ? `.arena-${name}` : 'the root plugin'}: each status hue's on-ink over its ink, a mark arena-mark-solid fills`);
      for (const { hue, ink, onInk, ratio } of onInkPairs(resolvedFor(effects, name, t.name), body)) {
        const failed = ratio === null || ratio < ON_INK_GATE;
        if (failed && !name) ok = false;
        const detail = ratio === null ? 'a role that names no palette colour' : `${onInk} on ${ink}  ${ratio.toFixed(2)}:1`;
        console.log(`  [${failed ? (name ? 'REPORT' : 'FAIL') : 'PASS'}] --hue-${hue}-on-ink over --hue-${hue}-ink  ${detail}  gate ${ON_INK_GATE}:1`);
      }
    }

    const errHex = tryHex(body, 'color-error');
    const errContent = tryHex(body, 'color-error-content');
    if (errHex && errContent) {
      const derived = errorFill(errHex, errContent);
      const ratio = contrast(derived, errContent);
      const failed = ratio < 4.5;
      if (failed) ok = false;
      const way = derived === darkenOklab(errHex, FILL_FALLBACK_KEEP) ? 'darkening' : 'lightening';
      console.log(`\n${t.name} — the fill derived when a skin omits --color-error-fill`);
      console.log(`  [${failed ? 'FAIL' : 'PASS'}] keep ${FILL_FALLBACK_KEEP}          ${errContent} on ${derived}  ${ratio.toFixed(2)}:1  gate 4.5:1`);
      console.log(`         derived from --color-error ${errHex} by ${way} it in oklab, away from --color-error-content`);
    }
  }

  const states = stateProblems('ink-');
  console.log('\nthe state inks: invalid and selected text over the grounds it stands on, in the default plugin and both themes');
  for (const one of states) console.log(`  [FAIL] ${one}`);
  if (states.length) ok = false;
  else console.log('  [PASS] every ink-invalid and ink-selected pair clears 4.5:1');
  for (const one of stateReports('ink-')) console.log(`  [REPORT] ${one}`);

  const built = defaultBuildProblems();
  console.log('\nthe default plugin as arena check measures it: every pair, in both of Arena\'s palettes');
  for (const one of built) console.log(`  [FAIL] ${one}`);
  if (built.length) ok = false;
  else console.log('  [PASS] arena check reports nothing over the default plugin');

  const slotLines = slotReportLines();
  console.log('\ncomplete and the catalogue: every slot pair, in every state of every palette, measured and reported');
  for (const one of slotLines) console.log(`  [REPORT] ${one}`);
  if (slotLines.length === 0) console.log('  [PASS] every slot pair of complete and of the catalogue clears its bar');

  console.log('\nthe catalogue as arena check measures it: every pair of every palette of every entry, reported and passed');
  for (const one of catalogueReports()) console.log(`  [REPORT] ${one}`);

  const entries = catalogueOnInk();
  console.log('\nthe catalogue: each status hue\'s on-ink over its ink in every palette of every entry, measured and reported');
  if (entries.length === 0) {
    ok = false;
    console.log(`  [FAIL] measured 0 entries under ${CATALOGUE}; an empty sweep is a failure rather than a clean pass`);
  }
  for (const { entry, palette, hue, ink, onInk, ratio } of entries) {
    if (ratio !== null && ratio >= ON_INK_GATE) continue;
    const detail = ratio === null ? 'a role that names no palette colour' : `${onInk} on ${ink}  ${ratio.toFixed(2)}:1`;
    console.log(`  [REPORT] ${entry}, ${palette}: --hue-${hue}-on-ink over --hue-${hue}-ink  ${detail}  under ${ON_INK_GATE}:1`);
  }
  if (entries.length && entries.every(({ ratio }) => ratio !== null && ratio >= ON_INK_GATE))
    console.log(`  [PASS] ${entries.length} pairs across ${new Set(entries.map((one) => one.entry)).size} entries clear ${ON_INK_GATE}:1`);

  console.log(ok ? '\nText contrast OK: every gated level clears its bar in both themes, and what the catalogue and complete fall short of is reported above.\n' : '\nText contrast FAILED: fix the marked levels.\n');
  process.exit(ok ? 0 : 1);
}

if (isMainModule(import.meta.url)) main();
