/* The kind a manifest declares for each slot: what counts as a problem, and the air each
 * kind may spend. */

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { KIND_AIR, KIND_FREE, KINDS, kindProblems } from './slot-kinds.ts';

describe('kindProblems', () => {
  test('a kind for every slot is no problem', () => {
    assert.deepEqual(kindProblems({ component: 'X', slots: { root: 'p-0' }, kind: { root: 'none' } }), []);
  });

  test('a slot with no kind is one problem', () => {
    assert.equal(kindProblems({ component: 'X', slots: { root: 'p-0', dot: 'p-0' }, kind: { root: 'none' } }).length, 1);
  });

  test('an unknown kind is one problem', () => {
    assert.equal(kindProblems({ component: 'X', slots: { root: 'p-0' }, kind: { root: 'chip' } }).length, 1);
  });

  test('a kind with no slot is one problem', () => {
    assert.equal(kindProblems({ component: 'X', slots: { root: 'p-0' }, kind: { root: 'none', ghost: 'row' } }).length, 1);
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
