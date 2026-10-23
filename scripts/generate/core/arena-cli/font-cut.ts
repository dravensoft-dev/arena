/* The cut of one font: which weights a build paints, which of them the file can give, and the
 * subset that keeps Latin-1 and those weights. harfbuzz drives the subset through its raw wasm
 * exports (it has no woff2 codec), and wawoff2 decodes the input and encodes the output. Imports
 * nothing, not even node:, because theme-css.ts reads unicodeRange from here and runs in a page;
 * font-files.ts finds the two libraries and hands them over through installFontTools. */

export const LATIN_1: number[] = [
  ...Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) => 0x20 + i),
  ...Array.from({ length: 0xff - 0xa0 + 1 }, (_, i) => 0xa0 + i),
  0x2013, 0x2014, 0x2018, 0x2019, 0x201a, 0x201c, 0x201d, 0x201e, 0x2026, 0x20ac,
];

export const KEPT_FEATURES = ['kern', 'liga', 'calt', 'tnum', 'lnum'];

export function unicodeRange(codepoints: number[] = LATIN_1) {
  const sorted = [...new Set(codepoints)].sort((a, b) => a - b);
  const runs: [number, number][] = [];
  for (const cp of sorted) {
    const last = runs[runs.length - 1];
    if (last && cp === last[1] + 1) last[1] = cp;
    else runs.push([cp, cp]);
  }
  const hex = (n: number) => n.toString(16).toUpperCase().padStart(4, '0');
  return runs.map(([lo, hi]) => (lo === hi ? `U+${hex(lo)}` : `U+${hex(lo)}-${hex(hi)}`)).join(',');
}

const DECLARATION = /([\w-]+)\s*:\s*([^;]+)/g;
const KEYWORDS: Record<string, number> = { normal: 400, bold: 700 };
const INITIAL_WEIGHT = 400;
const VAR = /^var\(\s*(--[\w-]+)\s*(?:,.*)?\)$/s;

function ownDeclarations(css: string): { declarations: [string, string][] }[] {
  type Frame = { prelude: string; text: string };
  const stack: Frame[] = [{ prelude: '', text: '' }];
  const blocks: { declarations: [string, string][] }[] = [];
  let buffer = '';
  let parens = 0;
  let quote = '';
  let escaped = false;
  for (const char of css) {
    const frame = stack[stack.length - 1] as Frame;
    if (quote !== '') {
      buffer += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      buffer += char;
      continue;
    }
    if (char === '(') parens++;
    else if (char === ')') parens = Math.max(0, parens - 1);
    if (parens === 0 && char === '{') {
      const cut = buffer.lastIndexOf(';');
      frame.text += buffer.slice(0, cut + 1);
      stack.push({ prelude: buffer.slice(cut + 1).trim(), text: '' });
      buffer = '';
    } else if (parens === 0 && char === ';') {
      frame.text += `${buffer};`;
      buffer = '';
    } else if (parens === 0 && char === '}' && stack.length > 1) {
      frame.text += buffer;
      buffer = '';
      stack.pop();
      if (frame.prelude.startsWith('@font-face') || frame.prelude.startsWith('@property')) continue;
      const declarations = [...frame.text.matchAll(DECLARATION)].map((m): [string, string] => [m[1] as string, (m[2] as string).trim()]);
      blocks.push({ declarations });
    } else buffer += char;
  }
  return blocks;
}

