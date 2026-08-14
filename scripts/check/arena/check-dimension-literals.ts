/* Fails on a bare dimension literal in a framework layer. EXEMPT and PASSTHROUGH are
 * asserted by name in the paired suite, so changing either is a change to both.
 * Two blind spots are known and unfixed: a kebab-case SVG attribute, and Angular's [style.x]
 * binding form, which sits outside all four of the scanners below. */

import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { camel } from '../../utils/case.ts';
import { lineOf } from '../../utils/text.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { emittedTree } from '../../lib/arena/layers.ts';
import { captured } from '../../utils/captures.ts';
import { byCodeUnit, byKey } from '../../utils/compare.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { UNMODELLED_UNITS } from '../../generate/core/arena-to-prod/audit.ts';

export const node = {
  name: 'check:dimensions',
  reads: [
    'frameworks/react/**', 'frameworks/angular/**', 'frameworks/tailwind/**', 'frameworks/demos/**',
    '!frameworks/angular/build/**', '!frameworks/react/dist/**', '!frameworks/angular/dist/**',
  ],
  writes: [],
  feeds: [],
};


const EXTENSIONS = ['.jsx', '.ts', '.tsx'];

const PROPS = new Set([
  'fontSize', 'lineHeight', 'letterSpacing', 'fontWeight',
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'paddingInline', 'paddingBlock',

  'paddingInlineStart', 'paddingInlineEnd', 'paddingBlockStart', 'paddingBlockEnd',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'marginInline', 'marginBlock',
  'marginInlineStart', 'marginInlineEnd', 'marginBlockStart', 'marginBlockEnd',
  'gap', 'rowGap', 'columnGap',
  'border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft',
  'borderWidth', 'borderRadius',

  'borderInline', 'borderBlock',
  'borderInlineStart', 'borderInlineEnd', 'borderBlockStart', 'borderBlockEnd',
  'insetInline', 'insetBlock',
  'insetInlineStart', 'insetInlineEnd', 'insetBlockStart', 'insetBlockEnd',
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  'top', 'right', 'bottom', 'left', 'inset', 'zIndex',
  'boxShadow', 'transform', 'strokeWidth',
]);

export const EXEMPT = new Map([
  ['frameworks/react/components/charts/ChartTooltip.ts:top:`calc(${y}px - var(--chart-tooltip-offset))`',
   'the hovered datum, already projected through the chart\'s own y scale, interpolated into the calc() that lifts the tooltip clear of it — a runtime data-to-pixel projection, not a design dimension. There is no token to give it: the series values, their nice maximum and the container\'s measured width all change at runtime. What IS a decision, the gap itself, is the chart-tooltip-offset token beside it. One entry per layer now covers what the bar and line charts each spelt for themselves, and the Angular copy is held to the same rule for the first time, since a template binding spells the property in a shape this gate cannot read'],
  ['frameworks/angular/components/charts/ChartTooltip.ts:top:`calc(${y}px - var(--chart-tooltip-offset))`',
   'the paired copy of the React entry above, byte for byte the same expression, because check:shared-arithmetic is what keeps the two anchors from drifting and an exemption that covered only one layer would let the other one drift silently'],
  ['frameworks/react/components/display/arena-calendar/ArenaCalendar.tsx:height:`max(calc(var(--sp-1) * 6.5), ${rawH}px)`',
   'the max()\'s floor, calc(var(--sp-1) * 6.5), already reads a token, and stays governed — only the computed arm is exempt: rawH is an event\'s duration in minutes projected to pixels, the same data-to-pixel category as the two chart entries above, never a fixed dimension'],
  ['frameworks/react/DataVisuals.ts:width:1',
   'arenaSrOnly is the standard visually-hidden idiom, and its 1px box is not a design dimension — it is the smallest non-zero footprint that keeps the element in the accessibility tree, paired with clip:rect(0 0 0 0) to hide it regardless of box size. 0 would drop it from the tree in some engines and defeat the whole point. Nothing in contracts/design/ could stand in for it: the number is a constraint of the a11y idiom, and it must be a fixed literal for the negative margin below to cancel exactly'],
  ['frameworks/react/DataVisuals.ts:height:1',
   'the other axis of the same 1px visually-hidden box as the width entry above'],
  ['frameworks/react/DataVisuals.ts:margin:-1',
   'the same idiom\'s negative pull, which must cancel exactly the 1px box above so the hidden table shifts no sibling — it is bound to that literal, not to Arena\'s spacing scale, and a token here would break the cancellation'],
  ['frameworks/angular/DataVisuals.ts:width:\'1px\'',
   'ARENA_SR_ONLY is the standard visually-hidden idiom, and its 1px box is not a design dimension — it is the smallest non-zero footprint that keeps the element in the accessibility tree, paired with clip:rect(0 0 0 0) to hide it regardless of box size. 0 would drop it from the tree in some engines and defeat the whole point. Nothing in contracts/design/ could stand in for it: the number is a constraint of the a11y idiom, and it must be a fixed literal for the negative margin below to cancel exactly'],
  ['frameworks/angular/DataVisuals.ts:height:\'1px\'',
   'the other axis of the same 1px visually-hidden box as the width entry above'],
  ['frameworks/angular/DataVisuals.ts:margin:\'-1px\'',
   'the same idiom\'s negative pull, which must cancel exactly the 1px box above so the hidden table shifts no sibling — it is bound to that literal, not to Arena\'s spacing scale, and a token here would break the cancellation'],
]);

