/* Nothing the contracts package carries binds it to a browser. The split that makes the records
 * tell the truth is between a VALUE and its PROSE: a construct in a value is executed by whoever
 * reads it, and one in a `description` is a sentence a person reads. BROWSER_BOUND over values
 * admits no exception; over prose WEB_PROSE exempts one description at a time with its reason, and
 * a new or a stale entry fails. WEB_SHAPED is the opposite record, W3C vocabulary carried on
 * purpose. COMPUTED records the members the render reads, with the function that reads them. The walk is over the tree's own contract set, so it has a subject on a fresh clone. */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { expectedCarried } from './check-contracts-package.ts';
import { axesOf, readFamilies } from '../../lib/tailwind/vocabulary.ts';
import { readJson } from '../../utils/read-file.ts';
import { COMPAT_ALIASES } from '../../generate/core/arena-cli/audit.ts';
import type { ContractCandidate, TypeContract } from '../../lib/arena/contract-shapes.ts';

export const node = {
  name: 'check:contracts-neutrality',
  reads: [
    'contracts/design/*.json', 'contracts/api/components/*.json', 'contracts/api/types/*.json',
    'contracts/behaviour/*.json',
  ],
  writes: [],
  feeds: [],
};

export const PROSE_KEYS = new Set(['description', '$description', 'reason', 'why']);

export const BROWSER_BOUND = new Map([
  ['color-mix(', 'a CSS function. The values it composes are carried; the composition is the web target\'s own'],
  ['env(', 'a value only a browser resolves, and the device geometry it reports is a platform API elsewhere'],
  ['calc(', 'CSS arithmetic. A carried value is a number and a unit, and the arithmetic belongs to whoever draws'],
  ['var(--', 'a custom-property read, which is the web emission of a value rather than the value'],
  ['@media', 'a CSS at-rule, and Arena measures a container rather than a viewport in any case'],
  ['@font-face', 'the web\'s font-loading mechanism; a font is a resource on a native platform'],
  ['!important', 'a cascade instruction, and there is no cascade off the web'],
  ['window.inner', 'a DOM measurement'],
  ['getComputedStyle', 'a DOM read'],
  ['querySelector', 'a DOM read'],
]);

export const WEB_PROSE = new Map([
  ['contracts/design/spacing.json:sp.4',
   'it says which measurement produced the step, and the measurement was taken in a browser. The '
   + 'step is 16px on every platform and the sentence is how it was arrived at'],
  ['contracts/design/spacing.json:layout.bar',
   'it tells a web consumer to add the inset to the height rather than into it. The rule is the '
   + 'general one and the spelling is the web\'s; a native shell adds its own inset the same way'],
  ['contracts/design/chart.json:chart.tooltip-offset',
   'it explains why the value is a script-readable number rather than a length, and the explanation '
   + 'is about what the web target does with it'],
  ['contracts/design/component.json:calendar.gutter-w',
   'it records that this token replaced an inline CSS expression, which is why it exists at all. '
   + 'Deleting the sentence would leave a value with no argument behind it'],
  ['contracts/design/component.json:onboarding.width',
   'the same, and it also names the JS comparison the value is script-readable for'],
  ['contracts/design/component.json:onboarding.height-reserve',
   'the same comparison, on the other axis'],
  ['contracts/design/effects.json:tint',
   'it says why a ratio is a number carrying a render hint rather than a dimension, which is a '
   + 'statement about DTCG and reaches every target'],
]);

export const WEB_SHAPED = new Map([
  ['aria-', 'the attribute names WAI-ARIA published. A behaviour requirement names the state a target '
    + 'must expose, and every platform accessibility API has a counterpart it maps to'],
  ['element', 'the role a pattern requires, named as a field. It is what Modifier.semantics takes on '
    + 'Compose and what an accessibility trait takes on SwiftUI, so it is mapped rather than dropped'],
  ['affordances', 'hover, focus and press are what a component\'s own render reacts to. A platform '
    + 'without one of the three declares that it has none, rather than the contract dropping the word'],
  ['ph-', 'the Phosphor glyph names. The icon set is a coupling Arena states in its adoption contract, '
    + 'and a target resolves the same name against the same set in its own font or asset pipeline'],
]);

export type Strand = { rel: string; path: string; text: string; prose: boolean };

