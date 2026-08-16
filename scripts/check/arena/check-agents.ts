/* Holds the contributor branch's index tree: every AGENTS.md the walk finds reachable from the
 * router by following links, and no README.md left on this branch outside SURVIVORS, which names
 * each with the reason it is not a contributor document at all. The levels are what the walk finds
 * rather than what a list declares, because a list is maintained by whoever remembers it and this
 * one had gone thirty-five short while reporting itself complete. A level nobody wrote is not the
 * failure: the convention hands a reader the nearest page above it, which is a correct answer. A
 * level nobody LINKS is, because the convention hands that automatically to an agent and hands a
 * reader nothing, so the same tree answers the two of them differently and only one can be sent
 * anywhere. What a level says once linked is check-agents-spec.ts and a different claim. */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { relPosix } from '../../utils/posix-path.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';

export const ROUTER = 'AGENTS.md';

export const SURVIVORS = new Map([
  ['README.md',
   'Getting started, and the page GitHub and npm show. It routes to both branches and belongs '
   + 'to neither.'],
]);

export const SKIPPED_ANYWHERE = new Set(['node_modules', '.git']);
export const SKIPPED_UNDER_FRAMEWORKS = new Set(['dist', 'vendor']);

export const LINK = /\]\(([^)\s]+)/g;

export const EMITTED = 'dist';
export const EMITTED_UNDER_FRAMEWORKS = 'build';

export function skips(name: string, relativeDirectory: string) {
  if (SKIPPED_ANYWHERE.has(name)) return true;
  return SKIPPED_UNDER_FRAMEWORKS.has(name) && relativeDirectory.startsWith('frameworks');
}

export function emitted(rel: string) {
  const directories = rel.split('/').slice(0, -1);
  if (directories.includes(EMITTED)) return true;
  return directories[0] === 'frameworks' && directories.includes(EMITTED_UNDER_FRAMEWORKS);
}

export function markdownFiles(base = root): string[] {
  const posix = (path: string) => relPosix(base, path);
  return walkFiles(base, { skip: (name, path) => skips(name, posix(dirname(path))) })
    .filter((path) => path.endsWith('.md'))
    .map(posix);
}

export function routers(base = root, found = markdownFiles(base)) {
  return found
    .filter((rel) => (rel === ROUTER || rel.endsWith(`/${ROUTER}`)) && !emitted(rel))
    .sort();
}

export function resolveLink(fromDirectory: string, target: string) {
  const clean = (target.split('#')[0] ?? '').trim();
  if (clean === '' || clean.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(clean)) return null;
  const walked: string[] = [];
  for (const segment of `${fromDirectory}/${clean}`.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') walked.pop();
    else walked.push(segment);
  }
  return walked.join('/');
}

export function linkedRouters(rel: string, text: string, known: Set<string>) {
  const from = dirname(rel);
  return [...text.matchAll(LINK)]
    .map((match) => resolveLink(from, match[1] ?? ''))
    .filter((target): target is string => target !== null && known.has(target));
}

export function reachedFrom(start: string, known: Set<string>, read: (rel: string) => string) {
  const reached = new Set<string>();
  const pending = known.has(start) ? [start] : [];
  while (pending.length > 0) {
    const rel = pending.pop() as string;
    if (reached.has(rel)) continue;
    reached.add(rel);
    for (const next of linkedRouters(rel, read(rel), known)) pending.push(next);
  }
  return reached;
}

export function reachProblems(base = root, found = routers(base)) {
  const known = new Set(found);
  const reached = reachedFrom(ROUTER, known, (rel) => readFileSync(join(base, rel), 'utf8'));
  return found
    .filter((rel) => !reached.has(rel))
    .map((rel) => `${rel} is a level on this branch and no chain of links from ${ROUTER} reaches `
      + 'it. An agent is handed the nearest page automatically and a reader is handed nothing, so '
      + 'a level nobody links is one only somebody who already knew it was there can open. Link '
      + 'it from the level above, or from the level whose subject reaches it.');
}

export function survivorProblems(base = root, found = [...markdownFiles(base)], survivors = SURVIVORS) {
  const problems = [];
  const met = new Set();
  for (const rel of found) {
    if (!rel.endsWith('README.md')) continue;
    if (emitted(rel)) continue;
    if (survivors.has(rel)) { met.add(rel); continue; }
    problems.push(
      `${rel} is a README.md on the contributor branch, which has one name. Rename it to `
      + `${ROUTER}, or name it in SURVIVORS with the reason it is not a contributor document.`,
    );
  }
  for (const [rel, reason] of survivors) {
    if (met.has(rel)) continue;
    problems.push(
      `SURVIVORS names ${rel}, and no README.md is there. The allowance outlived what it was `
      + `written for: ${reason}`,
    );
  }
  return problems;
}

export function zeroScanProblems(found: unknown[]) {
  return found.length === 0
    ? ['found 0 documents; an empty walk reports every level reachable and every survivor stale, '
       + 'which is a clean-looking pass over a tree it never opened']
    : [];
}

function main() {
  const found = [...markdownFiles()];
  const levels = routers(root, found);
  const problems = [
    ...zeroScanProblems(found),
    ...reachProblems(root, levels),
    ...survivorProblems(root, found),
  ];
  if (problems.length > 0) {
    console.error(`check-agents: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(
    `check-agents: the router reaches all ${levels.length} ${ROUTER} on the branch, `
    + `and ${SURVIVORS.size} README.md is kept with a reason`,
  );
}

if (isMainModule(import.meta.url)) main();
