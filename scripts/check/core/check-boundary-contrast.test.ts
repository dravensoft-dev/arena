import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOUNDARIES, removedBorders, boundaryProblems, collect, zeroBoundaryProblems, axisProblems, collectAxis,
} from './check-boundary-contrast.ts';

const HEXES = {
  'color-base-100': '#141010',
  'color-base-200': '#1c1717',
  'color-base-300': '#2a2323',
};

test('an answer that leaves the control borders alone removes no boundary', () => {
  assert.deepEqual(removedBorders({ 'r-surface': { $value: '{r.xl}' } }), []);
});

test('a border set to zero is a removed boundary', () => {
  const tokens = { 'bw-field': { $value: { value: 0, unit: 'px' } } };
  assert.deepEqual(removedBorders(tokens), ['bw-field']);
});

test('a border merely made thinner is not removed, because a hairline is still a boundary', () => {
  const tokens = { 'bw-field': { $value: { value: 1, unit: 'px' } } };
  assert.deepEqual(removedBorders(tokens), []);
});

test('a surface border set to zero is not a boundary WCAG 1.4.11 asks about, since a card is not a control', () => {
  assert.deepEqual(removedBorders({ 'bw-surface': { $value: { value: 0, unit: 'px' } } }), []);
});

test('a removed boundary whose fill clears 3:1 against its surroundings passes', () => {
  const problems = boundaryProblems('probe', ['bw-field'], 'dark', {
    ...HEXES, 'color-base-300': '#8a8080',
  });
  assert.deepEqual(problems, []);
});

test('a removed boundary whose fill does not clear 3:1 fails, naming the pair and the ratio', () => {
  const problems = boundaryProblems('probe', ['bw-field'], 'dark', HEXES);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /bw-field/);
  assert.match(problems[0] ?? '', /1\.4\.11|3:1/);
  assert.match(problems[0] ?? '', /dark/);
});

test('every declared boundary names the fill, the surround and the role that draws its border', () => {
  for (const b of BOUNDARIES) {
    assert.ok(b.role && b.fill && b.surround && b.why, `${b.role}: incomplete declaration`);
  }
});

test('the real tree holds: nothing shipped removes a boundary it cannot replace', () => {
  assert.deepEqual(collect(), []);
});

test('a zero walk is a failure and not a clean pass', () => {
  assert.match(zeroBoundaryProblems(0)[0] ?? '', /0 boundary/i);
  assert.deepEqual(zeroBoundaryProblems(BOUNDARIES.length), []);
});

test('an axis that measures fainter than the separator on base-100 is one problem naming the plugin and the theme', () => {
  const problems = axisProblems('probe/plugin.tokens.json', 'light',
    { axis: '#999999', separator: '#555555', page: '#ffffff' });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /probe\/plugin\.tokens\.json/);
  assert.match(problems[0] ?? '', /light/);
});

test('an axis heavier than the separator passes, and one equal to it does not', () => {
  assert.deepEqual(axisProblems('probe', 'light', { axis: '#555555', separator: '#999999', page: '#ffffff' }), []);
  assert.equal(axisProblems('probe', 'dark', { axis: '#555555', separator: '#555555', page: '#ffffff' }).length, 1);
});

test('the real tree holds: every plugin Arena ships draws the axis heavier than the grid in both themes', () => {
  assert.deepEqual(collectAxis(), []);
});
