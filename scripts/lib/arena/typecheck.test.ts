/* Both refusals asserted here are the vacuous pass in its two forms: a runner given no
 * project would check nothing and report nothing wrong, and a gate holding no project at
 * all would do the same one level up. Neither can be reached by accident once they throw. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { repoRoot } from './repo-root.ts';
import { TSC_SPAWN, tscBin, typecheck, projectFiles, zeroProjectProblems } from './typecheck.ts';
import { budgetFor } from './deadline.ts';

const BUDGET_MS = budgetFor(TSC_SPAWN);

test('tsc runs under plain node, so a gate built on this has no skip path to take', () => {
  assert.ok(tscBin(repoRoot).endsWith(join('typescript', 'lib', 'tsc.js')));
});

test('an installation without typescript is named rather than spawned into a confusing failure', () => {
  assert.throws(() => tscBin(join(repoRoot, 'nowhere')), /typescript is not installed at/);
});

test('checking no project is refused by both readers, because it would report nothing wrong', () => {
  assert.throws(() => typecheck(), /no project given/);
  assert.throws(() => projectFiles(), /no project given/);
});

test('a project tsc cannot read is an error rather than an empty file list',
  { timeout: BUDGET_MS }, () => {
  assert.throws(() => projectFiles({ project: 'scripts/tsconfig.does-not-exist.json' }),
    /tsc could not read/);
});

test('projectFiles reports the files a project reached, which is what proves the globs matched',
  { timeout: BUDGET_MS }, () => {
  const files = projectFiles({ project: 'scripts/tsconfig.check.json' });
  assert.ok(files.length > 0, 'a project reaching no file compiles nothing and reports clean');
  assert.ok(files.some((p) => p.endsWith('scripts/lib/arena/typecheck.ts')),
    'the project did not reach this very module, so it is not reading the tree it claims to. tsc '
    + 'prints a forward slash on every host, this list being its own output rather than a walk, '
    + 'so a suffix spelled for the machine matches nothing on Windows');
});

test('a gate holding zero projects is a failure, not a clean run', () => {
  assert.equal(zeroProjectProblems(0).length, 1);
  assert.match(zeroProjectProblems(0)[0] ?? '', /reports clean by construction/);
  assert.deepEqual(zeroProjectProblems(1), []);
});
