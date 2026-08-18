/* Every token in `contracts/design/` is a DTCG 2025.10 type but one, and this gate is where that
 * claim is kept true. The exception is `keyword`, for a property whose value is a word rather than
 * a measurement, which text-transform asked for and 2025.10 has no type for. The closed set is
 * what earns it: a bare `string` would carry the same value and give up the only thing a type
 * buys, since with no set `smallcaps` is as valid as `uppercase` and no gate can tell them apart.
 * A keyword therefore names the words it may take and this gate refuses the rest. The set is
 * declared once, on the role in `roles.json`, which EXCLUDED keeps out of this walk by name: a
 * role states a question and carries no value, and a DTCG token without one is not a DTCG token.
 * The reasoning in full is in `contracts/design/TokenTypes.md`. */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';

export const node = {
  name: 'check:dtcg',
  reads: ['contracts/design/*.json'],
  writes: [],
  feeds: [],
};
import { ARENA_EXT } from '../../lib/core/dtcg-shapes.ts';
import type { DtcgNode } from '../../lib/core/dtcg-shapes.ts';

const RESERVED = new Set(['$value', '$type', '$description', '$extensions', '$deprecated']);
const DNS = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
const HEX = /^#[0-9a-f]{6}$/;

const isObj = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const inRange = (v: unknown, lo: number, hi: number) => isNum(v) && v >= lo && v <= hi;

function checkDimension(v: unknown, at: string, errs: string[], unitsAllowed = ['px', 'rem']) {
  if (!isObj(v)) return errs.push(`${at}: dimension must be a {value,unit} object, got ${JSON.stringify(v)}`);
  if (!isNum(v.value)) errs.push(`${at}: dimension value must be a number`);
  if (!unitsAllowed.includes(v.unit)) errs.push(`${at}: dimension unit must be one of ${unitsAllowed.join('|')} and is required even at 0`);
}

function checkColor(v: unknown, at: string, errs: string[]) {
  if (!isObj(v)) return errs.push(`${at}: color must be a structured object, got ${JSON.stringify(v)}`);
  if (v.colorSpace !== 'srgb') errs.push(`${at}: color colorSpace must be "srgb"`);
  if (!Array.isArray(v.components) || v.components.length !== 3 || !v.components.every((c) => inRange(c, 0, 1)))
    errs.push(`${at}: color components must be three numbers between 0 and 1`);
  if (v.alpha !== undefined && !inRange(v.alpha, 0, 1)) errs.push(`${at}: color alpha must be between 0 and 1`);
  if (v.hex !== undefined) {
    if (!HEX.test(v.hex)) return errs.push(`${at}: color hex must match #rrggbb (lowercase)`);
    if (Array.isArray(v.components) && v.components.length === 3) {
      const from = v.components.map((c) => Math.round(c * 255));
      const to = [1, 3, 5].map((i) => parseInt(v.hex.slice(i, i + 2), 16));
      if (from.join() !== to.join())
        errs.push(`${at}: color hex ${v.hex} does not round-trip its components (${from.join(',')} vs ${to.join(',')})`);
    }
  }
}

const KEYWORD = /^-?[a-zA-Z_][\w-]*$/;

function checkKeyword(v: unknown, values: unknown, at: string, errs: string[]) {
  if (typeof v !== 'string' || !KEYWORD.test(v))
    return errs.push(`${at}: keyword must be a single bare CSS word, got ${JSON.stringify(v)}`);
  if (values === undefined) return;
  if (!Array.isArray(values) || !values.length || !values.every((w) => typeof w === 'string' && KEYWORD.test(w)))
    return errs.push(`${at}: $extensions["${ARENA_EXT}"].values must be a non-empty array of bare CSS words`);
  if (!values.includes(v))
    errs.push(`${at}: keyword "${v}" is not one of ${values.join(', ')} — the set a keyword declares is the whole reason it is not a string`);
}