export { UNMODELLED_UNITS };
const FREE_UNITS = [...UNMODELLED_UNITS, 's', 'ms'];
const FREE_UNIT = new RegExp(`^\\s*'?-?\\d*\\.?\\d+(${FREE_UNITS.join('|')})'?\\s*$`);

const UNIT_LITERAL = /\d*\.?\d+\s*(%|[a-z]+)\b(?!\()/g;

const BARE_NUMBER = /^\s*'?-?\d*\.?\d+'?\s*$/;

const ZERO = /^\s*'?-?0(px|rem|em|%)?'?\s*$/;

function stripInterpolations(raw: string) {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '$' && raw[i + 1] === '{') {
      let depth = 1;
      let j = i + 2;
      for (; j < raw.length && depth > 0; j++) {
        if (raw[j] === '{') depth++;
        else if (raw[j] === '}') depth--;
      }

      out += '9';
      i = j - 1;
      continue;
    }
    out += raw[i];
  }
  return out;
}

export function scanValue(prop: string, rawValue: string) {
  if (!PROPS.has(prop)) return null;
  const raw = stripInterpolations(rawValue);
  if (ZERO.test(raw)) return null;
  if (FREE_UNIT.test(raw)) return null;

  const withoutTokens = raw.replace(/var\(\s*--[a-z0-9-]+\s*\)/g, '');

  for (const m of withoutTokens.matchAll(UNIT_LITERAL)) {
    const unit = captured(m);
    if (!FREE_UNITS.includes(unit)) return { reason: `a raw ${unit}, not a token` };
  }

  if (!raw.includes('var(') && BARE_NUMBER.test(raw))
    return { reason: 'a bare number, not a token' };

  return null;
}

export function skipString(text: string, i: number, quote: string) {
  for (let j = i + 1; j < text.length; j++) {
    if (text[j] === '\\') { j++; continue; }
    if (text[j] === quote) return j;
  }
  return text.length - 1;
}

export function blankComments(text: string) {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "'" || c === '"' || c === '`') {
      const end = skipString(text, i, c);
      out += text.slice(i, end + 1);
      i = end;
      continue;
    }
    if (c === '/' && text[i + 1] === '/') {
      let j = i;
      while (j < text.length && text[j] !== '\n') { out += ' '; j++; }
      i = j - 1;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      let j = i + 2;
      while (j < text.length && !(text[j] === '*' && text[j + 1] === '/')) j++;
      const end = Math.min(j + 1, text.length - 1);
      for (let k = i; k <= end; k++) out += (text[k] === '\n' ? '\n' : ' ');
      i = end;
      continue;
    }
    out += c;
  }
  return out;
}

