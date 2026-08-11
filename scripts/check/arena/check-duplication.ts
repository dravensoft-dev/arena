/* Holds a concept to one home. Two documents saying the same thing in the same words is the shape
 * that rots: one of them is edited, the other is not, and both keep reading as current. The unit
 * is a normalized sentence, long enough that a heading or a shared idiom cannot collide by
 * accident, and the comparison is over every pair at once through an index rather than pair by
 * pair. Two shapes are legitimate and are not counted: one document rendered per layer, which is a
 * rendering rather than a second source, and two components of one family stating the family's own
 * rule, which is a debt with a stated cost rather than an accident. Everything else has a small
 * budget, and a pair over it is a concept that needs an owner. A generated region is cut out
 * before anything is compared: it is one source rendered into many files by definition, and
 * leaving it in made every prompt overlap every other prompt through the same emitted line. */

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, basename } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { hostBinary } from '../../lib/arena/host-binary.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';

export const MIN_WORDS = 8;
export const LIMIT = 3;
export const FAMILY_LIMIT = 45;

export const OUT_OF_SCOPE = 'docs/';

export const ONE_SOURCE_RENDERED_TWICE =
  'two documents with the same file name are one document rendered per layer: the layer index and '
  + 'the npm page each exist once per package because a reader has one package, and a component '
  + 'prompt exists once per layer because the idiom differs there. What they share is a single '
  + 'source said twice, which is a generator question and never a duplication one.';

export const FAMILY_DEBT =
  'two components filed under the same category state the family rule they both answer to: the '
  + 'value-formatting members every chart takes, the sizing rule every chart obeys, the field '
  + 'conventions an input and a textarea share. It is a real duplication and it is bounded rather '
  + 'than paid: the prompt is the consumer\'s last stop and a reader opens exactly one, so moving '
  + 'the rule up a level would charge every build for a family it is not using. The limit is what '
  + 'the largest family costs today, so the debt cannot grow while it waits for a generator to '
  + 'emit the shared block the way an @api region is emitted.';

export function documents(base = root) {
  const git = hostBinary('git', 'to read the documents the tree versions, so a build product left '
    + 'in a working copy is never compared against the source it was built from');
  const { stdout } = spawnSync(git, ['ls-files', '--cached', '--others', '--exclude-standard', '*.md'],
    { cwd: base, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return (stdout ?? '').split('\n').filter(Boolean).filter((rel) => !rel.startsWith(OUT_OF_SCOPE));
}

export const REGION_OPENS = /^<!-- @[a-z]+ GENERATED /;
export const REGION_CLOSES = /^<!-- @[a-z]+ end -->$/;

export function authored(source: string) {
  const kept = [];
  let inside = false;
  for (const line of source.split('\n')) {
    if (!inside && REGION_OPENS.test(line)) { inside = true; continue; }
    if (inside) { inside = !REGION_CLOSES.test(line); continue; }
    kept.push(line);
  }
  return kept.join('\n');
}

export function sentences(source: string) {
  const prose = authored(source).split('\n').filter((line) => !line.startsWith('|')).join('\n');
  return prose
    .replace(/`[^`]*`/g, 'CODE')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(/(?<=[.:;])\s/)
    .map((one) => one.trim())
    .filter((one) => one.split(' ').length >= MIN_WORDS);
}

export function sameSubject(a: string, b: string) {
  return basename(a) === basename(b);
}

export const COMPONENT_TREE = /^frameworks\/[^/]+\/components\/([^/]+)\//;

export function familyOf(rel: string) {
  return COMPONENT_TREE.exec(rel)?.[1] ?? null;
}

export function sameFamily(a: string, b: string) {
  const family = familyOf(a);
  return family !== null && family === familyOf(b);
}

export function limitFor(a: string, b: string) {
  return sameFamily(a, b) ? FAMILY_LIMIT : LIMIT;
}

export function sharedCounts(base = root, docs = documents(base)) {
  const index = new Map<string, string[]>();
  for (const rel of docs)
    for (const one of new Set(sentences(readFileSync(join(base, rel), 'utf8')))) {
      if (!index.has(one)) index.set(one, []);
      (index.get(one) ?? []).push(rel);
    }

  const counts = new Map<string, { a: string; b: string; shared: number; first: string }>();
  for (const [one, where] of index) {
    if (where.length < 2) continue;
    for (let i = 0; i < where.length; i += 1)
      for (let j = i + 1; j < where.length; j += 1) {
        const a = where[i] ?? '';
        const b = where[j] ?? '';
        if (sameSubject(a, b)) continue;
        const key = `${a} <-> ${b}`;
        const found = counts.get(key);
        if (found) found.shared += 1;
        else counts.set(key, { a, b, shared: 1, first: one });
      }
  }
  return counts;
}

export function duplicationProblems(base = root, docs = documents(base)) {
  const problems = [];
  for (const { a, b, shared, first } of sharedCounts(base, docs).values()) {
    const limit = limitFor(a, b);
    if (shared <= limit) continue;
    problems.push(
      `${a} and ${b} state ${shared} of the same sentences, over a limit of ${limit}. `
      + `One of them is: "${first.slice(0, 90)}". `
      + (sameFamily(a, b)
        ? `They are one family, and a family shares its own rule: ${FAMILY_DEBT}`
        : 'A concept stated in two documents goes stale in one of them, and both keep reading as '
          + 'current. Give it one owner, and leave a pointer where the other copy was. If they '
          + 'are two renderings of one source, they share a file name and this gate never '
          + `compares them: ${ONE_SOURCE_RENDERED_TWICE}`),
    );
  }
  return problems;
}

export function zeroScanProblems(docs: string[], compared: number) {
  const problems = [];
  if (docs.length < 2)
    problems.push(`read ${docs.length} document(s), and a comparison needs two: an empty walk `
      + 'reports every concept as having one home');
  if (docs.length >= 2 && compared === 0)
    problems.push('found no sentence in more than one document at all, which over a tree this '
      + 'size means the reader stopped reading rather than that nothing repeats');
  return problems;
}

function main() {
  const docs = documents();
  const counts = sharedCounts(root, docs);
  const problems = [
    ...zeroScanProblems(docs, counts.size),
    ...duplicationProblems(root, docs),
  ];
  if (problems.length > 0) {
    console.error(`check-duplication: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}\n`);
    process.exit(1);
  }
  console.log(
    `check-duplication: ${docs.length} document(s) compared as ${counts.size} overlapping pair(s), `
    + `none over its limit of ${LIMIT} shared sentence(s), or ${FAMILY_LIMIT} inside one component family`,
  );
}

if (isMainModule(import.meta.url)) main();
