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
import { ArenaDoughnutChart } from './arena-doughnut-chart/ArenaDoughnutChart.tsx';
import { ArenaFunnelChart } from './arena-funnel-chart/ArenaFunnelChart.tsx';
import { ArenaSparkline } from './arena-sparkline/ArenaSparkline.tsx';
import { ArenaGaugeChart } from './arena-gauge-chart/ArenaGaugeChart.tsx';
import { ArenaHeatmapChart } from './arena-heatmap-chart/ArenaHeatmapChart.tsx';
import { forgetArenaWarnings } from '../../WarnOnce.ts';

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

function captureWarnings(body: () => void): string[] {
  const captured: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => { captured.push(args.map(String).join(' ')); };
  try { body(); } finally { console.warn = original; }
  return captured;
}

const FOUR_LABELS = ['A', 'B', 'C', 'D'];

test('colorStart: a doughnut of four slices without colorIds starts at slot 6 and wraps, on the ring and the legend', () => {
  const html = renderToStaticMarkup(<ArenaDoughnutChart label="Share" labels={FOUR_LABELS} series={[{ label: 'S', values: [10, 20, 30, 40] }]} colorStart={6} />);
  assert.deepEqual(marks(html, 'fill'), [6, 7, 8, 1]);
  assert.deepEqual(swatches(html), [6, 7, 8, 1]);
});

test(`colorStart: a doughnut's short colorIds resumes from colorStart`, () => {
  const html = renderToStaticMarkup(<ArenaDoughnutChart label="Share" labels={['A', 'B', 'C']} series={[{ label: 'S', values: [10, 20, 30], colorIds: [2] }]} colorStart={5} />);
  assert.deepEqual(marks(html, 'fill'), [2, 6, 7]);
  assert.deepEqual(swatches(html), [2, 6, 7]);
});

test('colorStart: a funnel takes colorStart for its stages', () => {
  const html = renderToStaticMarkup(<ArenaFunnelChart label="Pipeline" labels={['Visit', 'Sign up', 'Buy']} series={[{ label: 'S', values: [100, 50, 10] }]} colorStart={4} />);
  const slots = marks(html, 'fill');
  assert.ok(slots.length >= 3);
  assert.ok(slots.every((slot) => slot === 4), `every stage is slot 4, got ${slots}`);
});

test('colorStart: a sparkline takes colorStart for its line', () => {
  const html = renderToStaticMarkup(<ArenaSparkline label="Load" labels={['a', 'b', 'c']} series={[{ label: 'S', values: [1, 3, 2] }]} colorStart={5} />);
  const slots = marks(html, 'stroke');
  assert.ok(slots.length >= 1);
  assert.ok(slots.every((slot) => slot === 5), `the line is slot 5, got ${slots}`);
});

test('colorStart: a gauge without bands takes colorId, then colorStart', () => {
  const arc = (props: object) => new Set(marks(renderToStaticMarkup(<ArenaGaugeChart label="Fill" value={60} {...props} />), 'fill'));
  assert.ok(arc({ colorStart: 6 }).has(6));
  assert.ok(!arc({ colorStart: 6 }).has(1));
  assert.ok(arc({ colorStart: 6, colorId: 2 }).has(2));
  assert.ok(!arc({ colorStart: 6, colorId: 2 }).has(6));
});

test(`colorStart: a gauge with bands takes the band's tone and says nothing of colorStart`, () => {
  const bands = [{ from: 0, label: 'Low', tone: 'danger' as const }, { from: 50, label: 'High', tone: 'success' as const }];
  forgetArenaWarnings();
  let html = '';
  const warned = captureWarnings(() => { html = renderToStaticMarkup(<ArenaGaugeChart label="Fill" value={70} bands={bands} colorStart={6} />); });
  assert.deepEqual(warned, []);
  assert.ok(!marks(html, 'fill').includes(6));
  forgetArenaWarnings();
});

test('colorStart: a gauge value below the first band takes colorStart', () => {
  const bands = [{ from: 50, label: 'High', tone: 'success' as const }];
  const html = renderToStaticMarkup(<ArenaGaugeChart label="Fill" value={20} bands={bands} colorStart={6} />);
  assert.ok(marks(html, 'fill').includes(6));
});

test('colorStart: a heatmap accepts colorStart, ignores it and names it in its one warning', () => {
  const rows = [{ label: 'Mon', values: [1, 9] }, { label: 'Tue', values: [4, 5] }];
  const draw = (extra: object = {}) => renderToStaticMarkup(<ArenaHeatmapChart label="Hours" labels={['a', 'b']} series={rows} {...extra} />);
  const plain = draw();
  forgetArenaWarnings();
  let html = '';
  const warned = captureWarnings(() => { html = draw({ colorStart: 6 }); draw({ colorStart: 6 }); });
  assert.equal(warned.length, 1);
  assert.ok(warned[0]!.endsWith("ArenaHeatmapChart: a series' colorId, colorIds and tone, and the chart's colorStart, are ignored, because a cell's colour is its magnitude"));
  assert.equal(html, plain);
  forgetArenaWarnings();
});