export function readValue(text: string, start: number, stopChars: Set<string>) {
  let i = start, depth = 0;
  for (; i < text.length; i++) {
    const c = text[i];
    if (c === undefined) break;
    if (c === "'" || c === '"' || c === '`') { i = skipString(text, i, c); continue; }
    if (c === '(' || c === '[' || c === '{') { depth++; continue; }
    if (c === ')' || c === ']') { depth--; continue; }
    if (c === '}') { if (depth === 0 && stopChars.has('}')) break; depth--; continue; }
    if (depth === 0 && stopChars.has(c)) break;
  }
  return { text: text.slice(start, i), end: i };
}

function stripOuterParens(text: string) {
  const t = text.trim();
  if (t[0] !== '(' || t[t.length - 1] !== ')') return t;
  let depth = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === "'" || c === '"' || c === '`') { i = skipString(t, i, c); continue; }
    if (c === '(') depth++;
    else if (c === ')') { depth--; if (depth === 0) return i === t.length - 1 ? t.slice(1, -1).trim() : t; }
  }
  return t;
}

function splitTernary(text: string) {
  let depth = 0, qDepth = 0, qStart = -1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "'" || c === '"' || c === '`') { i = skipString(text, i, c); continue; }
    if (c === '(' || c === '[' || c === '{') { depth++; continue; }
    if (c === ')' || c === ']' || c === '}') { depth--; continue; }
    if (depth !== 0) continue;
    if (c === '?') {
      if (text[i + 1] === '.' || text[i + 1] === '?') { i++; continue; }
      if (qStart === -1) qStart = i;
      qDepth++;
    } else if (c === ':') {
      qDepth--;
      if (qDepth === 0) return { cond: text.slice(0, qStart), a: text.slice(qStart + 1, i), b: text.slice(i + 1) };
    }
  }
  return null;
}

function splitFallback(text: string) {
  const parts = [];
  let depth = 0, start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "'" || c === '"' || c === '`') { i = skipString(text, i, c); continue; }
    if (c === '(' || c === '[' || c === '{') { depth++; continue; }
    if (c === ')' || c === ']' || c === '}') { depth--; continue; }
    if (depth === 0 && (text.startsWith('||', i) || text.startsWith('??', i))) {
      parts.push(text.slice(start, i));
      start = i + 2;
      i += 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

export function expressionLeaves(text: string): string[] {
  const stripped = stripOuterParens(text);
  const ternary = splitTernary(stripped);
  if (ternary) return [...expressionLeaves(ternary.a), ...expressionLeaves(ternary.b)];
  const fallbackParts = splitFallback(stripped);
  if (fallbackParts.length > 1) return fallbackParts.flatMap(expressionLeaves);
  return [stripped.trim()];
}

function splitArgs(text: string) {
  const args = [];
  let depth = 0, start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '[') depth++;
    else if (c === ']') depth--;
    else if (c === ',' && depth === 0) { args.push(text.slice(start, i)); start = i + 1; }
  }
  args.push(text.slice(start));
  return args.map((a) => a.trim()).filter((a) => a.length > 0);
}

const CALL_SHAPE = /^([a-zA-Z_$][\w.$]*)\(([^()]*)\)$/;
const ARITH_SHAPE = /^[a-zA-Z_$][\w.$]*(?:\([^()]*\))?\s*[*+/-]\s*-?\d*\.?\d+$/;

function scanLeaf(prop: string, leaf: string) {
  const trimmed = leaf.trim();
  if (!trimmed) return [];

  const direct = scanValue(prop, trimmed);
  if (direct) return [{ raw: trimmed, reason: direct.reason }];

  const callMatch = CALL_SHAPE.exec(trimmed);
  if (callMatch) {
    const hits = [];
    for (const arg of splitArgs(captured(callMatch, 2))) {
      const hit = scanValue(prop, arg);
      if (hit) hits.push({ raw: arg, reason: hit.reason });
    }
    return hits;
  }

  if (ARITH_SHAPE.test(trimmed))
    return [{ raw: trimmed, reason: 'an inline literal in an arithmetic expression, not a token' }];

  return [];
}

const COLON_STOP = new Set([',', '}']);

const PROP_COLON = /(?<![\w.-])([a-zA-Z]+)\s*:\s*/g;

export const COERCION = /=>/;

