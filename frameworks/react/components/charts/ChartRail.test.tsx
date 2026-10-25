/* `minPointSpacing` is the member that lets a chart refuse to compress. The width it computes is
 * pure arithmetic and is asserted directly; what a suite cannot see is the scroll position, since
 * this render has no layout, so scrollWidth is zero and the anchor-to-the-right effect has
 * nothing to measure. That half is on the by-hand list in the prompt. */

import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { arenaPlotWidth, ARENA_PAD } from '../../DataVisuals.ts';
import { arenaRailReveal } from './ChartRailView.ts';
import { ArenaLineChart } from './arena-line-chart/ArenaLineChart.tsx';

test('with no minPointSpacing the plot is exactly the width it was given', () => {
  assert.equal(arenaPlotWidth(390, 30, undefined), 390);
  assert.equal(arenaPlotWidth(390, 30, 0), 390, 'and zero is not a spacing, it is an absence');
});

test('above the floor the plot still fits, because the rule is a MINIMUM and not a step', () => {
  assert.equal(arenaPlotWidth(1200, 5, 35), 1200);
});

test('below the floor the plot outgrows its box by exactly what the gaps need', () => {
  assert.equal(arenaPlotWidth(390, 30, 35), ARENA_PAD.l + ARENA_PAD.r + 35 * 29);
});

test('one point cannot be too close to anything, so nothing overflows', () => {
  assert.equal(arenaPlotWidth(390, 1, 35), 390);
  assert.equal(arenaPlotWidth(390, 0, 35), 390);
});

const labels = Array.from({ length: 30 }, (_, i) => `d${i}`);
const values = Array.from({ length: 30 }, (_, i) => i + 1);

const rail = (minPointSpacing?: number) => renderToStaticMarkup(
  <ArenaLineChart labels={labels} series={[{ label: 'Revenue', values: values }]} label="Revenue" minPointSpacing={minPointSpacing} />,
);

test('the plot is a keyboard region whether it overflows or not', () => {

  for (const [what, html] of [['fits', rail(undefined)], ['overflows', rail(35)]] as const) {
    assert.match(html, /tabindex="0"/, `${what}: the data cursor needs somewhere to live`);
    assert.match(html, /role="group"/, what);
    assert.match(html, /aria-label="Revenue[^"]*"/,
      'the region takes the chart\'s own name, so it is not announced as an unnamed group');
  }
});

test('the region is exactly one tab stop, however many marks the plot holds', () => {

  const html = rail(35);
  assert.equal((html.match(/tabindex="0"/g) ?? []).length, 1,
    'thirty points must not be thirty stops: the cursor moves inside the region, it does not add to it');
});

test('a span inside the rail\'s view leaves the scroll position as it is', () => {
  assert.equal(arenaRailReveal(120, 180, 100, 200), 100);
});

test('a span that begins before the view scrolls to its start', () => {
  assert.equal(arenaRailReveal(40, 90, 100, 200), 40);
});

test('a span that ends past the view scrolls so its end meets the view\'s edge', () => {
  assert.equal(arenaRailReveal(260, 340, 100, 200), 140);
});

test('a span wider than the view that begins before it shows its start', () => {
  assert.equal(arenaRailReveal(40, 500, 100, 200), 40);
});

test('a span wider than the view that begins inside it is scrolled to its end', () => {
  assert.equal(arenaRailReveal(150, 500, 100, 200), 300);
});

test('a line rail that does not scroll lets the end label overhang, and one that scrolls clips', () => {
  assert.match(rail(undefined), /overflow-x:visible/);
  assert.match(rail(35), /overflow-x:auto/);
});
