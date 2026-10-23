import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaStepIndex, arenaStepReachable, arenaStepState } from './StepperState.ts';

const states = (index: number, count: number) => {
  const current = arenaStepIndex(index, count);
  return Array.from({ length: count }, (_, i) => arenaStepState(i, current));
};

test('an index in range makes the steps before it complete, it current and the rest upcoming', () => {
  assert.deepEqual(states(1, 4), ['complete', 'current', 'upcoming', 'upcoming']);
  assert.deepEqual(states(0, 3), ['current', 'upcoming', 'upcoming']);
});

test('an index at or past the end leaves every step complete and none current', () => {
  assert.deepEqual(states(4, 4), ['complete', 'complete', 'complete', 'complete']);
  assert.deepEqual(states(40, 2), ['complete', 'complete']);
  assert.equal(arenaStepIndex(Infinity, 3), 0, 'infinity is not finite, so it reads as the first step');
});

test('a negative, a non-finite or a fractional index reads as a whole step from the start', () => {
  assert.equal(arenaStepIndex(-2, 3), 0);
  assert.equal(arenaStepIndex(Number.NaN, 3), 0);
  assert.equal(arenaStepIndex(1.7, 3), 1);
});

test('only a step behind the current one is reachable, and only when interactive', () => {
  assert.deepEqual([0, 1, 2].map((i) => arenaStepReachable(i, 1, true)), [true, false, false]);
  assert.deepEqual([0, 1, 2].map((i) => arenaStepReachable(i, 1, false)), [false, false, false]);
});
