/* Holds the contributor branch's index tree: one AGENTS.md per declared domain, every one of
 * them reachable from the router, and no README.md left on this branch outside SURVIVORS, which
 * names each with the reason it is not a contributor document at all. The tree is hand-written
 * rather than generated, unlike the consumer branch's, because what it carries is reasoning; so
 * nothing regenerates it and its completeness is what a gate has to hold instead. A directory
 * holding contributor documents but no AGENTS.md is the failure this exists for: it reads as a
 * level nobody wrote rather than as one that does not need one. */

import { readFileSync, existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { relPosix } from '../../utils/posix-path.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';

export const ROUTER = 'AGENTS.md';

export const DOMAINS = ['contracts', 'frameworks', 'scripts', 'intro'];

export const SURVIVORS = new Map([
  ['README.md',
   'Getting started, and the page GitHub and npm show. It routes to both branches and belongs '
   + 'to neither.'],
]);

export const SKIPPED_ANYWHERE = new Set(['node_modules', '.git']);
export const SKIPPED_UNDER_FRAMEWORKS = new Set(['dist', 'vendor']);

export function skips(name: string, relativeDirectory: string) {
  if (SKIPPED_ANYWHERE.has(name)) return true;
  return SKIPPED_UNDER_FRAMEWORKS.has(name) && relativeDirectory.startsWith('frameworks');
}

export function markdownFiles(base = root): string[] {
  const posix = (path: string) => relPosix(base, path);
  return walkFiles(base, { skip: (name, path) => skips(name, posix(dirname(path))) })
    .filter((path) => path.endsWith('.md'))
    .map(posix);
}

export function declaredTargets(base = root) {
  return [ROUTER, ...DOMAINS.map((d) => `${d}/${ROUTER}`)];
}

export function missingProblems(base = root, targets = declaredTargets(base)) {
  return targets
    .filter((rel) => !existsSync(join(base, rel)))
    .map((rel) => `${rel} is declared and is not there, so the branch has a level nobody wrote`);
}

export function routerProblems(base = root, targets = declaredTargets(base)) {
  const path = join(base, ROUTER);
  if (!existsSync(path)) return [];
  const text = readFileSync(path, 'utf8');
  return targets
    .filter((rel) => rel !== ROUTER && !text.includes(rel))
    .map((rel) => `${ROUTER} links no ${rel}, so that level is reachable only by guessing at it`);
}

export function survivorProblems(base = root, found = [...markdownFiles(base)], survivors = SURVIVORS) {
  const problems = [];
  const met = new Set();
  for (const rel of found) {
    if (!rel.endsWith('README.md')) continue;
    if (rel.includes('/dist/')) continue;
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
    ? ['found 0 documents; an empty walk reports every level present and every survivor stale, '
       + 'which is a clean-looking pass over a tree it never opened']
    : [];
}

function main() {
  const found = [...markdownFiles()];
  const targets = declaredTargets();
  const problems = [
    ...zeroScanProblems(found),
    ...missingProblems(root, targets),
    ...routerProblems(root, targets),
    ...survivorProblems(root, found),
  ];
  if (problems.length > 0) {
    console.error(`check-agents: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(
    `check-agents: the router reaches all ${DOMAINS.length} domain(s), `
    + `${found.filter((f) => f.endsWith(ROUTER)).length} ${ROUTER} on the branch, `
    + `and ${SURVIVORS.size} README.md kept with a reason`,
  );
}

if (isMainModule(import.meta.url)) main();
