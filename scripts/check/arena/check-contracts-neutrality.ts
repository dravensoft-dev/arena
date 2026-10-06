/* Nothing the contracts package carries binds it to a browser. The split that makes the records
 * tell the truth is between a VALUE and its PROSE: a construct in a value is executed by whoever
 * reads it, and one in a `description` is a sentence a person reads. BROWSER_BOUND over values
 * admits no exception; over prose WEB_PROSE exempts one description at a time with its reason, and
 * a new or a stale entry fails. WEB_SHAPED is the opposite record, W3C vocabulary carried on
 * purpose. DESIGN_MEMBERS is the debt the vocabulary still has to take over: each member deciding
 * appearance, with the phase that moves it, so the remainder is a map that shrinks and a stale
 * entry fails. COMPUTED records the members the render reads, with the function that reads them. The walk is over the tree's own contract set, so it has a subject on a fresh clone. */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { expectedCarried } from './check-contracts-package.ts';
import { readFamilies } from '../../lib/tailwind/vocabulary.ts';
import { readJson } from '../../utils/read-file.ts';
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

export const CSS_VALUED = new Map([
  ['contracts/api/components/ArenaBoard.json:api.minColumn', 'the narrowest a column may be'],
  ['contracts/api/components/ArenaDialog.json:api.width', 'the panel width'],
  ['contracts/api/components/ArenaFigure.json:api.ratio', 'the frame\'s aspect ratio'],
  ['contracts/api/components/ArenaGrid.json:api.min', 'the narrowest a cell may be'],
  ['contracts/api/components/ArenaScroller.json:api.itemWidth', 'how wide each item is laid out'],
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

export function valueProblems(all: Strand[], bound = BROWSER_BOUND, cssValued = CSS_VALUED) {
  const problems: string[] = [];
  const matched = new Set<string>();
  for (const strand of all.filter((s) => !s.prose)) {
    const terms = [...bound.keys()].filter((term) => strand.text.includes(term));
    if (terms.length === 0) continue;
    const member = memberPath(strand);
    matched.add(member);
    if (cssValued.has(member)) continue;
    problems.push(`${tokenPath(strand)} has a value carrying ${terms.map((x) => `"${x}"`).join(', ')}, `
      + `which a target off the web cannot execute: ${bound.get(terms[0] as string)}`);
  }
  for (const member of cssValued.keys()) {
    if (!matched.has(member)) {
      problems.push(`CSS_VALUED names ${member} and no value under it is a CSS expression any more, `
        + 'so the entry outlived the debt it records; drop it');
    }
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

export function staleShapedProblems(all: Strand[], shaped = WEB_SHAPED) {
  const joined = all.map((s) => `${s.path} ${s.text}`).join('\n');
  return [...shaped.keys()]
    .filter((term) => !joined.includes(term))
    .map((term) => `WEB_SHAPED exempts "${term}" and the payload no longer contains it, so the `
      + 'exemption outlived what it exempts; drop the entry rather than leaving a reason nothing rests on');
}

export function zeroRecordProblems(recorded: number) {
  if (recorded > 0) return [];
  return ['CSS_VALUED is empty. If the five members that take a CSS length have been reshaped into '
    + 'neutral ones, this record and the paragraph in contracts/api/AGENTS.md that cites it both go '
    + 'with them; an empty map left behind is a claim nobody is making'];
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

export type Pending = { phase: 5 | 6; why: string };

const EDITORIAL = 'it decides appearance per instance, so it becomes an option of a family';
const EDITORIAL_VALUES = 'its meaning values write the hue channels, and its editorial values become an option of a family';
const GEOMETRY = 'geometry only interpolated into CSS, so it becomes named steps and one public property';

const at = (component: string, member: string) => `contracts/api/components/${component}.json:api.${member}`;
const field = (type: string, member: string) => `contracts/api/types/${type}.json:fields.${member}`;

export const COMPUTED = new Map<string, { reads: string; why: string }>([
  [at('ArenaBarChart', 'stack'), {
    reads: 'frameworks/react/components/charts/ChartSeries.ts:arenaStackSegments(series, index)',
    why: 'the render stacks the bars, and the axis is sized from the stacked sums',
  }],
  [at('ArenaHorizontalBarChart', 'stack'), {
    reads: 'frameworks/react/components/charts/ChartSeries.ts:arenaStackSegments(series, index)',
    why: 'the render stacks the bars, and the axis is sized from the stacked sums',
  }],
  [at('ArenaScatterChart', 'sizeLegend'), {
    reads: 'frameworks/react/components/charts/ChartLegend.ts:arenaLegendStrip(height, seriesCount, sizeKey)',
    why: 'the render reserves the size key\'s strip and draws it from the data',
  }],
  [at('ArenaTextarea', 'autoResize'), {
    reads: 'frameworks/react/components/forms/arena-textarea/ArenaTextarea.tsx:arenaFitToContent(element)',
    why: 'the render measures the content and sets the height',
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
    reads: 'frameworks/react/components/charts/ChartMarks.ts:arenaLineAreaPath(points, baseline)',
    why: 'the render draws an area path under the line, closed down to the baseline',
  }],
  [at('ArenaRadarChart', 'fill'), {
    reads: 'frameworks/react/DataVisuals.ts:arenaAreaFill(colour)',
    why: 'the render draws a filled polygon per series in a tint of the series colour',
  }],
  [at('ArenaDoughnutChart', 'shape'), {
    reads: 'frameworks/react/components/charts/ChartAxis.ts:arenaDoughnutRadii(plotWidth, height, shape)',
    why: 'the render computes the inner radius from it, and the accessible name and the centre figure follow',
  }],
  [at('ArenaDoughnutChart', 'legendLayout'), {
    reads: 'frameworks/react/components/charts/ChartLegend.ts:arenaLegendStacked(layout, width)',
    why: 'the render decides from it and the measured width whether each legend row stacks',
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

export const DESIGN_MEMBERS = new Map<string, Pending>([
  ...[['ArenaButton', 'variant'], ['ArenaSheet', 'placement'], ['ArenaToastHost', 'placement'],
  ].map(([c, m]) => [at(c!, m!), { phase: 5, why: EDITORIAL }] as [string, Pending]),
  ...[['ArenaProgressBar', 'tone'], ['ArenaToast', 'tone'], ['ArenaBadge', 'tone'], ['ArenaStatCard', 'tone'],
    ['ArenaTag', 'tone'],
  ].map(([c, m]) => [at(c!, m!), { phase: 5, why: EDITORIAL_VALUES }] as [string, Pending]),
  [field('arena-activity-item', 'tone'), { phase: 5, why: EDITORIAL_VALUES }],
  ...[['ArenaIconButton', 'variant'], ['ArenaCard', 'accent'], ['ArenaCard', 'floating'],
    ['ArenaHero', 'align'], ['ArenaPageHead', 'align'], ['ArenaHero', 'layout'],
    ['ArenaSpinner', 'tone'], ['ArenaSideNav', 'indentStep'],
  ].map(([c, m]) => [at(c!, m!), { phase: 5, why: EDITORIAL }] as [string, Pending]),
  ...[['ArenaGrid', 'min'], ['ArenaGrid', 'maxWidth'], ['ArenaGrid', 'gap'], ['ArenaBoard', 'minColumn'],
    ['ArenaScroller', 'itemWidth'], ['ArenaDialog', 'width'], ['ArenaFigure', 'ratio'], ['ArenaSkeleton', 'width'],
    ['ArenaSkeleton', 'height'], ['ArenaSkeleton', 'radius'], ['ArenaSkeleton', 'variant'], ['ArenaSection', 'rhythm'],
  ].map(([c, m]) => [at(c!, m!), { phase: 6, why: GEOMETRY }] as [string, Pending]),
  [field('arena-table-column', 'width'), { phase: 6, why: GEOMETRY }],
  [field('arena-table-column', 'align'), { phase: 6, why: GEOMETRY }],
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

export function designMemberProblems(resolves: (key: string) => boolean = resolvesMember, members = DESIGN_MEMBERS) {
  const problems: string[] = [];
  for (const [key, { phase, why }] of members) {
    if (![5, 6].includes(phase)) problems.push(`DESIGN_MEMBERS: ${key} is owned by phase ${phase}, and only phases 5 and 6 are still to run`);
    if (!resolves(key)) problems.push(`DESIGN_MEMBERS names ${key} and no contract declares it, so the debt it records is paid: drop the entry (${why})`);
  }
  return problems;
}

export function overlapProblems(computed = COMPUTED, members = DESIGN_MEMBERS) {
  return [...computed.keys()].filter((key) => members.has(key))
    .map((key) => `${key} is in COMPUTED and in DESIGN_MEMBERS: a member is recorded once`);
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
    let text: string | undefined;
    try { text = readFileSync(join(repo, file), 'utf8'); } catch { text = undefined; }
    if (text === undefined) {
      problems.push(`COMPUTED: ${key} reads ${reads} and ${file} does not exist`);
    } else if (!name || !text.includes(name)) {
      problems.push(`COMPUTED: ${key} reads ${reads} and ${file} does not contain ${name || 'a function name'}`);
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
  options: Map<string, string> = familyOptions(), computed = COMPUTED, members = DESIGN_MEMBERS) {
  if (options.size === 0) {
    return ['optionShapeProblems read 0 family options, so every enum passed over nothing; an empty '
      + 'option set is a failure rather than a clean pass'];
  }
  const problems: string[] = [];
  const check = (key: string, typeName: string | undefined) => {
    const type = typeName === undefined ? undefined : types.get(typeName);
    if (type === undefined || computed.has(key) || members.has(key)) return;
    for (const value of type.values ?? []) {
      for (const [option, family] of options) {
        if (option !== `arena-${family}-${value}`) continue;
        problems.push(`${key} is an enum whose value ${value} is the option ${option}: appearance is a class, not a member. `
          + 'Write the class, or record the member in COMPUTED with the function that reads it');
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
      ...zeroRecordProblems(CSS_VALUED.size),
      ...proseProblems(all),
      ...staleShapedProblems(all),
      ...designMemberProblems(),
      ...computedProblems(),
      ...overlapProblems(),
      ...optionShapeProblems(readDir<ContractCandidate>(join(repo, 'contracts/api/components')),
        readDir<TypeContract>(join(repo, 'contracts/api/types')), familyOptions(repo)),
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
    + `execute none of ${BROWSER_BOUND.size} browser-bound construct(s) bar ${CSS_VALUED.size} `
    + `member(s) on the record; ${WEB_PROSE.size} `
    + `description(s) speak web idiom on the record, and all ${WEB_SHAPED.size} web-published `
    + 'term(s) the payload carries on purpose are still in it');
}

if (isMainModule(import.meta.url)) main();