export function isValueCoercion(prop: string, rawValue: string) {
  return prop === 'transform' && COERCION.test(rawValue);
}

function scanColonValues(text: string) {
  const out = [];
  for (const m of text.matchAll(PROP_COLON)) {
    const prop = captured(m);
    if (!PROPS.has(prop)) continue;
    const valueStart = m.index + m[0].length;
    const { text: rawValue } = readValue(text, valueStart, COLON_STOP);
    if (isValueCoercion(prop, rawValue)) continue;
    const line = lineOf(text, m.index);
    for (const leaf of expressionLeaves(rawValue))
      for (const hit of scanLeaf(prop, leaf))
        out.push({ prop, raw: hit.raw, reason: hit.reason, line });
  }
  return out;
}

export function scanText(rawText: string) {
  const text = blankComments(rawText);
  return [...scanColonValues(text), ...scanDataflow(text)];
}

const LOCAL_DECL = /(?<![\w.])(?:const|let)\s+([a-zA-Z_$][\w$]*)\s*=\s*/g;
const STATEMENT_STOP = new Set([',', ';', '}']);
const BARE_IDENTIFIER = /^[a-zA-Z_$][\w$]*$/;

function localDeclarations(text: string) {
  const decls = new Map();
  for (const m of text.matchAll(LOCAL_DECL)) {
    const name = m[1];
    const start = m.index + m[0].length;
    const { text: rhs } = readValue(text, start, STATEMENT_STOP);
    if (!decls.has(name)) decls.set(name, []);
    decls.get(name).push({ rhs, line: lineOf(text, m.index) });
  }
  return decls;
}

function scanDataflow(text: string) {
  const bareUsages = new Map();
  for (const m of text.matchAll(PROP_COLON)) {
    const prop = captured(m);
    if (!PROPS.has(prop)) continue;
    const valueStart = m.index + m[0].length;
    const { text: rawValue } = readValue(text, valueStart, COLON_STOP);
    if (isValueCoercion(prop, rawValue)) continue;
    for (const leaf of expressionLeaves(rawValue)) {
      const trimmed = leaf.trim();
      if (BARE_IDENTIFIER.test(trimmed) && !bareUsages.has(trimmed)) bareUsages.set(trimmed, prop);
    }
  }
  if (bareUsages.size === 0) return [];

  const decls = localDeclarations(text);
  const out = [];
  for (const [name, prop] of bareUsages) {
    const entries = decls.get(name);
    if (!entries) continue;
    for (const { rhs, line } of entries)
      for (const leaf of expressionLeaves(rhs))
        for (const hit of scanLeaf(prop, leaf))
          out.push({ prop, raw: hit.raw, reason: hit.reason, line });
  }
  return out;
}

function stringLiteralRuns(text: string) {
  const runs = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c !== "'" && c !== '"' && c !== '`') { i++; continue; }
    const index = i;
    let body = '';
    let j = i;
    for (;;) {
      const end = skipString(text, j, text[j] ?? "'");
      body += text.slice(j + 1, end);
      j = end + 1;
      let k = j;
      while (k < text.length && /\s/.test(text[k] ?? '')) k++;
      if (text[k] !== '+') break;
      let m = k + 1;
      while (m < text.length && /\s/.test(text[m] ?? '')) m++;
      if (text[m] !== "'" && text[m] !== '"' && text[m] !== '`') break;
      j = m;
    }
    runs.push({ body, index });
    i = j;
  }
  return runs;
}

export function scanInjectedCss(rawText: string) {
  const text = blankComments(rawText);
  const out = [];
  for (const { body, index } of stringLiteralRuns(text)) {
    if (!(body.includes('{') && body.includes(':') && /[;}]/.test(body))) continue;
    const line = lineOf(text, index);
    for (const decl of body.matchAll(/(?:^|[{;])\s*([a-z-]+)\s*:\s*([^;}]+)/g)) {
      const prop = camel(captured(decl));
      if (!PROPS.has(prop)) continue;
      const raw = captured(decl, 2).trim();
      const found = scanValue(prop, raw);
      if (found) out.push({ prop, raw, reason: found.reason, line });
    }
  }
  return out;
}

