import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLACED_EXPRESSION, UNDRAWN, emptyProblems, escapeProblems, heldProblems, type Placed,
} from './check-contained-parts.ts';

const row = (part: string, holder: string | null, over: Partial<Placed> = {}): Placed =>
  ({ layer: 'react', sink: 'default', part, holder, ...over });

test('a part whose containing block is outside its component escapes', () => {
  const problems = escapeProblems([row('timeline.name', null), row('timeline.name', null)]);
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
  const none = new Map<string, string>();
  assert.deepEqual(heldProblems([row('tag.close-label', 'tag.close')], held, none), []);
  assert.equal(heldProblems([row('tag.close-label', 'tag.chip')], held, none).length, 1);
  assert.equal(heldProblems([row('tag.close-label', null)], held, none).length, 1);
});

const slider = new Map([['ArenaSlider.thumbLabel', { by: 'thumb', why: 'x' }]]);

test('a HELD entry no sink draws fails unless UNDRAWN names it', () => {
  assert.equal(heldProblems([row('tag.close', 'tag')], slider, new Map()).length, 1);
  assert.deepEqual(heldProblems([row('tag.close', 'tag')], slider, new Map([['ArenaSlider.thumbLabel', 'r']])), []);
});

test('a stale UNDRAWN entry fails: drawn after all, or no HELD key', () => {
  const undrawn = new Map([['ArenaSlider.thumbLabel', 'r']]);
  assert.equal(heldProblems([row('slider.thumb-label', 'slider.thumb')], slider, undrawn).length, 1);
  assert.equal(heldProblems([], new Map(), undrawn).length, 1);
});

test('UNDRAWN names the slider thumb label and nothing else', () => {
  assert.deepEqual([...UNDRAWN.keys()], ['ArenaSlider.thumbLabel']);
});

const both = (sink: string, n: number) => ['react', 'angular'].flatMap((layer) =>
  Array.from({ length: n }, () => row('a.b', 'a', { layer, sink })));

test('a sweep that found no sink, or no absolute part, fails', () => {
  assert.equal(emptyProblems([], []).length, 2);
  assert.equal(emptyProblems(both('default', 1), []).length, 1);
  assert.equal(emptyProblems([], ['default']).length, 1);
  assert.deepEqual(emptyProblems(both('default', 2), ['default']), []);
});

test('a layer with no rows fails even when the other layer carries rows', () => {
  const rows = both('default', 2).filter((one) => one.layer === 'react');
  assert.ok(emptyProblems(rows, ['default']).some((p) => /angular drew 0/.test(p)));
});

test('the layers must draw the same count in a sink', () => {
  const rows = [...both('default', 2), row('a.b', 'a', { layer: 'react', sink: 'complete' }),
    ...both('complete', 0)];
  const problems = emptyProblems(rows, ['default', 'complete']);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /complete draws 1 in react and 0 in angular/);
  assert.deepEqual(emptyProblems([...both('default', 2), ...both('charts', 0)], ['default', 'charts']), []);
});

type Fake = { part: string | null; position: string; offsetParent: Fake | null };

const collect = (els: Fake[]) => {
  const doc = {
    querySelectorAll: () => els.map((el) => ({ ...el, getAttribute: () => el.part,
      offsetParent: el.offsetParent && { getAttribute: () => el.offsetParent?.part ?? null } })),
  };
  const style = (el: { position: string }) => ({ position: el.position });
  return new Function('document', 'getComputedStyle', `return ${PLACED_EXPRESSION}`)(doc, style) as
    { part: string; holder: string | null }[];
};

test('the collector keeps absolute named slots with a holder and reports the holder part', () => {
  const tag: Fake = { part: 'tag', position: 'relative', offsetParent: null };
  assert.deepEqual(collect([
    { part: 'tag.close', position: 'absolute', offsetParent: tag },
    { part: 'timeline.name', position: 'absolute', offsetParent: { part: null, position: 'static', offsetParent: null } },
    { part: 'tag.label', position: 'relative', offsetParent: tag },
    { part: 'avatar', position: 'absolute', offsetParent: tag },
    { part: 'x.hidden', position: 'absolute', offsetParent: null },
  ]), [{ part: 'tag.close', holder: 'tag' }, { part: 'timeline.name', holder: null }]);
});
