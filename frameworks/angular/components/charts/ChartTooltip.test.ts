import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaScrolledAnchorX, arenaTooltipAnchor } from './ChartTooltip';

test('the tooltip sits over the mark it reads, on the mark\'s own x', () => {
  assert.equal(arenaTooltipAnchor(120, 40).left, 120);
});

test('the tooltip clears the mark by the token, never by a number a chart picked', () => {

  assert.equal(arenaTooltipAnchor(120, 40).top, 'calc(40px - var(--chart-tooltip-offset))');
});

test('both charts anchor identically, which is the whole reason this is one function', () => {
  assert.deepEqual(arenaTooltipAnchor(0, 0), arenaTooltipAnchor(0, 0));
  assert.equal(arenaTooltipAnchor(7.5, 12.25).top, 'calc(12.25px - var(--chart-tooltip-offset))');
});

test('a mark at the plot ceiling still anchors above itself, and CSS is what clamps it', () => {

  assert.equal(arenaTooltipAnchor(10, 0).top, 'calc(0px - var(--chart-tooltip-offset))');
});

test('a scrolled rail moves the anchor left by the scroll, and the visible span holds it', () => {
  assert.equal(arenaScrolledAnchorX(315, 200, 300), 115);
  assert.equal(arenaScrolledAnchorX(315, 0, 300), 300, 'a mark past the right edge anchors at the edge');
  assert.equal(arenaScrolledAnchorX(10, 200, 300), 0, 'a mark scrolled out on the left anchors at the edge');
});
