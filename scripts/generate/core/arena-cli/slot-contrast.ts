/* Contrast per colour slot and per state. A slot resolves down its chain, an answer of the plugin
 * first, else the kernel default by the rules slots.ts writes as CSS, to a palette colour at an
 * alpha; a level or a mix toward the ink makes the alpha, and the ground a caller names is what
 * a part with no fill, or a wash, stands on. A disabled and a selected-disabled slot is never a
 * pair (WCAG exempts an inactive control), and disabledReports only says when one is not told
 * from its rest. Imports nothing outside this directory, because the command ships it. */

import { contrast } from './validate-palette.mjs';
import { composite, mixOklab, oklabToHex, toOklab } from './oklab.ts';
import type { Triple } from './oklab.ts';
import { MARK_MIN, paletteKey, surfaceKeys, TEXT_MIN } from './levels.ts';
import { report } from './report.ts';
import type { Report } from './report.ts';
import { expectedName } from './slots.ts';
import type { ColorSlot, SlotCatalogue } from './slots.ts';

export type Paint = { hex: string; alpha: number } | null;

type Resolved = Paint | undefined;

type Mix = { hover: number; pressed: number };

type Context = {
  catalogue: SlotCatalogue;
  answers: Map<string, string>;
  roles: Map<string, string>;
  colors: Record<string, string>;
  levels: Record<string, number>;
  mix: Mix;
};

export const REF = /^\{([a-z][a-z0-9-]*)\}$/;

const OFF = new Set(['disabled', 'selected-disabled']);

const owner = (slot: ColorSlot) => (slot.scope === 'family' ? `f:${slot.family}` : `c:${slot.component}`);

const sameWhole = (a: ColorSlot, b: ColorSlot) => owner(a) === owner(b) && a.option === b.option && a.part === b.part;

function valueColour(ctx: Context, first: string | undefined): Resolved {
  let value = first?.trim();
  for (let hop = 0; hop < 12 && value !== undefined; hop += 1) {
    if (value === 'transparent') return null;
    const key = paletteKey(value);
    if (key !== null) {
      const hex = ctx.colors[key];
      return hex === undefined ? undefined : { hex, alpha: 1 };
    }
    const name = /^var\(--([\w-]+)\)$/.exec(value)?.[1];
    value = name === undefined ? undefined : ctx.roles.get(name);
  }
  return undefined;
}

function mixPaints(a: Resolved, b: Resolved, share: number): Resolved {
  if (a === undefined || b === undefined) return undefined;
  if (a === null) return b === null ? null : { hex: b.hex, alpha: b.alpha * share };
  if (b === null) return { hex: a.hex, alpha: a.alpha * (1 - share) };
  if (a.alpha === 1 && b.alpha === 1) return { hex: mixOklab(a.hex, b.hex, share), alpha: 1 };
  const [wa, wb] = [a.alpha * (1 - share), b.alpha * share];
  const alpha = wa + wb;
  const [la, lb] = [toOklab(a.hex), toOklab(b.hex)];
  return { hex: oklabToHex([0, 1, 2].map((i) => (la[i]! * wa + lb[i]! * wb) / alpha) as Triple), alpha };
}

function paint(ctx: Context, name: string, withLevel = true): Resolved {
  const slot = ctx.catalogue.slots[name];
  if (!slot) return undefined;
  let base: Resolved;
  if (ctx.answers.has(name)) {
    base = valueColour(ctx, ctx.answers.get(name));
  } else if (slot.derive) {
    const from = ctx.catalogue.slots[slot.derive.from];
    base = paint(ctx, slot.derive.from);
    if (slot.derive.mix && from) {
      const ink = paint(ctx, expectedName({ ...from, property: 'ink' }));
      base = mixPaints(base, ink, ctx.mix[slot.derive.mix === 'mix-hover' ? 'hover' : 'pressed']);
    }
  } else if (slot.optional) {
    base = paint(ctx, expectedName({ ...slot, state: slot.state === 'selected-disabled' ? 'selected' : 'rest' }));
  } else {
    const text = (slot.default ?? '').trim();
    const ref = REF.exec(text)?.[1];
    const target = ref === undefined ? undefined : ctx.catalogue.slots[ref];
    if (text === 'transparent') base = null;
    else if (ref === undefined) base = undefined;
    else if (!target) base = valueColour(ctx, ctx.roles.get(ref));
    else base = paint(ctx, ref, owner(target) !== owner(slot));
  }
  if (!slot.level || !withLevel || !base) return base;
  const percent = ctx.levels[slot.level];
  return percent === undefined ? undefined : { hex: base.hex, alpha: base.alpha * (percent / 100) };
}

const over = (colour: Paint, ground: string) => (colour === null ? ground : colour.alpha >= 1 ? colour.hex : composite(colour.hex, ground, colour.alpha * 100));

const share = (roles: Map<string, string>, name: string, fallback: number) => {
  const value = Number.parseFloat(roles.get(name) ?? '');
  return Number.isFinite(value) ? value : fallback;
};

export const mixOf = (roles: Map<string, string>): Mix => ({ hover: share(roles, 'mix-hover', 0.08), pressed: share(roles, 'mix-pressed', 0.16) });

