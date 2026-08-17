/* A LEVEL is a percentage a compiled slot keeps of a colour it does not own: the 62 in
 * text-ink-muted/62. The role says which colour and the modifier says how held back, and
 * the modifier lives in the manifest, so no token can move it and nothing composed it
 * against a consumer's palette. These are read out of the component sheets a package
 * ships rather than listed here, because a list is one more thing to keep true, and every
 * one of them mixes against `transparent`, so the value it paints does not exist until a
 * browser composites it over whatever surface is behind. That is what levelReports does. */

import { contrast } from './validate-palette.mjs';
import { composite } from './oklab.ts';
import { report } from './reports.ts';
import type { Report } from './reports.ts';

export type Level = {
  selector: string;
  state: string;
  property: string;
  variable: string;
  percent: number;
};

export const SURFACE_ROLES = ['fill-surface', 'fill-surface-floating', 'fill-page'];

export const PAGE_KEY = 'base-100';

export const TEXT_MIN = 4.5;

export const MARK_MIN = 3;

export const EXEMPT = new Map([
  ['disabled', 'WCAG 1.4.3 and 1.4.11 exempt an inactive component, and a disabled control '
    + 'has to read as inactive rather than as one more thing to press'],
  ['placeholder', 'a placeholder is a hint the field replaces, not the field\'s own text'],
]);

const SELECTOR = /^\s*([.:&][^{}]*?)\s*\{\s*$/;
const MIX = /^\s*([\w-]+)\s*:\s*color-mix\(in oklab,\s*var\(--([\w-]+)\)\s*([\d.]+)%,\s*transparent\)/;
const REFERENCE = /^var\(--color-([\w-]+)\)$/;

const INK = /^\s*color\s*:\s*var\(--([\w-]+)\)\s*;/;

export function levelsIn(css: string): Level[] {
  const out: Level[] = [];
  let selector = '';
  let state = '';
  for (const line of css.split('\n')) {
    const named = SELECTOR.exec(line)?.[1];
    if (named?.startsWith('.')) { selector = named; state = named; }
    else if (named) state = `${selector}${named.replace(/&/g, '')}`;
    const mix = MIX.exec(line);
    if (!mix) continue;
    out.push({
      selector,
      state,
      property: mix[1] as string,
      variable: mix[2] as string,
      percent: Number(mix[3]),
    });
  }
  return out;
}

export type Wash = { selector: string; variable: string; percent: number };

export function washesIn(css: string): Wash[] {
  const out: Wash[] = [];
  let selector = '';
  let ink = '';
  for (const line of css.split('\n')) {
    const named = SELECTOR.exec(line)?.[1];
    if (named && named.startsWith('.')) { selector = named; ink = ''; }
    const inked = INK.exec(line)?.[1];
    if (inked) ink = inked;
    const mix = MIX.exec(line);
    if (!mix || mix[1] !== 'background-color' || mix[2] !== ink) continue;
    out.push({ selector, variable: ink, percent: Number(mix[3]) });
  }
  return out;
}

export function washReports(
  washes: Wash[], roles: Map<string, string>, colors: Record<string, string>,
) {
  const surfaces = surfaceKeys(roles).filter((key) => colors[key]);
  const out: Report[] = [];
  for (const wash of washes) {
    const key = paletteKey(roles.get(wash.variable)) ?? paletteKey(`var(--${wash.variable})`);
    const ink = key ? colors[key] : undefined;
    if (!ink) continue;
    for (const surface of surfaces) {
      const painted = composite(ink, colors[surface] as string, wash.percent);
      const ratio = contrast(ink, painted);
      if (ratio >= TEXT_MIN) continue;
      out.push(report('contrast', `--${wash.variable} is drawn on a ${wash.percent}% wash of itself `
        + `at ${wash.selector}, which reads ${ratio.toFixed(2)}:1 over --color-${surface}, under `
        + `${TEXT_MIN}:1. The resting ratio is the ceiling here, so no wash percentage lifts it`));
    }
  }
  return out;
}

export function exemptionFor(level: Level) {
  for (const [what, why] of EXEMPT) if (level.state.includes(what)) return why;
  return null;
}

export const isMark = (variable: string) => /^ink-|^color-base-content$/.test(variable);

export function gateFor(level: Level) {
  if (level.property === 'color') return TEXT_MIN;
  return level.property === 'background-color' && isMark(level.variable) ? MARK_MIN : null;
}

export function paletteKey(value: string | undefined) {
  const named = REFERENCE.exec((value ?? '').trim())?.[1];
  return named ?? null;
}

export function surfaceKeys(roles: Map<string, string>) {
  const keys = [PAGE_KEY];
  for (const role of SURFACE_ROLES) {
    const key = paletteKey(roles.get(role));
    if (key && !keys.includes(key)) keys.push(key);
  }
  return keys;
}

export function drawnBy(levels: Level[]) {
  const grouped = new Map<string, { level: Level; slots: string[] }>();
  for (const level of levels) {
    if (exemptionFor(level)) continue;
    const key = `${level.property}|${level.variable}|${level.percent}`;
    const found = grouped.get(key) ?? { level, slots: [] };
    if (!found.slots.includes(level.selector)) found.slots.push(level.selector);
    grouped.set(key, found);
  }
  return [...grouped.values()];
}

export function levelReports(
  levels: Level[], roles: Map<string, string>, colors: Record<string, string>,
) {
  const surfaces = surfaceKeys(roles).filter((key) => colors[key]);
  const out: Report[] = [];
  for (const { level, slots } of drawnBy(levels)) {
    const gate = gateFor(level);
    if (gate === null) continue;
    const key = paletteKey(roles.get(level.variable)) ?? paletteKey(`var(--${level.variable})`);
    const ink = key ? colors[key] : undefined;
    if (!ink) continue;
    for (const surface of surfaces) {
      const on = colors[surface] as string;
      const ratio = contrast(composite(ink, on, level.percent), on);
      if (ratio >= gate) continue;
      out.push(report('contrast', `--${level.variable} at ${level.percent}% is ${ratio.toFixed(2)}:1 `
        + `on --color-${surface}, under the ${gate}:1 that ${level.property} carries; `
        + `${slots.length} slot(s) draw it, such as ${slots[0]}`));
    }
  }
  return out;
}
