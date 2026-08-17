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
  level: string | null;
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

export const DECORATIVE = new Map([
  ['.arena-stat-card__icon', 'a glyph Arena draws inside an aria-hidden wrapper beside a label '
    + 'that already says the same thing, so WCAG 1.4.11 exempts it as purely decorative. The '
    + 'paired suite asserts both layers still render it aria-hidden, so the day one stops, this '
    + 'entry fails rather than quietly excusing a mark somebody has to see'],
]);

const SELECTOR = /^\s*([.:&][^{}]*?)\s*\{\s*$/;
const MIX = /^\s*([\w-]+)\s*:\s*color-mix\(in oklab,\s*var\(--([\w-]+)\)\s*(?:([\d.]+)%|var\(--([\w-]+)\))\s*,\s*transparent\)/;
const REFERENCE = /^var\(--color-([\w-]+)\)$/;
const DEFAULT = /--(level-[\w-]+)\s*:\s*([\d.]+)%/g;

const INK = /^\s*color\s*:\s*var\(--([\w-]+)\)\s*;/;
const OPACITY = /^\s*opacity\s*:\s*([\d.]+)%\s*;/;

export function levelDefaults(css: string) {
  const out: Record<string, number> = {};
  for (const [, name, percent] of css.matchAll(DEFAULT)) out[name as string] = Number(percent);
  return out;
}

export function opacitiesIn(css: string) {
  const out = new Map<string, number>();
  let selector = '';
  let state = '';
  for (const line of css.split('\n')) {
    const named = SELECTOR.exec(line)?.[1];
    if (named?.startsWith('.')) { selector = named; state = named; }
    else if (named) state = `${selector}${named.replace(/&/g, '')}`;
    const held = OPACITY.exec(line)?.[1];
    if (held !== undefined) out.set(state, Number(held) / 100);
  }
  return out;
}

export function levelsIn(css: string, defaults: Record<string, number> = {}): Level[] {
  const held = opacitiesIn(css);
  const out: Level[] = [];
  let selector = '';
  let state = '';
  for (const line of css.split('\n')) {
    const named = SELECTOR.exec(line)?.[1];
    if (named?.startsWith('.')) { selector = named; state = named; }
    else if (named) state = `${selector}${named.replace(/&/g, '')}`;
    const mix = MIX.exec(line);
    if (!mix) continue;
    const level = mix[4] ?? null;
    const declared = level === null ? Number(mix[3]) : defaults[level];
    if (declared === undefined) continue;
    const opacity = (held.get(state) ?? 1) * (state === selector ? 1 : held.get(selector) ?? 1);
    out.push({
      selector,
      state,
      property: mix[1] as string,
      variable: mix[2] as string,
      percent: Number((declared * opacity).toFixed(2)),
      level: opacity === 1 ? level : null,
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
      out.push(report('wash', `--${wash.variable} is drawn on a ${wash.percent}% wash of itself `
        + `at ${wash.selector}, which reads ${ratio.toFixed(2)}:1 over --color-${surface}, under `
        + `${TEXT_MIN}:1. The resting ratio is the ceiling here, so no wash percentage lifts it`));
    }
  }
  return out;
}

export function exemptionFor(level: Level) {
  const decorative = DECORATIVE.get(level.selector);
  if (decorative) return decorative;
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

export function clears(ink: string, surfaces: string[], percent: number, gate: number) {
  return surfaces.every((on) => contrast(composite(ink, on, percent), on) >= gate);
}

export function raisedLevel(ink: string, surfaces: string[], floor: number, gate: number) {
  for (let percent = Math.ceil(floor); percent <= 100; percent += 1) {
    if (clears(ink, surfaces, percent, gate)) return percent;
  }
  return null;
}

export function derivedLevels(
  levels: Level[], roles: Map<string, string>, colors: Record<string, string>,
) {
  const surfaces = surfaceKeys(roles)
    .map((key) => colors[key])
    .filter((hex): hex is string => Boolean(hex));
  const out = new Map<string, { floor: number; percent: number | null; gate: number }>();
  for (const { level, ...rest } of levels) {
    if (level === null || out.has(level) || exemptionFor({ ...rest, level })) continue;
    const gate = gateFor({ ...rest, level });
    if (gate === null) continue;
    const key = paletteKey(roles.get(rest.variable)) ?? paletteKey(`var(--${rest.variable})`);
    const ink = key ? colors[key] : undefined;
    if (!ink) continue;
    out.set(level, { floor: rest.percent, percent: raisedLevel(ink, surfaces, rest.percent, gate), gate });
  }
  return out;
}

export function levelReports(
  levels: Level[], roles: Map<string, string>, colors: Record<string, string>,
  derived = new Map<string, { floor: number; percent: number | null; gate: number }>(),
) {
  const surfaces = surfaceKeys(roles).filter((key) => colors[key]);
  const out: Report[] = [];
  for (const { level, slots } of drawnBy(levels)) {
    const gate = gateFor(level);
    if (gate === null) continue;
    const key = paletteKey(roles.get(level.variable)) ?? paletteKey(`var(--${level.variable})`);
    const ink = key ? colors[key] : undefined;
    if (!ink) continue;
    const raised = level.level === null ? undefined : derived.get(level.level);
    if (raised && raised.percent === null) {
      out.push(report('contrast', `--${level.variable} cannot clear ${gate}:1 at any level, because `
        + `--color-${key} at full strength does not; ${slots.length} slot(s) draw it, such as `
        + `${slots[0]}. The ink is what has no room, not the level`));
      continue;
    }
    const percent = raised?.percent ?? level.percent;
    for (const surface of surfaces) {
      const on = colors[surface] as string;
      const ratio = contrast(composite(ink, on, percent), on);
      if (ratio >= gate) continue;
      out.push(report('contrast', `--${level.variable} at ${percent}% is ${ratio.toFixed(2)}:1 `
        + `on --color-${surface}, under the ${gate}:1 that ${level.property} carries; `
        + `${slots.length} slot(s) draw it, such as ${slots[0]}`));
    }
  }
  return out;
}

export const SEPARATION = 8;

export function raisedReports(
  derived: Map<string, { floor: number; percent: number | null; gate: number }>,
) {
  const out: Report[] = [];
  const steps = [...derived]
    .filter(([, one]) => one.percent !== null)
    .sort((a, b) => (a[1].percent as number) - (b[1].percent as number));
  for (const [level, one] of derived) {
    if (one.percent === null || one.percent === one.floor) continue;
    out.push(report('contrast', `--${level} is raised from ${one.floor}% to ${one.percent}% for this `
      + `palette, because your ink does not clear ${one.gate}:1 at ${one.floor}%. Arena raises a `
      + 'level and never lowers one, so the register is held back less than it is on other skins'));
  }
  for (const [i, [level, one]] of steps.entries()) {
    const above = steps[i + 1];
    if (!above || (above[1].percent as number) - (one.percent as number) >= SEPARATION) continue;
    out.push(report('contrast', `--${level} at ${one.percent}% and --${above[0]} at ${above[1].percent}% `
      + `are ${(above[1].percent as number) - (one.percent as number)} points apart, under the `
      + `${SEPARATION} two registers need to read as different. Legibility is held; the hierarchy `
      + 'between them is not, and only a base-content with more room restores it'));
  }
  return out;
}
