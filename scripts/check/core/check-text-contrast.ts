/* Reads both sheets from disk inside main() and not at module top level, because the graph
 * collects a node's declaration by importing the script that carries it. A gate doing its work
 * where an import reaches it cannot be collected, and this one exits the process outright. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contrast } from '../../lib/core/validate-palette.mjs';
import { paletteBlock, readHex, THEMES } from '../../lib/core/palette-read.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { resolvedFor } from './check-style-plugin.ts';
import { composite, darkenOklab, FILL_FALLBACK_KEEP } from '../../generate/core/arena-to-prod/oklab.ts';

export const PALETTE = 'contracts/design-generated/palette.generated.css';
export const COLORS = 'contracts/design/colors.css';
export const ROLE_SHEETS = [
  'contracts/design-generated/effects.generated.css',
  'contracts/design-generated/style-plugin.default.generated.css',
  'contracts/design-generated/style-plugin.complete.generated.css',
];

export const SCOPED_PLUGINS = ['complete'];

export const node = {
  name: 'check:text-contrast',
  reads: [PALETTE, COLORS, ...ROLE_SHEETS],
  writes: [],
  feeds: [],
};

const block = paletteBlock;

function tryHex(body: string, name: string) {
  try { return readHex(body, name); } catch { return null; }
}
const MISSING = 'not declared in contracts/design-generated/palette.generated.css — every theme block must define it';

export const structureOf = (colors: string) => block(colors, ':root,\\s*\\.arena-light', 'colors.css');

export function resolvePercent(structure: string, name: string, seen = new Set()): number | null {
  if (seen.has(name)) throw new Error(`colors.css: --${name} is a circular reference`);
  seen.add(name);
  const m = structure.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`))?.[1];
  if (!m) return null;
  const value = m.trim();
  if (/^var\(\s*--color-base-content\s*\)$/.test(value)) return 100;
  const mix = value.match(/^color-mix\(\s*in oklab\s*,\s*var\(\s*--color-base-content\s*\)\s*([\d.]+)%\s*,\s*transparent\s*\)$/);
  if (mix?.[1]) return Number(mix[1]);
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
  { fill: 'primary', content: 'primary-content', gate: 4.5, note: 'button text via --on-accent (ArenaButton, ArenaIconButton solid, ArenaPagination active); ArenaCheckbox tick, ArenaSwitch knob, and ArenaSwitch’s knob glyph read the other way round (text-primary on bg-primary-content)' },

  { fill: 'error-fill', content: 'error-content', gate: 4.5, deriveFrom: 'error', keep: FILL_FALLBACK_KEEP, note: "ArenaConfirmDialog's final confirmation — Arena's only filled danger surface" },
  { fill: 'secondary', content: 'secondary-content', gate: 4.5, note: 'daisyUI pair — legible content on the fill' },
  { fill: 'neutral', content: 'neutral-content', gate: 4.5, note: 'daisyUI pair — legible content on the fill' },
  { fill: 'info', content: 'info-content', gate: 4.5, note: 'daisyUI pair — legible content on the fill' },
  { fill: 'success', content: 'success-content', gate: 4.5, note: 'daisyUI pair — legible content on the fill' },
  { fill: 'warning', content: 'warning-content', gate: 4.5, note: 'daisyUI pair — legible content on the fill' },
];

const ON_SURFACE = [
  { token: 'error', gate: 4.5, note: 'outline danger — IS the text and the border (.btn.danger, .iconbtn.danger, .mitem.danger)' },
  { token: 'primary', gate: null, note: 'REPORTED, NOT GATED — crimson as text (ArenaConfirmDialog eyebrow); brand value, see header' },
  { token: 'secondary', gate: null, note: 'REPORTED, NOT GATED — gold as text/focus ring; brand value, see header' },
];

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
  const out = [{ label: 'the root plugin', surfaces: base }];
  for (const name of plugins) {
    const surfaces = surfacesUnder(resolvedFor(effects, name, theme));
    if (surfaces.join() === base.join()) continue;
    out.push({ label: `.arena-${name}`, surfaces });
  }
  return out;
}

function main() {
  const palette = readFileSync(join(root, PALETTE), 'utf8');
  const structure = structureOf(readFileSync(join(root, COLORS), 'utf8'));
  const effects = ROLE_SHEETS.map((sheet) => readFileSync(join(root, sheet), 'utf8')).join('\n');
  const scoped = SCOPED_PLUGINS;
  let ok = true;

  for (const { token, use } of REMOVED) {
    if (resolvePercent(structure, token) === null) continue;
    ok = false;
    console.log(`\n[FAIL] --${token} is declared in contracts/design/colors.css. It is not a token Arena has; use ${use}.`);
  }
  for (const t of THEMES) {
    const body = block(palette, t.selector, 'palette.generated.css');
    const content = readHex(body, 'color-base-content');
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
        if (failed) ok = false;
        const glyph = gate === null ? 'INFO' : failed ? 'FAIL' : 'PASS';
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
        if (failed) ok = false;
        const glyph = gate === null ? 'INFO' : failed ? 'FAIL' : 'PASS';
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

    const errHex = tryHex(body, 'color-error');
    const errContent = tryHex(body, 'color-error-content');
    if (errHex && errContent) {
      const derived = darkenOklab(errHex, FILL_FALLBACK_KEEP);
      const ratio = contrast(derived, errContent);
      const failed = ratio < 4.5;
      if (failed) ok = false;
      console.log(`\n${t.name} — --danger-fill fallback (used when a skin omits --color-error-fill)`);
      console.log(`  [${failed ? 'FAIL' : 'PASS'}] color-mix 85%      ${errContent} on ${derived}  ${ratio.toFixed(2)}:1  gate 4.5:1`);
      console.log(`         derived from --color-error ${errHex} by darkening in oklab`);
    }
  }

  console.log(ok ? '\nText contrast OK — every gated level clears its bar in both themes.\n' : '\nText contrast FAILED — fix the marked levels.\n');
  process.exit(ok ? 0 : 1);
}

if (isMainModule(import.meta.url)) main();
