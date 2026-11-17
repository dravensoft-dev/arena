/* The judges of check:text-scale over the records its page hands back, so what the gate decides is
 * tested without a browser: that the root grew, which text did not double, what clips, what overlaps,
 * and an allowance that silences nothing. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ENLARGED_PX, rootProblems, doublingProblems, clipProblems, overlapProblems, staleAllowanceProblems,
  breakpointProblems, type TextBox,
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
