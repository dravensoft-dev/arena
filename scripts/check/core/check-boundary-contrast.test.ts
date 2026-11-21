import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOUNDARIES, removedBorders, boundaryProblems, collect, zeroBoundaryProblems, axisProblems, collectAxis,
} from './check-boundary-contrast.ts';
import { rmSync } from 'node:fs';
import { stateProblems, stateReports } from './check-text-contrast.ts';
import { scratchContrastTree } from '../../lib/core/contrast-fixtures.ts';

const HEXES = {
  'color-base-100': '#141010',
  'color-base-200': '#1c1717',
  'color-base-300': '#2a2323',
};

const REMOVED_ROWS: [name: string, tokens: Parameters<typeof removedBorders>[0], expected: string[]][] = [
  ['an answer that leaves the control borders alone removes no boundary', { 'r-surface': { $value: '{r.xl}' } }, []],
  ['a border set to zero is a removed boundary', { 'bw-field': { $value: { value: 0, unit: 'px' } } }, ['bw-field']],
  ['a border merely made thinner is not removed, because a hairline is still a boundary', { 'bw-field': { $value: { value: 1, unit: 'px' } } }, []],
  ['a surface border set to zero is not a boundary WCAG 1.4.11 asks about, since a card is not a control', { 'bw-surface': { $value: { value: 0, unit: 'px' } } }, []],
];

test('removedBorders names a control border set to zero and nothing else', () => {
  for (const [name, tokens, expected] of REMOVED_ROWS) assert.deepEqual(removedBorders(tokens), expected, name);
});

const BOUNDARY_ROWS: { name: string; hexes: Record<string, string>; count: number; patterns?: RegExp[] }[] = [
  { name: 'a removed boundary whose fill clears 3:1 against its surroundings passes', hexes: { ...HEXES, 'color-base-300': '#8a8080' }, count: 0 },
  {
    name: 'a removed boundary whose fill does not clear 3:1 fails, naming the pair and the ratio',
    hexes: HEXES,
    count: 1,
    patterns: [/bw-field/, /1\.4\.11|3:1/, /dark/],
  },
];

test('boundaryProblems passes a removed boundary whose fill clears 3:1 and names the pair and the ratio of one that does not', () => {
  for (const row of BOUNDARY_ROWS) {
    const problems = boundaryProblems('probe', ['bw-field'], 'dark', row.hexes);
    assert.equal(problems.length, row.count, row.name);
    for (const pattern of row.patterns ?? []) assert.match(problems[0] ?? '', pattern, row.name);
  }
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

const AXIS_ROWS: { name: string; where: string; theme: string; colours: { axis: string; separator: string; page: string }; count: number; patterns?: RegExp[]; notPatterns?: RegExp[] }[] = [
  {
    name: 'an axis with no more contrast than the separator on base-100 is one problem naming the plugin and the theme',
    where: 'probe/plugin.tokens.json',
    theme: 'light',
    colours: { axis: '#999999', separator: '#555555', page: '#ffffff' },
    count: 1,
    patterns: [/probe\/plugin\.tokens\.json/, /light/, /answers --edge-axis with no more contrast than/],
    notPatterns: [/lighter/],
  },
  {
    name: 'an axis darker than the separator on a dark base-100 that still has no more contrast is one problem in the same words',
    where: 'probe',
    theme: 'dark',
    colours: { axis: '#222222', separator: '#444444', page: '#111111' },
    count: 1,
    patterns: [/with no more contrast than/],
    notPatterns: [/lighter/],
  },
  { name: 'an axis heavier than the separator passes', where: 'probe', theme: 'light', colours: { axis: '#555555', separator: '#999999', page: '#ffffff' }, count: 0 },
  {
    name: 'an axis equal to the separator does not pass',
    where: 'probe',
    theme: 'dark',
    colours: { axis: '#555555', separator: '#555555', page: '#ffffff' },
    count: 1,
    patterns: [/with the same contrast as/],
    notPatterns: [/lighter/],
  },
];

test('axisProblems refuses an axis with no more contrast than the separator, in the same words in either theme, and passes a heavier one', () => {
  for (const row of AXIS_ROWS) {
    const problems = axisProblems(row.where, row.theme, row.colours);
    assert.equal(problems.length, row.count, row.name);
    for (const pattern of row.patterns ?? []) assert.match(problems[0] ?? '', pattern, row.name);
    for (const pattern of row.notPatterns ?? []) assert.doesNotMatch(problems[0] ?? '', pattern, row.name);
  }
});

test('the default plugin draws the axis heavier than the grid in both themes', () => {
  assert.deepEqual(collectAxis(), []);
});

test('the default plugin clears 3:1 on its focus, selected and invalid edges in both themes', () => {
  assert.deepEqual(stateProblems('edge-'), []);
});

test('a boundary pair below 3:1 is refused in a judged scope and reported in any other', () => {
  const dir = scratchContrastTree({ 'edge-focus': '{color.base-content}' });
  try {
    const colors = { 'base-100': '#ffffff', strong: '#000000', 'base-content': '#cccccc' };
    const scope = (judged: boolean) => [{ where: 'p/plugin.tokens.json', theme: 'light', colors, judged }];
    assert.ok(stateProblems('edge-', scope(true), dir).length > 0);
    assert.deepEqual(stateProblems('edge-', scope(false), dir), []);
    assert.ok(stateReports('edge-', scope(false), dir).length > 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