const SVG_ATTRS = new Set(['fontSize', 'strokeWidth', 'width', 'height', 'r', 'x', 'y', 'cx', 'cy', 'x1', 'x2', 'y1', 'y2']);

export function scanAttributes(rawText: string) {
  const text = blankComments(rawText);
  const out = [];
  for (const m of text.matchAll(/(?<![\w.-])([a-zA-Z]+)\s*=\s*"([^"]*)"/g)) {
    const prop = captured(m);
    const value = captured(m, 2);
    if (!SVG_ATTRS.has(prop)) continue;
    const found = scanValue(prop, `'${value}'`);
    if (found) out.push({ prop, raw: value, reason: found.reason, line: lineOf(text, m.index) });
  }
  return out;
}

const PASSTHROUGH = new Map([
  ['ArenaAppLogo', { prop: 'size', governs: 'width' }],
]);

const COMPONENT_PARAMS = /function\s+([A-Za-z_]\w*)\s*\(\{([\s\S]*?)\}(?:\s*:\s*[^)]+)?\)\s*\{/g;
const PARAM_DEFAULT = /(?<![\w.])([a-zA-Z]+)\s*=\s*('[^']*'|"[^"]*"|`[^`]*`|[-\w.%]+)(?=[,\s]|$)/g;

export function componentParamCount(rawText: string) {
  return [...blankComments(rawText).matchAll(COMPONENT_PARAMS)].length;
}

export function zeroComponentParamProblems(count: number) {
  if (count > 0) return [];
  return ['matched 0 destructured component parameter lists under frameworks/; the default-value '
    + 'scanner read nothing, so every default value in the tree reports clean'];
}

export function scanDefaultsAndCallSites(rawText: string) {
  const text = blankComments(rawText);
  const out = [];
  for (const fn of text.matchAll(COMPONENT_PARAMS)) {
    const name = captured(fn);
    const params = captured(fn, 2);
    const paramsStart = fn.index + fn[0].indexOf('{');
    const via = PASSTHROUGH.get(name);
    for (const m of params.matchAll(PARAM_DEFAULT)) {
      const prop = captured(m);
      const raw = captured(m, 2);
      const governs = PROPS.has(prop) ? prop : (via && via.prop === prop ? via.governs : null);
      if (!governs) continue;
      const hit = scanValue(governs, raw);
      if (hit) out.push({ prop: governs, raw, reason: hit.reason, line: lineOf(text, paramsStart + m.index) });
    }
  }
  for (const [name, via] of PASSTHROUGH) {
    const re = new RegExp(`<${name}\\b[^>]*?\\b${via.prop}\\s*=\\s*\\{([^}]+)\\}`, 'g');
    for (const m of text.matchAll(re)) {
      const raw = captured(m).trim();
      const hit = scanValue(via.governs, raw);
      if (hit) out.push({ prop: via.governs, raw, reason: hit.reason, line: lineOf(text, m.index) });
    }
  }
  return out;
}

function passthroughSightings(rawText: string) {
  const text = blankComments(rawText);
  const seen = new Set<string>();
  for (const fn of text.matchAll(COMPONENT_PARAMS)) if (PASSTHROUGH.has(captured(fn))) seen.add(captured(fn));
  for (const name of PASSTHROUGH.keys())
    if (new RegExp(`<${name}\\b`).test(text)) seen.add(name);
  return seen;
}

export function stalePassthrough(seenComponents: Set<string>) {
  return [...PASSTHROUGH.keys()].filter((k) => !seenComponents.has(k));
}

export function sourceFiles(dir: string): string[] {
  const emitted = emittedTree();
  return walkFiles(dir, { skip: (name, p) => name === 'dist' || p === emitted })
    .filter((p) => !p.endsWith('.d.ts') && EXTENSIONS.some((e) => p.endsWith(e)));
}

export function staleExemptions(matchedKeys: Set<string>) {
  return [...EXEMPT.keys()].filter((k) => !matchedKeys.has(k));
}

function collect() {
  const found = [];
  const matchedKeys = new Set<string>();
  const seenComponents = new Set<string>();
  let paramLists = 0;
  for (const file of sourceFiles(join(repoRoot, 'frameworks'))) {
    const rel = relPosix(repoRoot, file);
    const text = readFileSync(file, 'utf8');
    paramLists += componentParamCount(text);
    for (const name of passthroughSightings(text)) seenComponents.add(name);
    const hits = [...scanText(text), ...scanDefaultsAndCallSites(text), ...scanInjectedCss(text), ...scanAttributes(text)];
    for (const hit of hits) {
      const key = `${rel}:${hit.prop}:${hit.raw}`;
      matchedKeys.add(key);
      if (EXEMPT.has(key)) continue;
      found.push({ file: rel, ...hit });
    }
  }
  return {
    found,
    stale: staleExemptions(matchedKeys),
    stalePassthrough: stalePassthrough(seenComponents),
    zeroParams: zeroComponentParamProblems(paramLists),
  };
}

export type DimensionHit = { file: string; line: number; prop: string; raw: string };

function report(found: DimensionHit[]) {
  const byProp = new Map();
  for (const f of found) {
    if (!byProp.has(f.prop)) byProp.set(f.prop, new Map());
    const byValue = byProp.get(f.prop);
    if (!byValue.has(f.raw)) byValue.set(f.raw, []);
    byValue.get(f.raw).push(f.file);
  }
  for (const [prop, byValue] of [...byProp].sort(byKey(([prop]) => prop))) {
    const total = [...byValue.values()].reduce((n, files) => n + files.length, 0);
    console.log(`\n${prop}  (${total} site(s), ${byValue.size} distinct value(s))`);
    for (const [raw, files] of [...byValue].sort((a, b) => b[1].length - a[1].length))
      console.log(`  ${String(files.length).padStart(3)}x  ${raw}`);
  }
  console.log(`\ntotal: ${found.length} site(s)`);
}

function reportSites(found: DimensionHit[]) {
  const sorted = [...found].sort((a, b) => byCodeUnit(a.file, b.file) || a.line - b.line);
  for (const f of sorted) console.log(`${f.file}:${f.line}  ${f.prop}: ${f.raw}`);
}

function main() {
  const { found, stale, stalePassthrough: stalePT, zeroParams } = collect();
  if (process.argv.includes('--report=sites')) { reportSites(found); return; }
  if (process.argv.includes('--report')) { report(found); return; }
  let failed = false;
  if (zeroParams.length) {
    failed = true;
    for (const problem of zeroParams) console.error(`check-dimension-literals: ${problem}`);
  }
  if (stale.length) {
    if (failed) console.error('');
    failed = true;
    console.error(`check-dimension-literals: ${stale.length} stale EXEMPT entr${stale.length === 1 ? 'y' : 'ies'} — named a site that no longer produces a violation\n`);
    for (const key of stale) console.error(`  ${key} — ${EXEMPT.get(key)}`);
    console.error('\nThe site was fixed, deleted, or its raw text changed shape. Remove the');
    console.error('entry, or re-key it to match the current text exactly.');
  }
  if (stalePT.length) {
    failed = true;
    if (stale.length) console.error('');
    console.error(`check-dimension-literals: ${stalePT.length} stale PASSTHROUGH entr${stalePT.length === 1 ? 'y' : 'ies'} — matched nothing in the tree\n`);
    for (const name of stalePT) console.error(`  ${name} — no "function ${name}" and no "<${name}" tag found anywhere under frameworks/`);
    console.error('\nThe component or its registered prop was renamed or removed. Update or');
    console.error('remove the PASSTHROUGH entry.');
  }
  if (found.length) {
    failed = true;
    if (stale.length || stalePT.length) console.error('');
    console.error(`check-dimension-literals: ${found.length} bare literal(s) under frameworks/\n`);
    for (const f of found) console.error(`  ${f.file}: ${f.prop}: ${f.raw} — ${f.reason}`);
    console.error('\nA dimension is a token or a derivation of tokens. Use var(--token), or');
    console.error('calc() over one where the scale is numeric. If neither fits, the token is');
    console.error('what is missing — add it to contracts/design/ first.');
  }
  if (failed) process.exit(1);
  console.log('check-dimension-literals: no bare literals under frameworks/, no stale exemptions');
}

if (isMainModule(import.meta.url)) main();