function checkValue(type: string, v: unknown, at: string, errs: string[], values?: unknown) {
  switch (type) {
    case 'keyword': return checkKeyword(v, values, at, errs);
    case 'color': return checkColor(v, at, errs);
    case 'dimension': return checkDimension(v, at, errs);
    case 'duration': return checkDimension(v, at, errs, ['ms', 's']);
    case 'number':
      if (!isNum(v)) errs.push(`${at}: number must be a finite number`);
      return;
    case 'fontWeight':
      if (!inRange(v, 1, 1000)) errs.push(`${at}: fontWeight must be a number between 1 and 1000`);
      return;
    case 'fontFamily': {
      const list = Array.isArray(v) ? v : [v];
      if (!list.length || !list.every((f) => typeof f === 'string' && f.length))
        errs.push(`${at}: fontFamily must be a non-empty string or array of non-empty strings`);
      return;
    }
    case 'cubicBezier':
      if (!Array.isArray(v) || v.length !== 4 || !v.every(isNum))
        return errs.push(`${at}: cubicBezier must be four numbers`);
      if (!inRange(v[0], 0, 1) || !inRange(v[2], 0, 1))
        errs.push(`${at}: cubicBezier x components must be between 0 and 1`);
      return;
    case 'shadow': {
      const list = Array.isArray(v) ? v : [v];
      for (const s of list) {
        if (!isObj(s)) { errs.push(`${at}: shadow must be an object`); continue; }
        for (const k of ['offsetX', 'offsetY', 'blur', 'spread']) checkDimension(s[k], `${at}.${k}`, errs);
        checkColor(s.color, `${at}.color`, errs);
      }
      return;
    }
    default:
      errs.push(`${at}: unknown $type "${type}" — not a DTCG 2025.10 type, and not Arena's one addition to them, keyword`);
  }
}

export function validateTree(tree: DtcgNode, file: string) {
  const errs: string[] = [];
  const walk = (node: DtcgNode, path: string[], inheritedType?: string) => {
    const type = node.$type ?? inheritedType;
    if (node.$extensions !== undefined) {
      if (!isObj(node.$extensions)) errs.push(`${file}:${path.join('.')}: $extensions must be an object`);
      else for (const k of Object.keys(node.$extensions))
        if (!DNS.test(k)) errs.push(`${file}:${path.join('.')}: $extensions key "${k}" must be reverse-DNS`);
    }
    if (typeof node.$description === 'string' && /\{[^{}]*\}/.test(node.$description)) {
      errs.push(`${file}:${path.join('.')}: $description contains ${(/\{[^{}]*\}/.exec(node.$description) ?? [''])[0]}, `
        + 'which Style Dictionary resolves as a token reference wherever it appears, so the prose is '
        + 'replaced by that token\'s value and the description stops being a string. Name the token '
        + 'without braces');
    }
    if (node.$value !== undefined) {
      const at = `${file}:${path.join('.')}`;
      if (typeof node.$value === 'string' && /^\{[^{}]+\}$/.test(node.$value)) return;
      if (!type) return errs.push(`${at}: token has no $type (own or inherited) — invalid under DTCG 2025.10`);
      checkValue(type, node.$value, at, errs, node.$extensions?.[ARENA_EXT]?.values);
      return;
    }
    for (const [k, child] of Object.entries(node) as [string, DtcgNode][]) {
      if (RESERVED.has(k)) continue;
      if (k.startsWith('$') || /[.{}]/.test(k))
        errs.push(`${file}:${[...path, k].join('.')}: invalid name — must not start with $ or contain . { }`);
      if (isObj(child)) walk(child, [...path, k], type);
    }
  };
  walk(tree, [], undefined);
  return errs;
}

export const EXCLUDED = new Map([
  ['roles.json',
   'it declares the questions the kernel asks and carries no value, so it is not a token file. '
   + 'A DTCG token without $value is not a DTCG token, and check:role-contract holds it instead.'],
]);

export function zeroSourceProblems(count: number) {
  if (count > 0) return [];
  return ['found 0 token files in contracts/design — an empty result set is a failure, not a clean pass; check the discovery path'];
}

function main() {
  const src = join(root, 'contracts/design');
  const files = readdirSync(src).filter((f) => f.endsWith('.json') && !EXCLUDED.has(f)).sort();
  const zero = zeroSourceProblems(files.length);
  if (zero.length) { for (const z of zero) console.error(`check-dtcg: ${z}`); process.exit(1); }
  let errs: string[] = [];
  for (const f of files) errs = errs.concat(validateTree(readJson(join(src, f)), f));
  if (errs.length) {
    console.error(`check-dtcg: ${errs.length} violation(s) of DTCG 2025.10 and Arena's keyword type\n`);
    for (const e of errs) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log(`check-dtcg: ${files.length} file(s) valid DTCG 2025.10 (plus keyword) — ${files.join(', ')}`);
}

if (isMainModule(import.meta.url)) main();
