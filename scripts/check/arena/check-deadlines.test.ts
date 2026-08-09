import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import {
  SPANS_AS_DATA, WAIT_IMPLEMENTATIONS, bareDurationProblems, budgetProblems, declaredDeadlines,
  namedInBudget, staleAllowances, waitPositions,
} from './check-deadlines.ts';

test('a literal in a suite case timeout is a bare span, and a named budget is not', () => {
  assert.deepEqual(waitPositions("test('x', { timeout: 60_000 }, () => {});"),
    [{ position: 'a suite case timeout', literal: '60_000' }]);
  assert.deepEqual(waitPositions("test('x', { timeout: BUDGET_MS }, () => {});"), []);
});

test('a literal bound on withTimeout is a bare span, and a deadline read is not', () => {
  assert.deepEqual(waitPositions('await withTimeout(p, 30000, "slow");'),
    [{ position: 'a withTimeout bound', literal: '30000' }]);
  assert.deepEqual(waitPositions('await withTimeout(p, NAVIGATE.ms, "slow");'), []);
});

test('a literal sleep is a bare span, and a named interval is not', () => {
  assert.deepEqual(waitPositions('await new Promise((r) => setTimeout(r, 60));'),
    [{ position: 'a sleep', literal: '60' }]);
  assert.deepEqual(waitPositions('setTimeout(done, POLL_MS);'), []);
});

test('the implementations of waiting are the only modules allowed a bare span, by name', () => {
  assert.deepEqual([...WAIT_IMPLEMENTATIONS.keys()].sort(),
    ['scripts/lib/arena/wait-for.ts', 'scripts/utils/with-timeout.ts']);
});

test('every allowance names a file that is there and says why it is one', () => {
  for (const [path, why] of [...WAIT_IMPLEMENTATIONS, ...SPANS_AS_DATA]) {
    assert.ok(existsSync(join(repoRoot, path)), `an allowance names ${path}, which is not there`);
    assert.ok(why.length > 20, `${path} is allowed a span with no reason on the record`);
  }
  assert.deepEqual(staleAllowances(repoRoot), []);
});

test('a deadline declaration is found by the name it is bound to, annotated or not', () => {
  assert.deepEqual(
    declaredDeadlines("export const REAP: Deadline = deadline('chromium:reap', 5_000, 'why');"),
    ['REAP'],
  );
  assert.deepEqual(declaredDeadlines("const SETTLE = deadline('x', 1, 'why');"), ['SETTLE']);
  assert.deepEqual(declaredDeadlines('export const POLL_MS = 50;'), []);
});

test('a budget names the deadlines it was derived from', () => {
  assert.deepEqual(namedInBudget('const BUDGET_MS = budgetFor(DEVTOOLS, GRACE, REAP, SETTLE);'),
    ['DEVTOOLS', 'GRACE', 'REAP', 'SETTLE']);
  assert.deepEqual(namedInBudget('const x = 1;'), []);
});

test('this tree holds both rules, which is the claim the gate exists to make', () => {
  assert.deepEqual(bareDurationProblems(repoRoot), []);
  assert.deepEqual(budgetProblems(repoRoot), []);
});