export function paintedWeights(css: string, roles: string[]): Map<string, number[]> {
  const variables = new Map<string, string[]>();
  const blocks = ownDeclarations(css.replace(/\/\*[\s\S]*?\*\//g, ''));
  for (const { declarations } of blocks) {
    for (const [name, value] of declarations) {
      if (name.startsWith('--')) variables.set(name, [...(variables.get(name) ?? []), value]);
    }
  }

  const values = (value: string, seen: string[] = []): string[] => {
    const named = VAR.exec(value)?.[1];
    if (named === undefined || seen.includes(named)) return [value];
    return (variables.get(named) ?? []).flatMap((one) => values(one, [...seen, named]));
  };
  const rolesNamed = (value: string, seen: string[] = []): string[] => {
    const named = VAR.exec(value)?.[1];
    if (named === undefined || seen.includes(named)) return [];
    const role = roles.find((one) => named === `--font-${one}`);
    if (role !== undefined) return [role];
    return (variables.get(named) ?? []).flatMap((one) => rolesNamed(one, [...seen, named]));
  };

  const found = new Map<string, Set<number>>(roles.map((role) => [role, new Set<number>()]));
  for (const { declarations } of blocks) {
    const weights = declarations.filter(([name]) => name === 'font-weight')
      .flatMap(([, value]) => values(value))
      .map((one) => KEYWORDS[one.trim()] ?? Number(one.trim()))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 1000);
    const family = declarations.filter(([name]) => name === 'font-family').map(([, value]) => value);
    const named = family.flatMap((value) => rolesNamed(value));
    if (weights.length === 0) {
      if (declarations.some(([name]) => name === 'font-weight')) continue;
      for (const role of named) found.get(role)?.add(INITIAL_WEIGHT);
      continue;
    }
    const owners = family.length === 0 ? ['body'] : named;
    for (const role of owners) for (const weight of weights) found.get(role)?.add(weight);
  }
  return new Map([...found].map(([role, set]) => [role, [...set].sort((a, b) => a - b)]));
}

export type CutPlan =
  | { kind: 'range'; lo: number; hi: number; lost?: number[] }
  | { kind: 'pins'; at: number[]; lost?: number[] };

export function cutPlan(weights: number[], axis: [number, number] | null): CutPlan {
  const asked = [...new Set(weights)].sort((a, b) => a - b);
  if (axis === null) return { kind: 'pins', at: asked };
  const clamp = (w: number) => Math.min(Math.max(w, axis[0]), axis[1]);
  const lost = asked.filter((w) => clamp(w) !== w);
  const kept = [...new Set(asked.map(clamp))];
  if (kept.length === 0) return { kind: 'range', lo: axis[0], hi: axis[1], lost };
  const first = kept[0] as number;
  const last = kept[kept.length - 1] as number;
  if (kept.length === 1 || (kept.length === 2 && last - first > 100)) return { kind: 'pins', at: kept, lost };
  return { kind: 'range', lo: first, hi: last, lost };
}

export function cutSteps(plan: CutPlan): CutPlan[] {
  return plan.kind === 'pins' && plan.at.length > 1
    ? plan.at.map((weight): CutPlan => ({ kind: 'pins', at: [weight], lost: plan.lost }))
    : [plan];
}

export type FontAxis = { tag: string; min: number; def: number; max: number };

export function fontAxes(sfnt: Uint8Array): FontAxis[] {
  const view = new DataView(sfnt.buffer, sfnt.byteOffset, sfnt.byteLength);
  const tag = (at: number) => String.fromCharCode(view.getUint8(at), view.getUint8(at + 1), view.getUint8(at + 2), view.getUint8(at + 3));
  const tables = view.getUint16(4);
  for (let i = 0; i < tables; i++) {
    const record = 12 + i * 16;
    if (tag(record) !== 'fvar') continue;
    const at = view.getUint32(record + 8);
    const first = at + view.getUint16(at + 4);
    const count = view.getUint16(at + 8);
    const size = view.getUint16(at + 10);
    return Array.from({ length: count }, (_, n) => {
      const axis = first + n * size;
      return {
        tag: tag(axis),
        min: view.getInt32(axis + 4) / 65536,
        def: view.getInt32(axis + 8) / 65536,
        max: view.getInt32(axis + 12) / 65536,
      };
    });
  }
  return [];
}

export function weightAxis(sfnt: Uint8Array): [number, number] | null {
  const axis = fontAxes(sfnt).find((one) => one.tag === 'wght');
  return axis ? [axis.min, axis.max] : null;
}

export type FontTools = {
  subset: WebAssembly.Module;
  compress(bytes: Uint8Array): Promise<Uint8Array>;
  decompress(bytes: Uint8Array): Promise<Uint8Array>;
};

let installed: FontTools | null = null;

export function installFontTools(tools: FontTools | null) {
  installed = tools;
}

const tagInt = (tag: string) => (tag.charCodeAt(0) << 24 | tag.charCodeAt(1) << 16 | tag.charCodeAt(2) << 8 | tag.charCodeAt(3)) >>> 0;

const NO_HINTING = 1;
const LAYOUT_FEATURE_TAG = 6;
const DUPLICATE = 0;

export async function cutFont(source: Uint8Array, plan: CutPlan, codepoints: number[], tools: FontTools | null = installed):
  Promise<{ bytes: Uint8Array; lost: number[] }> {
  if (tools === null) throw new Error('cutFont: no font tools are installed; font-files.ts loads harfbuzzjs and wawoff2');
  const woff2 = source[0] === 0x77 && source[1] === 0x4f && source[2] === 0x46 && source[3] === 0x32;
  const sfnt = woff2 ? await tools.decompress(source) : source;
  const axes = fontAxes(sfnt);

  const { exports: e } = await WebAssembly.instantiate(tools.subset, {});
  const x = e as unknown as Record<string, (...args: number[]) => number> & { memory: WebAssembly.Memory };
  (e as unknown as { _initialize(): void })._initialize();
  const heap = () => new Uint8Array(x.memory.buffer);

  const data = x.malloc!(sfnt.length);
  heap().set(sfnt, data);
  const blob = x.hb_blob_create!(data, sfnt.length, DUPLICATE, 0, 0);
  x.free!(data);
  const face = x.hb_face_create!(blob, 0);
  const input = x.hb_subset_input_create_or_fail!();
  if (!input) throw new Error('cutFont: harfbuzz could not create a subset input');

  const unicodes = x.hb_subset_input_unicode_set!(input);
  for (const cp of codepoints) x.hb_set_add!(unicodes, cp);
  const features = x.hb_subset_input_set!(input, LAYOUT_FEATURE_TAG);
  x.hb_set_clear!(features);
  for (const tag of KEPT_FEATURES) x.hb_set_add!(features, tagInt(tag));
  x.hb_subset_input_set_flags!(input, NO_HINTING);

  const pinned = plan.kind === 'pins' ? plan.at[0] : undefined;
  for (const axis of axes) {
    const tag = tagInt(axis.tag);
    if (axis.tag !== 'wght') x.hb_subset_input_pin_axis_to_default!(input, face, tag);
    else if (pinned !== undefined) x.hb_subset_input_pin_axis_location!(input, face, tag, pinned);
    else if (plan.kind === 'range') x.hb_subset_input_set_axis_range!(input, face, tag, plan.lo, plan.hi, 0);
  }

  const cut = x.hb_subset_or_fail!(face, input);
  if (!cut) throw new Error('cutFont: harfbuzz could not subset this font');
  const out = x.hb_face_reference_blob!(cut);
  const from = x.hb_blob_get_data!(out, 0);
  const bytes = heap().slice(from, from + x.hb_blob_get_length!(out));
  return { bytes: new Uint8Array(await tools.compress(bytes)), lost: plan.lost ?? [] };
}
