/* Holds the one spelling of the directories that are not this repository. A script naming
 * node_modules, .git or .claude as something a walk skips, in a set literal or an equality,
 * spells the answer a second time, and a second spelling is the one that goes short: the walks
 * that missed .claude read a git worktree as a second copy of the tree. SPELLED_ELSEWHERE names
 * what may not import this module, with the reason, and an entry that stops spelling one fails.
 * The root walks are then asked directly whether they skip each foreign tree. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { repoRoot } from './repo-root.ts';
import { FOREIGN_TREES, isForeignTree, withForeignTrees } from './foreign-trees.ts';
import { skips as vocabularySkips } from '../../check/arena/check-vocabulary.ts';
import { skips as routeSkips } from '../../check/arena/check-routes.ts';
import { skips as agentSkips } from '../../check/arena/check-agents.ts';
import { skips as citationSkips } from '../../check/arena/check-citations.ts';
import { SKIPPED_DIRECTORIES as GRAPH_SKIPS } from '../../graph/inputs.ts';

export const OWNER = 'scripts/lib/arena/foreign-trees.ts';

export const SPELLED_ELSEWHERE = new Map([
  ['scripts/generate/core/arena-to-prod/arena-to-prod.ts',
   'ships inside both npm packages as a Node program reading its own siblings and node: modules, '
   + 'and walks a consumer\'s project rather than this one'],
  ['scripts/lib/arena/package-exclusions.ts',
   'names what a package omits rather than what a walk of this tree skips, and the publish guard '
   + 'asks it in a job with no install'],
]);

export const SPELLINGS = [
  /new Set\(\[[^\]]*'(node_modules|\.git|\.claude)'/g,
  /===\s*'(node_modules|\.git|\.claude)'/g,
];

export function scripts(root = repoRoot) {
  return walkFiles(join(root, 'scripts'), { skip: (name) => isForeignTree(name) })
    .map((path) => relPosix(root, path))
    .filter((rel) => /\.(ts|mjs)$/.test(rel) && !/\.test\.(ts|mjs)$/.test(rel));
}

export function spelled(text: string) {
  return SPELLINGS.flatMap((pattern) => [...text.matchAll(pattern)].map((hit) => hit[1] ?? ''));
}

export function spellingProblems(read: (rel: string) => string, paths: string[]) {
  const problems = [];
  for (const rel of paths) {
    if (rel === OWNER || SPELLED_ELSEWHERE.has(rel)) continue;
    for (const name of spelled(read(rel)))
      problems.push(`${rel} spells ${name} as a skip of its own; compose withForeignTrees() from ${OWNER}`);
  }
  for (const [rel, reason] of SPELLED_ELSEWHERE)
    if (!paths.includes(rel) || spelled(read(rel)).length === 0)
      problems.push(`SPELLED_ELSEWHERE names ${rel}, which spells no foreign tree any more: ${reason}`);
  return problems;
}

test('every foreign tree carries the reason a walk skips it', () => {
  assert.deepEqual([...FOREIGN_TREES.keys()], ['node_modules', '.git', '.claude']);
  for (const [name, reason] of FOREIGN_TREES) assert.ok(reason.length > 40, `${name} says why`);
  assert.deepEqual([...withForeignTrees('dist')], ['node_modules', '.git', '.claude', 'dist']);
});

test('no script under scripts/ spells a foreign tree as a skip of its own', () => {
  const paths = scripts();
  assert.ok(paths.length > 100, `read ${paths.length} scripts, which is not the tree`);
  assert.deepEqual(spellingProblems((rel) => readFileSync(join(repoRoot, rel), 'utf8'), paths), []);
});

test('a planted spelling is found in both shapes, and an exemption that stopped spelling one fails', () => {
  const files: Record<string, string> = {
    'scripts/check/a.ts': "const SKIP = new Set(['dist', '.claude']);",
    'scripts/check/b.ts': "walkFiles(root, { skip: (name) => name === 'node_modules' });",
    'scripts/check/c.ts': "join(root, 'node_modules', 'pkg');",
    'scripts/generate/core/arena-to-prod/arena-to-prod.ts': 'export {};',
    'scripts/lib/arena/package-exclusions.ts': "new Set(['node_modules'])",
  };
  const problems = spellingProblems((rel) => files[rel] ?? '', Object.keys(files));
  assert.deepEqual(problems.map((p) => p.split(' ')[0]), [
    'scripts/check/a.ts', 'scripts/check/b.ts', 'SPELLED_ELSEWHERE',
  ]);
  assert.match(problems[2] ?? '', /arena-to-prod\.ts, which spells no foreign tree any more/);
});

test('every walk rooted at the repository skips every foreign tree', () => {
  for (const name of FOREIGN_TREES.keys()) {
    assert.ok(vocabularySkips(name, ''), `check:vocabulary walks ${name}`);
    assert.ok(routeSkips(name), `check:routes and check:support walk ${name}`);
    assert.ok(agentSkips(name, ''), `check:agents and check:community walk ${name}`);
    assert.ok(citationSkips(name, ''), `check:citations walks ${name}`);
    assert.ok(GRAPH_SKIPS.has(name), `the graph fingerprints ${name}`);
  }
});
