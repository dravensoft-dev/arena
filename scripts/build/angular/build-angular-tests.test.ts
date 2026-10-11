import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { platform } from '../../lib/arena/platform.ts';
import { budgetFor } from '../../lib/arena/deadline.ts';
import { TERM_GRACE } from '../../lib/arena/child-output.ts';
import { PROBE_ENDED, PROBE_SPAWNED, assertCompilerEnded, probeInterrupt } from '../../lib/arena/forwarding-probe.ts';
import { missingEmitProblems, stalenessReason } from './build-angular-tests.ts';

const stamped = (mtimeMs: number, paths: string[]) => ({ mtimeMs, paths });

test('stalenessReason returns null only when the stamp is strictly newer than every input it compiled', () => {
  const inputs = [{ path: 'a.ts', mtimeMs: 10 }, { path: 'b.ts', mtimeMs: 19 }];
  assert.equal(stalenessReason(inputs, stamped(20, ['a.ts', 'b.ts'])), null);
});

test('stalenessReason names the newest input, which is the one that decides', () => {
  const inputs = [{ path: 'old.ts', mtimeMs: 1 }, { path: 'touched.ts', mtimeMs: 99 }];
  const reason = stalenessReason(inputs, stamped(50, ['old.ts', 'touched.ts']));
  assert.ok(reason, 'a newer input than the stamp must be a reason to rebuild');
  assert.match(reason, /touched\.ts/);
  assert.doesNotMatch(reason, /old\.ts/);
});

test('an equal timestamp rebuilds -- a one-second filesystem cannot tell which came first', () => {
  assert.ok(stalenessReason([{ path: 'a.ts', mtimeMs: 42 }], stamped(42, ['a.ts'])));
});

test('a source added since the last emit rebuilds, however old it is', () => {
  const reason = stalenessReason(
    [{ path: 'a.ts', mtimeMs: 1 }, { path: 'new.ts', mtimeMs: 1 }],
    stamped(500, ['a.ts']),
  );
  assert.match(reason ?? '', /new\.ts was not compiled/);
});

test('a source deleted since the last emit rebuilds, which no timestamp can see', () => {
  const reason = stalenessReason([{ path: 'a.ts', mtimeMs: 1 }], stamped(500, ['a.ts', 'gone.ts']));
  assert.match(reason ?? '', /gone\.ts is gone/);
});

test('no stamp rebuilds, and no input found rebuilds rather than skipping on a walk that saw nothing', () => {
  assert.match(stalenessReason([{ path: 'a.ts', mtimeMs: 1 }], null) ?? '', /no emit stamp/);
  assert.match(stalenessReason([], stamped(100, [])) ?? '', /no input was found/);
});

test('missingEmitProblems reports nothing when every source test has a matching emit', () => {
  const problems = missingEmitProblems(
    ['DataVisuals.test.ts', 'components/charts/arena-bar-chart/ArenaBarChart.geometry.test.ts'],
    ['DataVisuals.test.js', 'components/charts/arena-bar-chart/ArenaBarChart.geometry.test.js'],
  );
  assert.deepEqual(problems, []);
});

test('missingEmitProblems names a source test with no matching emit', () => {
  const problems = missingEmitProblems(
    ['DataVisuals.test.ts', 'components/charts/arena-bar-chart/ArenaBarChart.geometry.test.ts'],
    ['components/charts/arena-bar-chart/ArenaBarChart.geometry.test.js'],
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /DataVisuals\.test\.ts/);
  assert.match(problems[0] ?? '', /never runs/);
});

test('missingEmitProblems reports one problem per missing suite, not one for the whole run', () => {
  const problems = missingEmitProblems(
    ['A.test.ts', 'B.test.ts', 'C.test.ts'],
    ['C.test.js'],
  );
  assert.equal(problems.length, 2);
  assert.ok(problems.some((p) => p.includes('A.test.ts')));
  assert.ok(problems.some((p) => p.includes('B.test.ts')));
});

test('missingEmitProblems is empty for two empty lists -- no source tests is not the failure this guards', () => {
  assert.deepEqual(missingEmitProblems([], []), []);
});

test('an extra emitted file with no source is not this function\'s problem -- pruneOrphans owns that direction', () => {
  const problems = missingEmitProblems(
    ['A.test.ts'],
    ['A.test.js', 'Orphan.test.js'],
  );
  assert.deepEqual(problems, []);
});

test('an interrupt of the test-surface step ends the ngc it spawned', {
  timeout: budgetFor(PROBE_SPAWNED, PROBE_ENDED, TERM_GRACE),
  skip: platform === 'win32' ? 'a signal sent to a process is a POSIX idea' : false,
}, async () => {
  const probed = await probeInterrupt({
    module: join(import.meta.dirname, 'build-angular-tests.ts'),
    body: 'await step.compileTests(stub, "unused.json", root);',
  });
  assertCompilerEnded(probed, false);
});
