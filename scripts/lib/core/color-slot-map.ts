/* The colour criterion of the group map: a part is coloured when a bg, text, border, outline, ring, fill,
 * stroke, decoration, divide, caret, accent or placeholder utility (after its variant prefixes) reads a
 * --color-* key of Theme.css, a palette key, a keyword or [color:...], in slots, variants or compoundVariants.
 * check:color-slots holds every such part to a group part of contracts/design/color-slots.json.
 * A fill-* utility paints ink on a part whose name reads as text (TEXTLIKE: label, tick, value, readout and
 * the like, an SVG text) and a fill on any other: the manifest names no element, so the part name decides. */

import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../arena/repo-root.ts';
import { layerManifests } from '../tailwind/tailwind-compile.ts';

export type ColouredPart = { focusOnly: boolean; keywordsOnly: boolean; properties: string[] };

const KEYWORDS = ['transparent', 'current', 'white', 'black', 'inherit'];
const UTILITY = /^-?(bg|text|border(?:-[trblxyse])?|outline|ring|fill|stroke|decoration|divide|from|via|to|caret|accent|placeholder)-(.+)$/;
const ICON_INK = /^\[color:var\(--arena-icon-ink,currentColor\)\]$/;
const TEXTLIKE = /(label|tick|value|title|text|legend|caption|name|number|count|axis-label|readout)/i;

function split(token: string): { mods: string[]; util: string } {
  const mods: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < token.length; i++) {
    const c = token[i];
    if (c === '[' || c === '(') depth++;
    else if (c === ']' || c === ')') depth--;
    else if (c === ':' && depth === 0) { mods.push(token.slice(start, i)); start = i + 1; }
  }
  return { mods, util: token.slice(start).replace(/^!|!$/g, '') };
}

const propertyOf = (util: string, part: string, value: string) => {
  if (util === 'bg' && value.startsWith('edge-')) return 'edge';
  if (['bg', 'from', 'via', 'to', 'accent'].includes(util)) return 'fill';
  if (util === 'fill') return TEXTLIKE.test(part) ? 'ink' : 'fill';
  if (['text', 'decoration', 'placeholder', 'caret'].includes(util)) return 'ink';
  return 'edge';
};

export function colourNames(root = repoRoot): Set<string> {
  const names = new Set<string>(KEYWORDS);
  for (const m of readFileSync(join(root, 'frameworks/tailwind/Theme.css'), 'utf8').matchAll(/--color-([\w-]+)\s*:/g)) names.add(m[1]!);
  const palette = (readJson(join(root, 'contracts/design/palette.dark.json')) as { color: Record<string, unknown> }).color;
  for (const k of Object.keys(palette)) if (!k.startsWith('$')) names.add(k);
  return names;
}

export type ColourToken = { util: string; kind: string; value: string; focus: boolean };

export function colourToken(token: string, names: ReadonlySet<string>): ColourToken | undefined {
  const { mods, util } = split(token);
  const hit = UTILITY.exec(util);
  if (!hit) return undefined;
  const value = hit[2]!;
  if (!value.startsWith('[color:') && !names.has(value.split('/')[0]!)) return undefined;
  return { util, kind: hit[1]!, value, focus: mods.some((x) => /focus/.test(x)) || util.includes('edge-focus') };
}

export function colouredParts(root = repoRoot): Map<string, ColouredPart> {
  const names = colourNames(root);
  const out = new Map<string, ColouredPart>();
  for (const m of layerManifests(root).values()) {
    const texts: Record<string, string[]> = {};
    const add = (map: unknown) => {
      for (const [k, v] of Object.entries((map ?? {}) as Record<string, unknown>)) if (typeof v === 'string') (texts[k] ??= []).push(v);
    };
    add(m.slots);
    for (const group of Object.values(m.variants ?? {})) for (const option of Object.values(group)) add(option);
    for (const cv of m.compoundVariants ?? []) add(cv.class);
    for (const part of Object.keys(m.slots ?? {})) {
      let focus = 0;
      let rest = 0;
      let keywords = 0;
      const properties = new Set<string>();
      for (const token of (texts[part] ?? []).flatMap((t) => t.split(/\s+/).filter(Boolean))) {
        const read = colourToken(token, names);
        if (!read) continue;
        if (read.focus) { focus++; continue; }
        rest++;
        if (['transparent', 'current'].includes(read.value.split('/')[0]!) || ICON_INK.test(read.value)) keywords++;
        else properties.add(propertyOf(read.kind, part, read.value));
      }
      if (focus + rest > 0) out.set(`${m.component}.${part}`, { focusOnly: rest === 0, keywordsOnly: rest > 0 && keywords === rest, properties: [...properties].sort() });
    }
  }
  return out;
}
