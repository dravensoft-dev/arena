/* A responsive component measures one element and picks a branch from its width. When the branch
 * it picks moves that element's outer box, the width depends on the answer, and at the threshold
 * each branch selects the other on every frame. The helpers read the border box, so padding and a
 * border are invisible to them. What is left is an inline margin, a width, an inline or boxless
 * display and an out-of-flow position, and this refuses each of those on a measured slot in a
 * branch its width decides. MEASURED names every component that calls a container helper: a
 * caller it does not name fails, and so does an entry naming a component, a slot or a variant
 * group that is not there. Which element the component actually hands its observer is asserted by
 * each layer's MeasuredBox suite, because only a mount can answer it. */

import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import type { ComponentManifest } from '../../lib/tailwind/manifest-shapes.ts';

export const node = {
  name: 'check:measured-box',
  reads: [
    'frameworks/react/components/**/*.tsx', '!frameworks/react/components/**/*.generated.tsx',
    '!frameworks/react/components/**/*.test.tsx',
    'frameworks/angular/components/**/*.ts', '!frameworks/angular/components/**/*.generated.ts',
    '!frameworks/angular/components/**/*.test.ts',
    'frameworks/tailwind/components/**/*.manifest.json',
  ],
  writes: [],
  feeds: [],
};

export type Measured = { readonly slot: string | null; readonly decides: readonly string[]; readonly why: string };

const CHART = 'the chart measures a wrapper of its own template, styled inline and by no manifest, and its '
  + 'width sizes the plot rather than choosing a branch of any slot';

export const MEASURED = new Map<string, Measured>([
  ['ArenaTable', { slot: 'root', decides: ['narrow'],
    why: 'the root is the box the table fills, and below --bp-md it draws cards instead of the grid' }],
  ['ArenaBulkActionBar', { slot: 'root', decides: ['narrow'],
    why: 'the root is the bar, and below --bp-sm, when layout is auto, it stacks its actions' }],
  ['ArenaPageHead', { slot: 'root', decides: ['narrow'],
    why: 'the root holds the titles and the actions, and below --bp-sm it stacks them' }],
  ['ArenaCalendar', { slot: 'root', decides: [],
    why: 'the width picks the view and the slot size, and neither is a variant of the root' }],
  ['ArenaDialog', { slot: 'scrim', decides: ['fill'],
    why: 'the scrim is fixed over the viewport, and below fillBelow the panel fills it' }],
  ['ArenaBarChart', { slot: null, decides: [], why: CHART }],
  ['ArenaDoughnutChart', { slot: null, decides: [], why: CHART }],
  ['ArenaHorizontalBarChart', { slot: null, decides: [], why: CHART }],
  ['ArenaLineChart', { slot: null, decides: [], why: CHART }],
  ['ArenaPyramidChart', { slot: null, decides: [], why: CHART }],
  ['ArenaRadarChart', { slot: null, decides: [], why: CHART }],
  ['ArenaScatterChart', { slot: null, decides: [], why: CHART }],
]);

const CALLS = /\b(?:useArenaContainerWidth|arenaContainerWidth)\s*\(/;

export const LAYERS = [
  { dir: 'frameworks/react/components', extension: '.tsx' },
  { dir: 'frameworks/angular/components', extension: '.ts' },
] as const;

const isSource = (path: string, extension: string) =>
  path.endsWith(extension) && !/\.(?:test|generated)\.tsx?$/.test(path);

export function callers(root = repoRoot): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const { dir, extension } of LAYERS)
    for (const path of walkFiles(join(root, dir))) {
      if (!isSource(path, extension) || !CALLS.test(readFileSync(path, 'utf8'))) continue;
      const name = basename(path).split('.')[0] ?? '';
      found.set(name, [...(found.get(name) ?? []), dir]);
    }
  return found;
}

export function readManifests(root = repoRoot): Map<string, ComponentManifest> {
  const manifests = new Map<string, ComponentManifest>();
  for (const path of walkFiles(join(root, 'frameworks/tailwind/components'))) {
    if (!path.endsWith('.manifest.json')) continue;
    const manifest = readJson(path) as ComponentManifest;
    manifests.set(manifest.component, manifest);
  }
  return manifests;
}

export function utility(token: string): string {
  let depth = 0;
  let cut = 0;
  for (let at = 0; at < token.length; at += 1) {
    const char = token[at];
    if (char === '[' || char === '(') depth += 1;
    else if (char === ']' || char === ')') depth -= 1;
    else if (char === ':' && depth === 0) cut = at + 1;
  }
  return token.slice(cut).replace(/^!|!$/g, '');
}

