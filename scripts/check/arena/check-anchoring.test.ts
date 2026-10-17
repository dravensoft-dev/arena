/* The gate drives a real browser; these drive its verdict with the readings a placed panel and
 * a clipped one produce. The in-flow panel is the case that shipped: absolutely positioned under
 * its trigger, it opened below the bottom edge and was cut off by the first overflow: hidden
 * ancestor, and every DOM-free suite passed because happy-dom has no layout to clip it with. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANCHORED, MOUNTED, OPENED, anchoringProblems, caseUrl, confineExpression, readExpression, smallestRow, type Anchored } from './check-anchoring.ts';
import { SCOPES } from './check-target-size.ts';

const below: Anchored = { name: 'X:react', page: 'p.html', trigger: '[aria-haspopup]', panel: '[role="dialog"]', open: 'click', prefer: 'below' };
const above: Anchored = { ...below, name: 'Y:react', open: 'focus', prefer: 'above' };

test('the table names both layers for every component it holds, or the sweep proves half of what it claims', () => {
  const names = ANCHORED.map((kase) => kase.name);
  for (const name of names) {
    const [component] = name.split(':');
    assert.ok(names.includes(`${component}:react`) && names.includes(`${component}:angular`), `${component} is opened in one layer only`);
  }
  assert.equal(new Set(names).size, names.length, 'a case is declared twice');
});

test('a panel placed whole and flipped away from the edge passes', () => {
  assert.deepEqual(anchoringProblems(below, { mounted: true, opened: true, painted: true, inside: true, side: 'above' }), []);
  assert.deepEqual(anchoringProblems(above, { mounted: true, opened: true, painted: true, inside: true, side: 'below' }), []);
});

test('the in-flow panel fails three ways: clipped, out of the viewport, and never flipped', () => {
  const problems = anchoringProblems(below, { mounted: true, opened: true, painted: false, inside: false, side: 'below' });
  assert.equal(problems.length, 3);
  assert.match(problems[0] ?? '', /is not what paints at its own centre/);
  assert.match(problems[1] ?? '', /leaves the viewport/);
  assert.match(problems[2] ?? '', /opened below it rather than flipping above/);
});

test('a panel that overlaps its trigger has not flipped either', () => {
  assert.match(anchoringProblems(above, { mounted: true, opened: true, painted: true, inside: true, side: 'overlapping' })[0] ?? '',
    /opened overlapping it rather than flipping below/);
});

test('a page that never mounted, and a trigger that opened nothing, each say which wait expired', () => {
  assert.match(anchoringProblems(below, { mounted: false, opened: false })[0] ?? '', new RegExp(MOUNTED.name));
  assert.match(anchoringProblems(below, { mounted: true, opened: false })[0] ?? '', new RegExp(OPENED.name));
});

test('a list whose smallest row is under a scope\'s floor fails in that scope alone', () => {
  const list: Anchored = { ...below, name: 'Z:react', rows: '[role="option"]' };
  const placed = { mounted: true, opened: true, painted: true, inside: true, side: 'above' as const };
  assert.deepEqual(anchoringProblems(list, { ...placed, rows: [
    { scope: 'base', floor: 24, count: 3, smallest: 37 }, { scope: 'comfortable', floor: 44, count: 3, smallest: 48 },
    { scope: 'compact', floor: 24, count: 3, smallest: 26 },
  ] }), []);
  const short = anchoringProblems(list, { ...placed, rows: [
    { scope: 'base', floor: 24, count: 3, smallest: 37 }, { scope: 'comfortable', floor: 44, count: 3, smallest: 40 },
    { scope: 'compact', floor: 24, count: 3, smallest: 26 },
  ] });
  assert.equal(short.length, 1);
  assert.match(short[0] ?? '', /is 40px tall in the comfortable scope, and the floor there is 44px/);
});

test('a list measured with no rows, or in one scope only, fails rather than passing over nothing', () => {
  const list: Anchored = { ...below, name: 'Z:react', rows: '[role="option"]' };
  const placed = { mounted: true, opened: true, painted: true, inside: true, side: 'above' as const };
  assert.match(anchoringProblems(list, { ...placed, rows: [
    { scope: 'base', floor: 24, count: 0, smallest: 0 }, { scope: 'comfortable', floor: 44, count: 2, smallest: 48 },
    { scope: 'compact', floor: 24, count: 2, smallest: 26 },
  ] })[0] ?? '', /drew no \[role="option"\] in the base scope/);
  const names = SCOPES.map((s) => s.name).join(', ');
  const fewer = anchoringProblems(list, { ...placed, rows: SCOPES.slice(0, SCOPES.length - 1)
    .map((s) => ({ scope: s.name, floor: s.floor, count: 2, smallest: 48 })) });
  assert.equal(fewer.length, 1);
  assert.ok(fewer[0]?.includes(`(${names})`));
});

test('a compact row of 23px fails in compact alone', () => {
  const list: Anchored = { ...below, name: 'Z:react', rows: '[role="option"]' };
  const placed = { mounted: true, opened: true, painted: true, inside: true, side: 'above' as const };
  const problems = anchoringProblems(list, { ...placed, rows: SCOPES.map((s) =>
    ({ scope: s.name, floor: s.floor, count: 2, smallest: s.name === 'compact' ? 23 : 48 })) });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /is 23px tall in the compact scope, and the floor there is 24px/);
});

test('the read measures the rows in every scope the target-size gate declares, and a case with no rows measures none', () => {
  const list: Anchored = { ...below, name: 'Z:react', rows: '[role="option"]' };
  assert.match(readExpression(list), /"scope":"base","klass":"","floor":24/);
  assert.match(readExpression(list), /"scope":"comfortable","klass":"arena-comfortable","floor":44/);
  assert.match(readExpression(list), /"scope":"compact","klass":"arena-compact","floor":24/);
  assert.match(readExpression(below), /const rows = "" \?/);
});

test('a row exactly at the floor passes, and one a hair under it fails', () => {
  const list: Anchored = { ...below, name: 'Z:react', rows: '[role="option"]' };
  const placed = { mounted: true, opened: true, painted: true, inside: true, side: 'above' as const };
  const at = (smallest: number) => anchoringProblems(list, { ...placed, rows: [
    { scope: 'base', floor: 24, count: 3, smallest: 24 }, { scope: 'comfortable', floor: 44, count: 3, smallest },
    { scope: 'compact', floor: 24, count: 3, smallest: 24 },
  ] });
  assert.deepEqual(at(44), []);
  assert.equal(at(43.99).length, 1);
});

test('a reading that carries rows for a case naming none is not read as a list', () => {
  const placed = { mounted: true, opened: true, painted: true, inside: true, side: 'above' as const };
  assert.deepEqual(anchoringProblems(below, { ...placed, rows: [{ scope: 'base', floor: 24, count: 0, smallest: 0 }] }), []);
});

test('the smallest row is the least height, and none is zero', () => {
  assert.equal(smallestRow([48, 37, 52]), 37);
  assert.equal(smallestRow([40]), 40);
  assert.equal(smallestRow([]), 0);
});

test('the read runs: the smallest row per scope, and each scope class put back', () => {
  const list: Anchored = { ...below, name: 'Z:react', rows: '[role="option"]' };
  const classes = new Set<string>(['arena-compact']);
  const box = (top: number, height: number) => ({ top, bottom: top + height, left: 0, right: 100, height });
  const rowHeights = () => (classes.has('arena-comfortable') ? [48, 44, 50] : [30, 26, 40]);
  const panel = { getBoundingClientRect: () => box(0, 100), contains: () => true };
  const fake = {
    body: { classList: { add: (one: string) => classes.add(one), remove: (one: string) => classes.delete(one) } },
    querySelector: (selector: string) => (selector === list.panel ? panel : { getBoundingClientRect: () => box(200, 20) }),
    querySelectorAll: () => rowHeights().map((height) => ({ getBoundingClientRect: () => ({ height }) })),
    elementFromPoint: () => panel,
  };
  const read = new Function('document', 'innerWidth', 'innerHeight', `return ${readExpression(list)}`)(fake, 1000, 760);
  assert.deepEqual(read.rows.map((row: { scope: string; smallest: number }) => [row.scope, row.smallest]),
    [['base', 26], ['comfortable', 44], ['compact', 26]]);
  assert.deepEqual([...classes], [], 'neither scope class is left on the body');
});

test('the stage is pinned to the edge the panel prefers, so the panel has to flip away from it', () => {
  assert.match(confineExpression(below), /bottom: '8px'/);
  assert.match(confineExpression(above), /top: '8px'/);
  assert.match(confineExpression(below), /overflow: 'hidden', transform: 'translateZ\(0\)'/);
});

const aligned: Anchored = { ...below, name: 'W:react', edge: { anchor: '[data-whole]', align: 'start' }, seed: 'align=start' };
const placedWhole = { mounted: true, opened: true, painted: true, inside: true, side: 'above' as const };

function readEdge(kase: Anchored, panelLeft: number) {
  const panel = { getBoundingClientRect: () => ({ left: panelLeft, right: panelLeft + 200, top: 0, bottom: 80, width: 200, height: 80 }), contains: () => true };
  const boxes: Record<string, { left: number; right: number }> = { '[data-whole]': { left: 16, right: 157 }, '[data-caret]': { left: 117, right: 157 } };
  const fake = {
    querySelector: (selector: string) => (selector === kase.panel ? panel
      : { getBoundingClientRect: () => ({ ...(boxes[selector] ?? { left: 117, right: 157 }), top: 100, bottom: 140 }) }),
    querySelectorAll: () => [],
    elementFromPoint: () => panel,
    body: { classList: { add() {}, remove() {} } },
  };
  return new Function('document', 'innerWidth', 'innerHeight', `return ${readExpression(kase)}`)(fake, 1000, 760).edge;
}

test('a panel whose aligned edge sits on the named anchor\'s passes, and one a pixel or more off fails', () => {
  assert.deepEqual(anchoringProblems(aligned, { ...placedWhole, edge: { wanted: 16, actual: 16.5 } }), []);
  const off = anchoringProblems(aligned, { ...placedWhole, edge: { wanted: 16, actual: 117 } });
  assert.equal(off.length, 1);
  assert.match(off[0] ?? '', /starts at 117px, and its start edge measured from \[data-whole\] puts it at 16px/);
});

test('a panel placed against the caret instead of the whole control fails at start', () => {
  assert.deepEqual(anchoringProblems(aligned, { ...placedWhole, edge: readEdge(aligned, 16) }), []);
  const onCaret = anchoringProblems(aligned, { ...placedWhole, edge: readEdge(aligned, 117) });
  assert.equal(onCaret.length, 1, 'a panel lined up with the caret passed as lined up with the whole control');
});

test('a case naming an edge with no anchor to measure from fails rather than passing over nothing', () => {
  assert.match(anchoringProblems(aligned, placedWhole)[0] ?? '', /no \[data-whole\] was found/);
});

test('the read measures the aligned edge from the named anchor, the clamp to the viewport included', () => {
  assert.deepEqual(readEdge(aligned, 7), { wanted: 16, actual: 7 });
  assert.deepEqual(readEdge({ ...aligned, edge: { anchor: '[data-whole]', align: 'end' } }, 7), { wanted: 0, actual: 7 });
  assert.deepEqual(readEdge({ ...aligned, edge: { anchor: '[data-caret]', align: 'start' } }, 7), { wanted: 117, actual: 7 });
});

test('a seeded case opens its page with the seed as the query, and an unseeded one with none', () => {
  assert.equal(caseUrl('http://h', aligned), 'http://h/p.html?align=start');
  assert.equal(caseUrl('http://h', below), 'http://h/p.html');
});

test('the split\'s panel is measured from the start edge of the whole split, in both layers, seeded there', () => {
  const split = ANCHORED.filter((kase) => kase.name.startsWith('ArenaSplitButton:'));
  assert.equal(split.length, 2);
  for (const kase of split) {
    assert.deepEqual(kase.edge, { anchor: '[data-arena-part="split-button"]', align: 'start' }, kase.name);
    assert.equal(kase.seed, 'align=start', `${kase.name} measures start without seeding it, so the demo's end is what opens`);
  }
});
