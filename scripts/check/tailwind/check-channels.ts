/* One writer kind per custom property across the compiled sheets, which is what makes the API's
 * channels and the vocabulary's disjoint by construction rather than by a precedence rule. A
 * family writes --arena-<family>-*, a token sheet writes values and roles, and a component sheet
 * writes nothing but Tailwind's own --tw-* plumbing: a manifest declaring anything else is a
 * component choosing a channel. A sweep finding no family sheet or no component sheet fails. */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { VOCABULARY_SHEETS } from '../../lib/tailwind/vocabulary.ts';

export const COMPONENT_SHEETS = 'frameworks/tailwind/consume/components';
export const TOKEN_SHEETS = ['contracts/design-generated', 'contracts/design'];

export const node = {
  name: 'check:channels',
  reads: [`${COMPONENT_SHEETS}/**`, 'contracts/design-generated/**', 'contracts/design/*.css'],
  writes: [],
  feeds: [],
};

type Kind = 'family' | 'component' | 'token';
type Sheet = { kind: Kind; rel: string; css: string };

const DECLARATION = /(?:^|[{;\s])(--[A-Za-z0-9-]+)\s*:/g;

export function declared(css: string) {
  return [...new Set([...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(DECLARATION)].map((m) => m[1] ?? ''))];
}

export function channelProblems(sheets: Sheet[]) {
  const problems: string[] = [];
  for (const kind of ['family', 'component'] as const)
    if (!sheets.some((one) => one.kind === kind)) problems.push(`found 0 ${kind} sheet(s), so no property was compared against them; an empty sweep is a failure rather than a clean pass`);
  const writers = new Map<string, Map<Kind, string>>();
  for (const sheet of sheets) {
    for (const property of declared(sheet.css)) {
      if (sheet.kind === 'component' && !property.startsWith('--tw-'))
        problems.push(`${sheet.rel} declares ${property}. A manifest reads a channel or a role and declares neither`);
      if (sheet.kind === 'family' && !property.startsWith('--arena-'))
        problems.push(`${sheet.rel} declares ${property}, and a family writes only --arena-<family>-* channels`);
      const by = writers.get(property) ?? new Map<Kind, string>();
      if (!by.has(sheet.kind)) by.set(sheet.kind, sheet.rel);
      writers.set(property, by);
    }
  }
  for (const [property, by] of writers) {
    if (by.size < 2) continue;
    problems.push(`${property} has two writer kinds: ${[...by].map(([kind, rel]) => `${kind} (${rel})`).join(' and ')}. `
      + 'A property with two writers is decided by whichever the cascade reaches first');
  }
  return problems;
}

function sheetsUnder(root: string, rel: string, kind: Kind): Sheet[] {
  if (!existsSync(join(root, rel))) return [];
  return walkFiles(join(root, rel)).filter((path) => path.endsWith('.css'))
    .map((path) => ({ kind, rel: relPosix(root, path), css: readFileSync(path, 'utf8') }));
}

export function collect(root = repoRoot) {
  const sheets = [
    ...sheetsUnder(root, VOCABULARY_SHEETS, 'family'),
    ...sheetsUnder(root, COMPONENT_SHEETS, 'component'),
    ...TOKEN_SHEETS.flatMap((rel) => sheetsUnder(root, rel, 'token')),
  ];
  return { sheets, problems: channelProblems(sheets) };
}

function main() {
  const { sheets, problems } = collect();
  if (problems.length) {
    console.error(`check-channels: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check-channels: ${sheets.length} compiled sheet(s), every custom property written by one kind of writer`);
}

if (isMainModule(import.meta.url)) main();
