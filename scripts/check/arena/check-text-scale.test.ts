/* The judges of check:text-scale over the records its page hands back, so what the gate decides is
 * tested without a browser: that the root grew, which text did not double, what clips, what overlaps,
 * and an allowance that silences nothing. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ENLARGED_PX, rootProblems, doublingProblems, clipProblems, overlapProblems, staleAllowanceProblems,
  breakpointProblems, clippedBy, declaresTruncation, takesPartInFlow, collectExpression, type TextBox,
} from './check-text-scale.ts';

const box = (over: Partial<TextBox> = {}): TextBox => ({
  path: 'react/default:button>span', text: 'Save', fontSize: 16, clipX: false, clipY: false,
  truncates: false, rect: { left: 0, top: 0, right: 40, bottom: 20 }, parent: 'button', inFlow: true, ...over,
});

test('a root that did not grow fails', () => {
  assert.equal(ENLARGED_PX, 32);
  assert.deepEqual(rootProblems(32), []);
  const [problem] = rootProblems(16);
  assert.match(problem ?? '', /16px/);
  assert.match(problem ?? '', /32px/);
  assert.equal(rootProblems(24).length, 1);
});

test('text that did not double fails unless its slot is fixed', () => {
  const at16 = [box({ fontSize: 14 }), box({ path: 'a', fontSize: 12 })];
  assert.deepEqual(doublingProblems(at16, [box({ fontSize: 28 }), box({ path: 'a', fontSize: 24.4 })], new Map()), []);
  const stuck = doublingProblems(at16, [box({ fontSize: 14 }), box({ path: 'a', fontSize: 24 })], new Map());
  assert.equal(stuck.length, 1);
  assert.match(stuck[0] ?? '', /react\/default:button>span/);
  assert.match(stuck[0] ?? '', /14px/);
  assert.deepEqual(doublingProblems(at16, [box({ fontSize: 14 }), box({ path: 'a', fontSize: 24 })],
    new Map([['react/default:button>span', 'the wordmark is drawn at a fixed size']])), []);
});

test('a truncating slot is not a clip', () => {
  const clipped = box({ clipX: true });
  assert.equal(clipProblems([clipped], new Map()).length, 1);
  assert.deepEqual(clipProblems([box({ clipX: true, truncates: true })], new Map()), []);
  assert.deepEqual(clipProblems([box({ clipY: true, truncates: true })], new Map()), []);
  assert.deepEqual(clipProblems([clipped], new Map([[clipped.path, 'a scroller on purpose']])), []);
});

test('an absolutely positioned sibling is not an overlap', () => {
  const a = box({ path: 'a', rect: { left: 0, top: 0, right: 50, bottom: 20 } });
  const b = box({ path: 'b', rect: { left: 30, top: 5, right: 80, bottom: 25 } });
  assert.equal(overlapProblems([a, b], new Map()).length, 1);
  assert.deepEqual(overlapProblems([a, { ...b, inFlow: false }], new Map()), []);
  assert.deepEqual(overlapProblems([a, { ...b, parent: 'other' }], new Map()), []);
  assert.deepEqual(overlapProblems([a, { ...b, rect: { left: 50.5, top: 0, right: 90, bottom: 20 } }], new Map()), []);
  assert.deepEqual(overlapProblems([a, b], new Map([['b', 'stacked by design']])), []);
});

test('an allowance that silences nothing fails', () => {
  const allowed = new Map([['x', 'why'], ['y', 'why']]);
  const problems = staleAllowanceProblems(new Set(['x']), allowed);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /y/);
  assert.deepEqual(staleAllowanceProblems(new Set(['x', 'y']), allowed), []);
});

test('the md breakpoint falls between 1530 and 1540 at 32px', () => {
  assert.deepEqual(breakpointProblems({ bpMd: '48rem', below1530: true, below1540: false }), []);
  assert.equal(breakpointProblems({ bpMd: '768px', below1530: true, below1540: false }).length, 1);
  assert.equal(breakpointProblems({ bpMd: '48rem', below1530: false, below1540: false }).length, 1);
  assert.equal(breakpointProblems({ bpMd: '48rem', below1530: true, below1540: true }).length, 1);
});

test('a box drawn at 32 and absent at 16 fails', () => {
  const problems = doublingProblems([], [box({ fontSize: 28 })], new Map());
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /no box of that slot and text at 16px/);
});

test('a box drawn at 16 and gone at 32 fails', () => {
  const problems = doublingProblems([box()], [], new Map());
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /vanished or moved/);
});

test('a shifted ordinal cannot pair two different elements', () => {
  const at16 = [box({ path: 'x#0', text: 'Save', fontSize: 14 })];
  const at32 = [box({ path: 'x#0', text: 'Cancel', fontSize: 28 })];
  assert.equal(doublingProblems(at16, at32, new Map()).length, 2);
});

test('the ordinal of a slot counts it before any visibility skip, so a hidden sibling cannot shift it', () => {
  const expression = collectExpression('react', 'default', 'arena-compact');
  assert.ok(expression.indexOf('ordinalBeforeSkips = counts') < expression.indexOf('getClientRects().length === 0'));
});

test('a missing 16px reference is reported by the sweep as a problem, not skipped', async () => {
  const { readFileSync } = await import('node:fs');
  const source = readFileSync(new URL('./check-text-scale.ts', import.meta.url), 'utf8');
  assert.match(source, /no \$\{REFERENCE_PX\}px reference was measured/);
});

test('text is clipped only where its own box leaves a hidden or clipping box, not a scrolling one', () => {
  const inside = { left: 0, top: 0, right: 100, bottom: 40 };
  assert.deepEqual(clippedBy({ left: 10, top: 5, right: 90, bottom: 20 }, inside, 'hidden', 'hidden'),
    { clipX: false, clipY: false });
  assert.deepEqual(clippedBy({ left: 10, top: 5, right: 140, bottom: 20 }, inside, 'hidden', 'visible'),
    { clipX: true, clipY: false });
  assert.deepEqual(clippedBy({ left: 10, top: 5, right: 140, bottom: 20 }, inside, 'clip', 'visible'),
    { clipX: true, clipY: false });
  assert.deepEqual(clippedBy({ left: 10, top: 5, right: 140, bottom: 90 }, inside, 'auto', 'scroll'),
    { clipX: false, clipY: false });
  assert.deepEqual(clippedBy({ left: 10, top: 5, right: 100.5, bottom: 41 }, inside, 'hidden', 'hidden'),
    { clipX: false, clipY: false });
  assert.deepEqual(clippedBy({ left: 10, top: 5, right: 90, bottom: 50 }, inside, 'visible', 'hidden'),
    { clipX: false, clipY: true });
});

test('ellipsis and a line clamp are declared truncation, and nothing else is', () => {
  assert.equal(declaresTruncation({ textOverflow: 'ellipsis', lineClamp: 'none' }), true);
  assert.equal(declaresTruncation({ textOverflow: 'clip', lineClamp: '3' }), true);
  assert.equal(declaresTruncation({ textOverflow: 'clip', lineClamp: 'none' }), false);
  assert.equal(declaresTruncation({ textOverflow: 'clip', lineClamp: '' }), false);
});

test('an inline, floated, absolute or fixed box takes no part in overlap', () => {
  const base = { position: 'static', float: 'none', display: 'block' };
  assert.equal(takesPartInFlow(base), true);
  assert.equal(takesPartInFlow({ ...base, position: 'relative' }), true);
  assert.equal(takesPartInFlow({ ...base, position: 'absolute' }), false);
  assert.equal(takesPartInFlow({ ...base, position: 'fixed' }), false);
  assert.equal(takesPartInFlow({ ...base, float: 'left' }), false);
  assert.equal(takesPartInFlow({ ...base, display: 'inline' }), false);
});
