import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaBelowQuery, arenaBreakpointPx, arenaTextScaleOf } from '../RootScale';

test('a rem breakpoint is read against the root font size', () => {
  assert.equal(arenaBreakpointPx('48rem', '32px'), 1536);
  assert.equal(arenaBreakpointPx('48rem', '16px'), 768);
  assert.equal(arenaBreakpointPx('48rem', '10px'), 480);
});

test('a px breakpoint stays px', () => {
  assert.equal(arenaBreakpointPx('800px', '32px'), 800);
  assert.equal(arenaBelowQuery('800px'), 'not all and (min-width: 800px)');
  assert.ok(Number.isNaN(arenaBreakpointPx('50vw', '16px')));
  assert.equal(arenaBelowQuery('50vw'), null);
});

test('the viewport query is in em for a rem token', () => {
  assert.equal(arenaBelowQuery('48rem'), 'not all and (min-width: 48em)');
});

test('an unreadable root reads as the default', () => {
  assert.equal(arenaTextScaleOf(''), 1);
  assert.equal(arenaTextScaleOf(undefined), 1);
  assert.equal(arenaTextScaleOf('0px'), 1);
  assert.equal(arenaTextScaleOf('32px'), 2);
  assert.equal(arenaBreakpointPx('48rem', ''), 768);
});