export function strands(rel: string, tree: unknown): Strand[] {
  const out: Strand[] = [];
  const walk = (node: unknown, path: string[], prose: boolean) => {
    if (typeof node === 'string') return void out.push({ rel, path: path.join('.'), text: node, prose });
    if (Array.isArray(node)) return void node.forEach((child, i) => walk(child, [...path, String(i)], prose));
    if (node === null || typeof node !== 'object') return;
    for (const [key, child] of Object.entries(node)) {
      walk(child, [...path, key], prose || PROSE_KEYS.has(key));
    }
  };
  walk(tree, [], false);
  return out;
}

export function payload(repo = root, files = expectedCarried(repo)) {
  return files.flatMap((rel) => strands(rel, JSON.parse(readFileSync(join(repo, rel), 'utf8'))));
}

export function tokenPath(strand: Strand) {
  const parts = strand.path.split('.').filter((p) => !PROSE_KEYS.has(p));
  return `${strand.rel}:${parts.join('.') || '(root)'}`;
}

export function memberPath(strand: Strand) {
  return tokenPath(strand).replace(/\.(default|type|of|payload)$/, '');
}

export function valueProblems(all: Strand[], bound = BROWSER_BOUND) {
  const problems: string[] = [];
  for (const strand of all.filter((s) => !s.prose)) {
    const terms = [...bound.keys()].filter((term) => strand.text.includes(term));
    if (terms.length === 0) continue;
    problems.push(`${tokenPath(strand)} has a value carrying ${terms.map((x) => `"${x}"`).join(', ')}, `
      + `which a target off the web cannot execute: ${bound.get(terms[0] as string)}`);
  }
  return problems;
}

export function proseProblems(all: Strand[], bound = BROWSER_BOUND, exempt = WEB_PROSE) {
  const problems: string[] = [];
  const matched = new Set<string>();
  for (const strand of all.filter((s) => s.prose)) {
    const terms = [...bound.keys()].filter((term) => strand.text.includes(term));
    if (terms.length === 0) continue;
    const at = tokenPath(strand);
    matched.add(at);
    if (exempt.has(at)) continue;
    problems.push(`${at} explains itself in web idiom (${terms.join(', ')}) and WEB_PROSE does not `
      + 'name it. A description reaches every target; either say it platform-neutrally, or record the '
      + 'entry with the reason the web spelling is what the sentence is about');
  }
  for (const at of exempt.keys()) {
    if (!matched.has(at)) {
      problems.push(`WEB_PROSE names ${at} and its description no longer speaks web idiom, so the `
        + 'entry outlived its reason');
    }
  }
  return problems;
}

export function aliasProseProblems(all: Strand[], aliases: readonly string[] = COMPAT_ALIASES) {
  const problems: string[] = [];
  for (const strand of all.filter((s) => s.prose && s.rel.startsWith('contracts/api/'))) {
    for (const alias of aliases) {
      if (new RegExp(`(?<![A-Za-z0-9-])--${alias}(?![A-Za-z0-9-])`).test(strand.text)) {
        problems.push(`${tokenPath(strand)} names --${alias}, a compatibility alias. A description says what is `
          + 'drawn in roles (the body ink, the danger hue\'s edge), never in a name the skin may rename');
      }
    }
  }
  return problems;
}

export function zeroAliasProseProblems(all: Strand[]) {
  const scanned = all.filter((s) => s.prose && s.rel.startsWith('contracts/api/')).length;
  return scanned > 0 ? [] : ['0 description(s) under contracts/api were scanned for a compatibility alias, '
    + 'which is a failure rather than a clean pass'];
}

export function staleShapedProblems(all: Strand[], shaped = WEB_SHAPED) {
  const joined = all.map((s) => `${s.path} ${s.text}`).join('\n');
  return [...shaped.keys()]
    .filter((term) => !joined.includes(term))
    .map((term) => `WEB_SHAPED exempts "${term}" and the payload no longer contains it, so the `
      + 'exemption outlived what it exempts; drop the entry rather than leaving a reason nothing rests on');
}

export function zeroWalkProblems(files: number, strandCount: number, shaped: number) {
  const problems: string[] = [];
  if (files === 0) {
    problems.push('walked 0 carried files, so every term below was searched for in nothing; a walk '
      + 'that finds no payload is a failure rather than a clean pass');
  }
  if (strandCount === 0) {
    problems.push('read 0 strings out of the payload, so the value half and the prose half both '
      + 'reported clean over nothing');
  }
  if (shaped === 0) {
    problems.push('WEB_SHAPED is empty, so this gate makes no claim about what web vocabulary '
      + 'survives on purpose; a record with no entries is retired rather than left to pass over nothing');
  }
  return problems;
}