const MOVES_OUTER = [
  /^-?(?:m|mx|ml|mr|ms|me)-/,
  /^(?:w|min-w|max-w|basis)-/,
  /^(?:grow|shrink)(?:-|$)/,
  /^flex-(?:1|auto|none)$/,
  /^(?:inline|inline-block|inline-flex|inline-grid|contents)$/,
  /^(?:absolute|fixed)$/,
];

export function outerMoves(classes: string): string[] {
  return classes.split(/\s+/).filter(Boolean)
    .filter((token) => MOVES_OUTER.some((rule) => rule.test(utility(token))));
}

export function branchProblems(name: string, entry: Measured, manifest: ComponentManifest): string[] {
  const slot = entry.slot;
  if (slot === null) return [];
  const problems: string[] = [];
  const say = (where: string, moved: string[]) => problems.push(`${name}: ${where} puts ${moved.join(' ')} on ${slot}, `
    + `the element its width is measured on, so the branch that width selects moves the box it was measured from`);
  for (const group of entry.decides)
    for (const [value, slots] of Object.entries(manifest.variants?.[group] ?? {})) {
      const moved = outerMoves(slots?.[slot] ?? '');
      if (moved.length) say(`${group}=${value}`, moved);
    }
  for (const compound of manifest.compoundVariants ?? []) {
    if (!entry.decides.some((group) => group in compound)) continue;
    const moved = outerMoves(compound.class?.[slot] ?? '');
    const selector = Object.entries(compound).filter(([key]) => key !== 'class')
      .map(([key, value]) => `${key}=${String(value)}`).join(' ');
    if (moved.length) say(`the compound ${selector}`, moved);
  }
  return problems;
}

export function unlistedCallers(found: Map<string, string[]>, measured = MEASURED): string[] {
  return [...found.keys()].filter((name) => !measured.has(name))
    .map((name) => `${name} calls a container helper and MEASURED does not name it, so nothing holds the box it `
      + 'measures to its branch. Add it with the slot it measures and the variant groups its width decides');
}

export function staleEntries(found: Map<string, string[]>, manifests: Map<string, ComponentManifest>,
  measured = MEASURED): string[] {
  const problems: string[] = [];
  for (const [name, entry] of measured) {
    if (!found.has(name)) {
      problems.push(`stale MEASURED: ${name} calls no container helper in either layer -- ${entry.why}`);
      continue;
    }
    if (entry.slot === null) {
      if (entry.decides.length) problems.push(`MEASURED: ${name} measures no manifest slot and still names `
        + `${entry.decides.join(', ')} -- ${entry.why}`);
      continue;
    }
    const manifest = manifests.get(name);
    if (!manifest) {
      problems.push(`stale MEASURED: ${name} names the slot ${entry.slot} and has no manifest -- ${entry.why}`);
      continue;
    }
    if (!(entry.slot in (manifest.slots ?? {})))
      problems.push(`stale MEASURED: ${name} has no slot called ${entry.slot} -- ${entry.why}`);
    for (const group of entry.decides)
      if (!(group in (manifest.variants ?? {})))
        problems.push(`stale MEASURED: ${name} has no variant group called ${group} -- ${entry.why}`);
  }
  return problems;
}

export function zeroCallerProblems(count: number): string[] {
  return count > 0 ? [] : ['found no component calling a container helper in either layer; the walk looked '
    + 'at nothing, which is a failure rather than a clean pass'];
}

export function collect(root = repoRoot) {
  const found = callers(root);
  const manifests = readManifests(root);
  const problems = [...zeroCallerProblems(found.size), ...unlistedCallers(found), ...staleEntries(found, manifests)];
  for (const [name, entry] of MEASURED) {
    const manifest = manifests.get(name);
    if (manifest) problems.push(...branchProblems(name, entry, manifest));
  }
  return { problems, callers: found.size };
}

function main() {
  const { problems, callers: count } = collect();
  if (problems.length) {
    for (const problem of problems) console.error(`check-measured-box: ${problem}`);
    console.error('\nThe helpers read the border box, so a branch may restyle the padding and border of the element');
    console.error('it measures and nothing else about its outer box. See frameworks/AGENTS.md, "What holds what".');
    process.exit(1);
  }
  console.log(`check-measured-box: clean -- ${count} component(s) call a container helper, each named in MEASURED `
    + 'with the box it measures');
}

if (isMainModule(import.meta.url)) main();
