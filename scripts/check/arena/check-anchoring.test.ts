/* The gate drives a real browser; these drive its verdict with the readings a placed panel and
 * a clipped one produce. The in-flow panel is the case that shipped: absolutely positioned under
 * its trigger, it opened below the bottom edge and was cut off by the first overflow: hidden
 * ancestor, and every DOM-free suite passed because happy-dom has no layout to clip it with. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANCHORED, MOUNTED, OPENED, anchoringProblems, confineExpression, type Anchored } from './check-anchoring.ts';

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

test('the stage is pinned to the edge the panel prefers, so the panel has to flip away from it', () => {
  assert.match(confineExpression(below), /bottom: '8px'/);
  assert.match(confineExpression(above), /top: '8px'/);
  assert.match(confineExpression(below), /overflow: 'hidden', transform: 'translateZ\(0\)'/);
});