const at = (component: string, member: string) => `contracts/api/components/${component}.json:api.${member}`;
const field = (type: string, member: string) => `contracts/api/types/${type}.json:fields.${member}`;

export const COMPUTED = new Map<string, { reads: string; why: string }>([
  [at('ArenaBarChart', 'stack'), {
    reads: 'frameworks/react/components/charts/arena-bar-chart/ArenaBarChart.tsx:ArenaBarChart(props)',
    why: 'the render stacks the bars with arenaStackSegments, and the axis is sized from the stacked sums',
  }],
  [at('ArenaHorizontalBarChart', 'stack'), {
    reads: 'frameworks/react/components/charts/arena-horizontal-bar-chart/ArenaHorizontalBarChart.tsx:ArenaHorizontalBarChart(props)',
    why: 'the render stacks the bars with arenaStackSegments, and the axis is sized from the stacked sums',
  }],
  [at('ArenaScatterChart', 'sizeLegend'), {
    reads: 'frameworks/react/components/charts/arena-scatter-chart/ArenaScatterChart.tsx:ArenaScatterChart(props)',
    why: 'the render reserves, through arenaLegendStrip, the size key\'s strip and draws it from the data',
  }],
  [at('ArenaTextarea', 'autoResize'), {
    reads: 'frameworks/react/components/forms/arena-textarea/ArenaTextarea.tsx:ArenaTextarea(props)',
    why: 'the render measures the content with arenaFitToContent and sets the height',
  }],
  [field('arena-table-column', 'mobileLayout'), {
    reads: 'frameworks/angular/components/display/arena-table-cell/ArenaTableCell.ts:blocked()',
    why: 'the render chooses the card cell\'s structure and whether its label renders',
  }],
  [at('ArenaProgressBar', 'shape'), {
    reads: 'frameworks/angular/components/feedback/arena-progress-bar/ArenaProgressBar.ts:radial()',
    why: 'the render draws a different tree for a ring: an SVG track and arc whose offset is the percentage',
  }],
  [at('ArenaMenu', 'align'), {
    reads: 'frameworks/angular/components/navigation/arena-menu/ArenaMenu.ts:attach()',
    why: 'the render positions the panel from it, choosing the connected positions that line the panel up with that edge of the trigger',
  }],
  [at('ArenaTextarea', 'rows'), {
    reads: 'frameworks/react/components/forms/arena-textarea/ArenaTextarea.tsx:ArenaTextarea(props)',
    why: 'the native control lays its initial height out from it, and that height is the floor the field grows from',
  }],
  [at('ArenaLineChart', 'area'), {
    reads: 'frameworks/react/components/charts/arena-line-chart/ArenaLineChart.tsx:ArenaLineChart(props)',
    why: 'the render draws, through arenaLineAreaPath, an area path under the line, closed down to the baseline',
  }],
  [at('ArenaRadarChart', 'fill'), {
    reads: 'frameworks/react/components/charts/arena-radar-chart/ArenaRadarChart.tsx:ArenaRadarChart(props)',
    why: 'the render draws, through arenaAreaFill, a filled polygon per series in a tint of the series colour',
  }],
  [at('ArenaDoughnutChart', 'shape'), {
    reads: 'frameworks/react/components/charts/arena-doughnut-chart/ArenaDoughnutChart.tsx:ArenaDoughnutChart(props)',
    why: 'the render computes, through arenaDoughnutRadii, the inner radius from it, and the accessible name and the centre figure follow',
  }],
  [at('ArenaDoughnutChart', 'legendLayout'), {
    reads: 'frameworks/react/components/charts/arena-doughnut-chart/ArenaDoughnutChart.tsx:ArenaDoughnutChart(props)',
    why: 'the render decides, through arenaLegendStacked, from it and the measured width whether each legend row stacks',
  }],
  [at('ArenaDialog', 'fillBelow'), {
    reads: 'frameworks/react/components/feedback/arena-dialog/ArenaDialog.tsx:DialogFrame(props)',
    why: 'the render compares the measured container with the breakpoint it names and fills the viewport below it',
  }],
  [at('ArenaBadge', 'dot'), {
    reads: 'frameworks/react/components/display/arena-badge/ArenaBadge.tsx:ArenaBadge(props)',
    why: 'the render adds the dot element only when it is set',
  }],
]);