export function slotColour(
  catalogue: SlotCatalogue, name: string, answers: Map<string, string>, roles: Map<string, string>,
  colors: Record<string, string>, levels: Record<string, number>, mix: Mix, ground: string,
): string | null {
  const painted = paint({ catalogue, answers, roles, colors, levels, mix }, name);
  return painted === undefined || painted === null ? null : over(painted, ground);
}

export type SlotPair = { slot: string; over: string; min: number };

export function slotPairs(catalogue: SlotCatalogue): SlotPair[] {
  const out: SlotPair[] = [];
  for (const [name, slot] of Object.entries(catalogue.slots)) {
    if (!slot.on || slot.on === 'reader' || OFF.has(slot.state) || !catalogue.slots[slot.on]) continue;
    if (slot.property === 'ink') out.push({ slot: name, over: slot.on, min: TEXT_MIN });
    else if (slot.property === 'icon') out.push({ slot: name, over: slot.on, min: MARK_MIN });
    else if (slot.property === 'edge' && slot.state.startsWith('selected')) out.push({ slot: name, over: slot.on, min: MARK_MIN });
  }
  for (const [key, on] of Object.entries(catalogue.rings)) {
    const fill = catalogue.slots[on];
    if (key === '' || !fill || fill.property !== 'fill') continue;
    for (const [name, slot] of Object.entries(catalogue.slots)) {
      if (slot.property === 'fill' && sameWhole(slot, fill) && !OFF.has(slot.state)) out.push({ slot: 'edge-focus', over: name, min: MARK_MIN });
    }
  }
  return out;
}

const WHY: Record<string, string> = {
  ink: 'the label is hard to read',
  icon: 'the glyph is hard to see',
  edge: 'the edge that marks the state is hard to see',
  'edge-focus': 'the focus ring is hard to see',
};

export function slotReports(
  catalogue: SlotCatalogue, answers: Map<string, string>, roles: Map<string, string>,
  colors: Record<string, string>, theme: string, levels: Record<string, number> = {},
): Report[] {
  const ctx: Context = { catalogue, answers, roles, colors, levels, mix: mixOf(roles) };
  const grounds = surfaceKeys(roles).filter((key) => colors[key]);
  const out: Report[] = [];
  const seen = new Set<string>();
  for (const pair of slotPairs(catalogue)) {
    const mark = catalogue.slots[pair.slot] === undefined ? valueColour(ctx, roles.get(pair.slot)) : paint(ctx, pair.slot);
    const fill = paint(ctx, pair.over);
    if (!mark || fill === undefined) continue;
    const state = (catalogue.slots[pair.over] as ColorSlot).state;
    const kind = catalogue.slots[pair.slot]?.property ?? 'edge-focus';
    const standard = pair.min === MARK_MIN ? 'WCAG 1.4.11' : 'WCAG 1.4.3';
    for (const ground of fill !== null && fill.alpha >= 1 ? [null] : grounds) {
      const under = ground === null ? (fill as { hex: string }).hex : over(fill, colors[ground] as string);
      const ratio = contrast(over(mark, under), under);
      if (ratio >= pair.min) continue;
      const on = ground === null ? '' : `, where it is composited over --color-${ground}`;
      const line = `--${pair.slot} measures ${ratio.toFixed(2)}:1 over --${pair.over} in the ${state} state of the ${theme} theme${on}, `
        + `below ${pair.min}:1 (${standard}), so ${WHY[kind]}; answer the pair with colours that stand further apart`;
      if (seen.has(line)) continue;
      seen.add(line);
      out.push(report('contrast', line));
    }
  }
  return out;
}

const same = (a: Resolved, b: Resolved) => a !== undefined && b !== undefined
  && (a === null || b === null ? a === b : a.hex === b.hex && Math.abs(a.alpha - b.alpha) < 1e-9);

export function disabledReports(
  catalogue: SlotCatalogue, answers: Map<string, string>, roles: Map<string, string>,
  colors: Record<string, string>, theme: string, levels: Record<string, number> = {},
): Report[] {
  const ctx: Context = { catalogue, answers, roles, colors, levels, mix: mixOf(roles) };
  const parts = new Map<string, ColorSlot[]>();
  for (const [name, slot] of Object.entries(catalogue.slots)) {
    if (!OFF.has(slot.state) || !answers.has(name)) continue;
    const key = `${owner(slot)}|${slot.option}|${slot.part}`;
    parts.set(key, [...(parts.get(key) ?? []), slot]);
  }
  const out: Report[] = [];
  for (const [, answered] of parts) {
    const first = answered[0] as ColorSlot;
    const states = [...new Set(answered.map((slot) => slot.state))];
    const alike = states.every((state) => Object.values(catalogue.slots)
      .filter((slot) => sameWhole(slot, first) && slot.state === state)
      .every((slot) => same(paint(ctx, expectedName(slot)), paint(ctx, expectedName({ ...slot, state: state === 'disabled' ? 'rest' : 'selected' })))));
    if (!alike) continue;
    const stem = expectedName({ ...first, property: 'fill', state: 'rest' }).replace(/-fill-rest$/, '');
    out.push(report('contrast', `--${stem} answers its ${states.join(' and ')} slots with the colours it draws at ${states.includes('disabled') ? 'rest' : 'selected'} `
      + `in the ${theme} theme, so a disabled control is not told from an enabled one by colour; the part stops fading once it is answered`));
  }
  return out;
}
