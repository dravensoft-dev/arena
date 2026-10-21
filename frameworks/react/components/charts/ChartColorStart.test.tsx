import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaBarChart } from './arena-bar-chart/ArenaBarChart.tsx';
import { ArenaHorizontalBarChart } from './arena-horizontal-bar-chart/ArenaHorizontalBarChart.tsx';
import { ArenaLineChart } from './arena-line-chart/ArenaLineChart.tsx';
import { ArenaRadarChart } from './arena-radar-chart/ArenaRadarChart.tsx';
import { ArenaPyramidChart } from './arena-pyramid-chart/ArenaPyramidChart.tsx';
import { ArenaScatterChart } from './arena-scatter-chart/ArenaScatterChart.tsx';

const NUMBERS = (count: number) => Array.from({ length: count }, (_, i) => i + 1);

function marks(html: string, attribute: 'fill' | 'stroke'): number[] {
  return [...html.matchAll(new RegExp(`${attribute}="var\\(--color-cat-(\\d)\\)"`, 'g'))].map((m) => Number(m[1]));
}

function swatches(html: string): number[] {
  return [...html.matchAll(/data-arena-color-id="(\d)"/g)].map((m) => Number(m[1]));
}

const ONE_CATEGORY = ['A'];
const four = (extra: object = {}) => NUMBERS(4).map((n) => ({ label: `S${n}`, values: [n * 10], ...extra }));

test('colorStart: a bar chart of four series starts at slot 6 and wraps to 1, on the bars and the swatches', () => {
  const html = renderToStaticMarkup(<ArenaBarChart label="Sales" labels={ONE_CATEGORY} series={four()} colorStart={6} />);
  assert.deepEqual(marks(html, 'fill'), [6, 7, 8, 1]);
  assert.deepEqual(swatches(html), [6, 7, 8, 1]);
});

test('colorStart: an explicit colorId and colorIds keep their slots under colorStart', () => {
  const two = renderToStaticMarkup(<ArenaBarChart label="Sales" labels={ONE_CATEGORY} colorStart={3}
    series={[{ label: 'A', values: [1], colorId: 9 }, { label: 'B', values: [2] }]} />);
  assert.deepEqual(marks(two, 'fill'), [8, 4]);
  assert.deepEqual(swatches(two), [8, 4]);
  const ids = renderToStaticMarkup(<ArenaBarChart label="Sales" labels={['A', 'B', 'C']} colorStart={3}
    series={[{ label: 'A', values: [1, 2, 3], colorIds: [2] }]} />);
  assert.deepEqual(marks(ids, 'fill'), [2, 4, 5]);
});

test('colorStart: a stacked bar rotates its segments as the grouped bars do', () => {
  const html = renderToStaticMarkup(<ArenaBarChart label="Sales" labels={ONE_CATEGORY} stack colorStart={8}
    series={NUMBERS(2).map((n) => ({ label: `S${n}`, values: [n] }))} />);
  assert.deepEqual(marks(html, 'fill'), [8, 1]);
  assert.deepEqual(swatches(html), [8, 1]);
});

test('colorStart: a line chart of nine series without colorStart gives the ninth slot 1', () => {
  const series = NUMBERS(9).map((n) => ({ label: `S${n}`, values: [n, n + 1, n + 2] }));
  const html = renderToStaticMarkup(<ArenaLineChart label="Load" labels={['a', 'b', 'c']} series={series} />);
  assert.deepEqual(marks(html, 'stroke'), [1, 2, 3, 4, 5, 6, 7, 8, 1]);
  assert.deepEqual(swatches(html), [1, 2, 3, 4, 5, 6, 7, 8, 1]);
});

test('colorStart: a horizontal bar chart starts at slot 7 and wraps, on the bars and the swatches', () => {
  const html = renderToStaticMarkup(<ArenaHorizontalBarChart label="Sales" labels={ONE_CATEGORY} series={four()} colorStart={7} />);
  assert.deepEqual(marks(html, 'fill'), [7, 8, 1, 2]);
  assert.deepEqual(swatches(html), [7, 8, 1, 2]);
});

test('colorStart: a radar chart starts at slot 7 and wraps, on the polygons and the swatches', () => {
  const series = NUMBERS(3).map((n) => ({ label: `S${n}`, values: [n, n + 1, n + 2] }));
  const html = renderToStaticMarkup(<ArenaRadarChart label="Skills" labels={['a', 'b', 'c']} series={series} colorStart={7} />);
  assert.deepEqual(marks(html, 'stroke'), [7, 8, 1]);
  assert.deepEqual(swatches(html), [7, 8, 1]);
});

test('colorStart: a pyramid chart starts at slot 7 and wraps, on both sides and the swatches', () => {
  const html = renderToStaticMarkup(<ArenaPyramidChart label="Age" labels={ONE_CATEGORY} series={four().slice(0, 2)} colorStart={7} />);
  assert.deepEqual(marks(html, 'fill'), [7, 8]);
  assert.deepEqual(swatches(html), [7, 8]);
});

test('colorStart: a scatter chart starts at slot 7 and wraps, on the marks and the swatches', () => {
  const series = NUMBERS(3).map((n) => ({ label: `S${n}`, x: [n], y: [n] }));
  const html = renderToStaticMarkup(<ArenaScatterChart label="Load" xLabel="Requests" yLabel="Latency" series={series} colorStart={7} />);
  assert.deepEqual(marks(html, 'fill'), [7, 8, 1]);
  assert.deepEqual(swatches(html), [7, 8, 1]);
});