export const NOT_GEOMETRY = new Map<string, string>([
  [at('ArenaInput', 'min'), 'the lower bound of the value a number or date input accepts, which the browser validates'],
  [at('ArenaInput', 'max'), 'the upper bound of the value a number or date input accepts, which the browser validates'],
]);

export function resolvesMember(key: string, repo = root) {
  const [rel = '', path = ''] = key.split(':');
  const [section = '', member = ''] = path.split('.');
  try {
    const json = JSON.parse(readFileSync(join(repo, rel), 'utf8'));
    return Boolean(json?.[section]?.[member]);
  } catch {
    return false;
  }
}

const REGEX_AFTER = /[(,=:[!&|?{};]/;

function literalEnd(text: string, i: number): number {
  const c = text[i];
  if (c === '/' && text[i + 1] === '/') { const n = text.indexOf('\n', i); return n < 0 ? text.length : n; }
  if (c === '/' && text[i + 1] === '*') { const n = text.indexOf('*/', i + 2); return n < 0 ? text.length : n + 2; }
  if (c === '"' || c === "'") {
    for (let j = i + 1; j < text.length && text[j] !== '\n'; j++) {
      if (text[j] === '\\') j++;
      else if (text[j] === c) return j + 1;
    }
    return i;
  }
  if (c === '`') {
    for (let j = i + 1; j < text.length; j++) {
      if (text[j] === '\\') j++;
      else if (text[j] === '`') return j + 1;
      else if (text[j] === '$' && text[j + 1] === '{') j = closeOf(text, j + 1) - 1;
    }
    return text.length;
  }
  if (c === '/') {
    const before = text.slice(0, i).trimEnd().slice(-1);
    if (before !== '' && !REGEX_AFTER.test(before)) return i;
    for (let j = i + 1, inClass = false; j < text.length && text[j] !== '\n'; j++) {
      if (text[j] === '\\') j++;
      else if (text[j] === '[') inClass = true;
      else if (text[j] === ']') inClass = false;
      else if (text[j] === '/' && !inClass) return j + 1;
    }
  }
  return i;
}

function closeOf(text: string, open: number): number {
  const opener = text[open] ?? '{';
  const closer = opener === '(' ? ')' : '}';
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const end = literalEnd(text, i);
    if (end > i) { i = end - 1; continue; }
    if (text[i] === opener) depth++;
    else if (text[i] === closer && --depth === 0) return i + 1;
  }
  return text.length;
}

export function functionBody(text: string, name: string): string | undefined {
  const id = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const forms = [
    new RegExp(`^[ \\t]*(?:export\\s+)?(?:default\\s+)?(?:async\\s+)?function\\s*\\*?\\s*${id}\\s*(?:<[^>(]*>)?\\(`, 'gm'),
    new RegExp(`^[ \\t]*(?:export\\s+)?(?:const|let|var)\\s+${id}\\b[^=\\n]*=\\s*(?:async\\s*)?(?:<[^>(]*>\\s*)?\\(`, 'gm'),
    new RegExp(`^[ \\t]*(?:(?:public|private|protected|static|async|readonly|override)\\s+)*${id}\\s*(?:<[^>(]*>)?\\(`, 'gm'),
  ];
  const initializer = new RegExp(`^[ \\t]*(?:(?:export|public|private|protected|static|readonly|override|const|let|var)\\s+)*${id}\\b[^=\\n(]*=(?!=|>)\\s*`, 'gm');
  for (const [kind, form] of forms.entries()) {
    for (const match of text.matchAll(form)) {
      const paramsEnd = closeOf(text, match.index + match[0].length - 1);
      let at = paramsEnd;
      for (; at < text.length; at++) {
        if (text[at] === '{' || text[at] === ';' || text.startsWith('=>', at)) break;
        if (text[at] === '\n' && kind === 2) break;
      }
      if (text[at] === '{') return text.slice(at, closeOf(text, at));
      if (kind === 1 && text.startsWith('=>', at)) {
        let from = at + 2;
        while (/\s/.test(text[from] ?? '')) from++;
        if (text[from] === '{') return text.slice(from, closeOf(text, from));
        let end = from;
        for (let depth = 0; end < text.length; end++) {
          const skipped = literalEnd(text, end);
          if (skipped > end) { end = skipped - 1; continue; }
          if ('({['.includes(text[end] ?? '')) depth++;
          else if (')}]'.includes(text[end] ?? '')) { if (depth-- === 0) break; }
          else if (text[end] === ';' && depth === 0) break;
        }
        return text.slice(from, end);
      }
    }
  }
  for (const match of text.matchAll(initializer)) {
    const from = match.index + match[0].length;
    let end = from;
    for (let depth = 0; end < text.length; end++) {
      const skipped = literalEnd(text, end);
      if (skipped > end) { end = skipped - 1; continue; }
      if ('({['.includes(text[end] ?? '')) depth++;
      else if (')}]'.includes(text[end] ?? '')) { if (depth-- === 0) break; }
      else if (text[end] === ';' && depth === 0) break;
    }
    return text.slice(from, end);
  }
  return undefined;
}

export function computedProblems(resolves: (key: string) => boolean = resolvesMember, entries = COMPUTED, repo = root) {
  if (entries.size === 0) {
    return ['COMPUTED is empty, so no member is recorded with the function that reads it; a record with no '
      + 'entries is retired rather than left to pass over nothing'];
  }
  const problems: string[] = [];
  for (const [key, { reads, why }] of entries) {
    if (!resolves(key)) {
      problems.push(`COMPUTED names ${key} and no contract declares it, so the entry outlived the member (${why})`);
      continue;
    }
    const [file = '', call = ''] = reads.split(':');
    const name = call.split('(')[0] ?? '';
    const member = key.split('.').pop() ?? '';
    let text: string | undefined;
    try { text = readFileSync(join(repo, file), 'utf8'); } catch { text = undefined; }
    if (text === undefined) {
      problems.push(`COMPUTED: ${key} reads ${reads} and ${file} does not exist`);
      continue;
    }
    const body = name ? functionBody(text, name) : undefined;
    if (body === undefined) {
      problems.push(`COMPUTED: ${key} reads ${reads} and ${file} does not contain ${name || 'a function name'}`);
    } else if (!new RegExp(`\\b${member}\\b`).test(body)) {
      problems.push(`COMPUTED: ${key} reads ${reads} and the body of ${name} does not read ${member}, so the entry `
        + 'cites a function that does not compute the member');
    }
  }
  return problems;
}

const CSS_LENGTH = /^-?\d*\.?\d+(px|rem|em|%|ch|vh|vw|vmin|vmax|fr)$/;
const CSS_RATIO = /^\d+\s*\/\s*\d+$/;

export function axisNames(families: Map<string, { axis?: string | string[] }>): Set<string> {
  const out = new Set<string>();
  for (const family of families.values())
    for (const axis of axesOf(family)) {
      const last = axis.replace(/^--arena-/, '').split('-').pop();
      if (last) out.add(last);
    }
  return out;
}

export function cssLengthProblems(contracts: Map<string, ContractCandidate>, types: Map<string, TypeContract>,
  families: Map<string, { axis?: string | string[] }>, computed = COMPUTED, notGeometry = NOT_GEOMETRY) {
  const names = axisNames(families);
  if (names.size === 0) {
    return ['cssLengthProblems derived 0 axis names from the families, so no member name was compared; an '
      + 'empty axis set is a failure rather than a clean pass'];
  }
  const problems: string[] = [];
  const matched = new Set<string>();
  const check = (key: string, spec: { form?: string; type?: string; default?: unknown; examples?: unknown }, name: string) => {
    if (spec.form !== 'primitive' || spec.type !== 'string' || computed.has(key)) return;
    const samples = [spec.default, ...(Array.isArray(spec.examples) ? spec.examples : [])]
      .filter((v): v is string => typeof v === 'string');
    const length = samples.find((v) => CSS_LENGTH.test(v.trim()) || CSS_RATIO.test(v.trim()));
    if (names.has(name) && notGeometry.has(key)) matched.add(key);
    const way = 'a length is a token or a class, not a member. Write the class, or record the member in COMPUTED with the function that reads it';
    if (length !== undefined) problems.push(`${key} is a string carrying the CSS length ${JSON.stringify(length)}: ${way}`);
    else if (names.has(name) && !notGeometry.has(key)) problems.push(`${key} is a string named for the axis ${name}, which a family ships: ${way}`);
  };
  for (const [component, contract] of contracts)
    for (const [member, spec] of Object.entries(contract.api ?? {})) check(at(component, member), spec, member);
  for (const type of types.values())
    for (const [member, spec] of Object.entries(type.fields ?? {})) check(field(kebab(type.name), member), spec, member);
  for (const key of notGeometry.keys()) {
    if (!matched.has(key)) {
      problems.push(`NOT_GEOMETRY names ${key} and no string member of that name is matched by an axis name, so the `
        + 'entry outlived the member or the match');
    }
  }
  return problems;
}

export function familyOptions(repo = root): Map<string, string> {
  const out = new Map<string, string>();
  for (const family of readFamilies(repo).values())
    for (const option of Object.keys(family.variants)) out.set(option, family.family);
  return out;
}

const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

export function optionShapeProblems(contracts: Map<string, ContractCandidate>, types: Map<string, TypeContract>,
  options: Map<string, string> = familyOptions(), computed = COMPUTED) {
  if (options.size === 0) {
    return ['optionShapeProblems read 0 family options, so every enum passed over nothing; an empty '
      + 'option set is a failure rather than a clean pass'];
  }
  const problems: string[] = [];
  const check = (key: string, typeName: string | undefined) => {
    const type = typeName === undefined ? undefined : types.get(typeName);
    if (type === undefined || computed.has(key)) return;
    const values = type.values ?? [];
    const byFamily = new Map<string, { value: string; option: string }[]>();
    for (const value of values) {
      for (const [option, family] of options) {
        if (option !== `arena-${family}-${value}`) continue;
        byFamily.set(family, [...(byFamily.get(family) ?? []), { value: String(value), option }]);
      }
    }
    const way = 'appearance is a class, not a member. Write the class, or record the member in COMPUTED with the function that reads it';
    for (const [family, hits] of byFamily) {
      if (hits.length >= 2) {
        problems.push(`${key} is an enum whose values ${hits.map((h) => h.value).join(', ')} are options of ${family}: ${way}`);
      } else if (values.length === 1 && hits[0]) {
        problems.push(`${key} is an enum whose value ${hits[0].value} is the option ${hits[0].option}: ${way}`);
      }
    }
  };
  for (const [name, contract] of contracts)
    for (const [member, spec] of Object.entries(contract.api ?? {}))
      if (spec.form === 'enum') check(at(name, member), spec.type);
  for (const type of types.values())
    for (const [member, spec] of Object.entries(type.fields ?? {}))
      if (spec.form === 'enum') check(field(kebab(type.name), member), spec.type);
  return problems;
}

function readDir<T>(dir: string): Map<string, T> {
  const out = new Map<string, T>();
  if (!existsSync(dir)) return out;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const json = readJson(join(dir, file)) as T & { component?: string; name?: string };
    out.set(json.component ?? json.name ?? file, json);
  }
  return out;
}

