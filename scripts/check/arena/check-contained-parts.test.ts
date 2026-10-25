import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLACED_EXPRESSION, emptyProblems, escapeProblems, heldProblems, type Placed,
} from './check-contained-parts.ts';

const row = (part: string, holder: string | null, over: Partial<Placed> = {}): Placed =>
  ({ layer: 'react', sink: 'default', part, holder, ...over });

test('a part whose containing block is outside its component escapes', () => {
  const problems = escapeProblems([row('timeline.name', null), row('timeline.name', 'BODY')]);
  assert.equal(problems.length, 1, 'one line per layer, sink and part');
  assert.match(problems[0] ?? '', /react\/default\/timeline\.name/);
  assert.match(problems[0] ?? '', /2 instance\(s\)/);
});

test('a part held by a part of its own component does not escape', () => {
  assert.deepEqual(escapeProblems([
    row('tag.close-label', 'tag.close'), row('avatar.status', 'avatar'),
    row('segmented-control.input', 'segmented-control.segment'),
  ]), []);
});

test('a part held by another component escapes', () => {
  assert.equal(escapeProblems([row('checkbox.input', 'card.body')]).length, 1);
});

test('a HELD entry whose part is drawn must be held by the slot it names', () => {
  const held = new Map([['ArenaTag.closeLabel', { by: 'close', why: 'x' }]]);
  assert.deepEqual(heldProblems([row('tag.close-label', 'tag.close')], held), []);
  assert.equal(heldProblems([row('tag.close-label', 'tag.chip')], held).length, 1);
  assert.equal(heldProblems([row('tag.close-label', null)], held).length, 1);
});

test('a HELD entry whose part is not drawn is not a failure here', () => {
  const held = new Map([['ArenaSlider.thumbLabel', { by: 'thumb', why: 'x' }]]);
  assert.deepEqual(heldProblems([row('tag.close', 'tag')], held), []);
});

test('a sweep that found no sink, or no absolute part, fails', () => {
  assert.equal(emptyProblems([], []).length, 2);
  assert.equal(emptyProblems([row('a.b', 'a')], []).length, 1);
  assert.equal(emptyProblems([], ['default']).length, 1);
  assert.deepEqual(emptyProblems([row('a.b', 'a')], ['default']), []);
});

test('the collector reads position, offsetParent and the part name', () => {
  assert.match(PLACED_EXPRESSION, /getComputedStyle/);
  assert.match(PLACED_EXPRESSION, /offsetParent/);
  assert.match(PLACED_EXPRESSION, /data-arena-part/);
});
