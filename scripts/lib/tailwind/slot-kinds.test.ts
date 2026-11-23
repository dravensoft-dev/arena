/* The kind a manifest declares for each slot: what counts as a problem, and the air each
 * kind may spend. */

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { KIND_AIR, KIND_FREE, KINDS, kindProblems } from './slot-kinds.ts';

const KIND_PROBLEMS: { name: string; manifest: Parameters<typeof kindProblems>[0]; expected: number }[] = [
  { name: 'a kind for every slot is no problem', manifest: { component: 'X', slots: { root: 'p-0' }, kind: { root: 'none' } }, expected: 0 },
  { name: 'a slot with no kind is one problem', manifest: { component: 'X', slots: { root: 'p-0', dot: 'p-0' }, kind: { root: 'none' } }, expected: 1 },
  { name: 'an unknown kind is one problem', manifest: { component: 'X', slots: { root: 'p-0' }, kind: { root: 'chip' } }, expected: 1 },
  { name: 'a kind with no slot is one problem', manifest: { component: 'X', slots: { root: 'p-0' }, kind: { root: 'none', ghost: 'row' } }, expected: 1 },
];

describe('kindProblems', () => {
  test('a manifest declares a kind for exactly its slots', () => {
    assert.ok(KIND_PROBLEMS.length > 0, 'the table has rows');
    for (const row of KIND_PROBLEMS) assert.equal(kindProblems(row.manifest).length, row.expected, row.name);
  });
});

describe('KIND_AIR', () => {
  test('holds exactly the kinds', () => {
    assert.deepEqual(Object.keys(KIND_AIR).sort(), [...KINDS].sort());
  });

  test('the kind-free air names no kind role', () => {
    assert.equal(KIND_FREE.has('gap-items'), true);
    assert.equal(KIND_FREE.has('rounded-pill'), true);
  });
});