export function collect(repo = root) {
  const files = expectedCarried(repo);
  const all = payload(repo, files);
  return {
    files,
    all,
    problems: [
      ...zeroWalkProblems(files.length, all.length, WEB_SHAPED.size),
      ...valueProblems(all),
      ...proseProblems(all),
      ...zeroAliasProseProblems(all),
      ...aliasProseProblems(all),
      ...staleShapedProblems(all),
      ...computedProblems(),
      ...optionShapeProblems(readDir<ContractCandidate>(join(repo, 'contracts/api/components')),
        readDir<TypeContract>(join(repo, 'contracts/api/types')), familyOptions(repo)),
      ...cssLengthProblems(readDir<ContractCandidate>(join(repo, 'contracts/api/components')),
        readDir<TypeContract>(join(repo, 'contracts/api/types')), readFamilies(repo)),
    ],
  };
}

function main() {
  const { files, all, problems } = collect();
  if (problems.length) {
    console.error(`check-contracts-neutrality: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  const values = all.filter((s) => !s.prose).length;
  console.log(`check-contracts-neutrality: ${values} value(s) across ${files.length} carried file(s) `
    + `execute none of ${BROWSER_BOUND.size} browser-bound construct(s); ${WEB_PROSE.size} `
    + `description(s) speak web idiom on the record, and all ${WEB_SHAPED.size} web-published `
    + 'term(s) the payload carries on purpose are still in it');
}

if (isMainModule(import.meta.url)) main();
