import test from 'node:test';
import assert from 'node:assert/strict';
import { DANGER_FLOOR, floorProblems } from './style-plugin-rules.ts';

const reading = { 'lh-prose': '1.6', 'lh-heading': '1.15', 'measure-prose': '72ch' };

const at = (over: Record<string, string> = {}) => new Map(Object.entries({ ...reading, ...over }));

test('the danger floor is the strong fill of the danger hue', () => {
  assert.equal(DANGER_FLOOR, 'hue-danger-fill-strong');
});

test('a danger strong fill that is transparent clears the floor', () => {
  assert.deepEqual(floorProblems(at({ [DANGER_FLOOR]: 'transparent' }), 'dark', 'at'), []);
});

test('a danger strong fill that is a colour fails, naming the value, the scope and where the filled surface is', () => {
  const problems = floorProblems(at({ [DANGER_FLOOR]: '#c00' }), 'light', 'at');
  assert.equal(problems.length, 1);
  assert.equal(problems[0],
    'at: --hue-danger-fill-strong is #c00 in light, and danger is outline: its strong fill is transparent '
    + 'in every answer, and the one filled danger surface reads fill-confirm-final');
});
