import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import {
  SPANS_AS_DATA, WAIT_IMPLEMENTATIONS, bareDurationProblems, budgetProblems, declaredDeadlines,
  namedInBudget, staleAllowances, waitPositions,
} from './check-deadlines.ts';

test('a literal in a suite case timeout, a withTimeout bound or a sleep is a bare span, and a named budget, deadline read or interval is not', () => {
  const rows: [string, string, { position: string; literal: string }[]][] = [
    ['a literal suite case timeout', "test('x', { timeout: 60_000 }, () => {});", [{ position: 'a suite case timeout', literal: '60_000' }]],
    ['a named suite case budget', "test('x', { timeout: BUDGET_MS }, () => {});", []],
    ['a literal bound on withTimeout', 'await withTimeout(p, 30000, "slow");', [{ position: 'a withTimeout bound', literal: '30000' }]],
    ['a deadline read on withTimeout', 'await withTimeout(p, NAVIGATE.ms, "slow");', []],
    ['a literal sleep', 'await new Promise((r) => setTimeout(r, 60));', [{ position: 'a sleep', literal: '60' }]],
    ['a named interval', 'setTimeout(done, POLL_MS);', []],
  ];
  for (const [name, source, expected] of rows) assert.deepEqual(waitPositions(source), expected, name);
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
