import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { forgetArenaWarnings } from '../../../WarnOnce.ts';
import { ARENA_PAD } from '../../../DataVisuals.ts';
import { arenaHeatmapHeight } from '../ChartAxis.ts';
import { chartHeatmapRowH, chartLegendStrip, chartPadCategory } from '../../../Tokens.generated.js';
import { ArenaHeatmapChart } from './ArenaHeatmapChart.tsx';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const DAYS = ['Mon', 'Tue', 'Wed'];
const ROWS = DAYS.map((label, d) => ({ label, values: HOURS.map((_, h) => (d + 1) * 10 * (h + 1)) }));

const draw = (props: Partial<React.ComponentProps<typeof ArenaHeatmapChart>> = {}) => renderToStaticMarkup(
  <ArenaHeatmapChart label="Sign-ups by hour" labels={HOURS} series={ROWS} {...props} />,
);

function captureWarnings(body: () => void): string[] {
  const captured: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => { captured.push(args.map(String).join(' ')); };
  try { body(); } finally { console.warn = original; }
  return captured;
}

const attr = (tag: string, name: string) => new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(tag)?.[1];
const cells = (html: string) => [...html.matchAll(/<rect [^>]*rx="[^"]*"[^>]*>/g)].map((m) => m[0]).filter((tag) => attr(tag, 'fill') !== 'none' || attr(tag, 'stroke') !== 'var(--ink-body)');
const fills = (html: string) => cells(html).map((tag) => attr(tag, 'fill'));
const texts = (html: string) => [...html.matchAll(/<text ([^>]*)>([^<]*)<\/text>/g)].map((m) => ({
  anchor: attr(m[1] as string, 'text-anchor'), text: m[2] as string,
}));
const table = (html: string) => ({
  head: [...html.matchAll(/<th>([^<]*)<\/th>/g)].map((m) => m[1]),
  rows: [...html.matchAll(/<tr><th scope="row">([^<]*)<\/th>((?:<td>[^<]*<\/td>)+)<\/tr>/g)]
    .map((m) => [m[1], ...[...(m[2] as string).matchAll(/<td>([^<]*)<\/td>/g)].map((c) => c[1])]),
});
const legend = (html: string) => [...html.matchAll(/<span [^>]*data-arena-part="heatmap-chart\.legend-swatch"[^>]*>/g)].map((m) => /style="background:([^"]*)"/.exec(m[0])?.[1]);
const legendLabels = (html: string) => [...html.matchAll(/data-arena-part="heatmap-chart\.legend-label"[^>]*>([^<]*)</g)].map((m) => m[1]);
const svgWidth = (html: string) => /<svg [^>]*width="([^"]*)"/.exec(html)?.[1];

test('ArenaHeatmapChart is a named figure whose table has a column per label and a row per series', () => {
  const html = draw();
  assert.match(html, /<svg [^>]*role="img" aria-label="Sign-ups by hour — heatmap"/);
  assert.match(html, /<caption>Sign-ups by hour — heatmap<\/caption>/);
  const { head, rows } = table(html);
  assert.deepEqual(head, ['Row', ...HOURS]);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((row) => row[0]), DAYS, 'each row is headed by its series, as a row header');
  assert.equal(rows[0]!.length, 1 + HOURS.length);
  assert.deepEqual(rows[1]!.slice(1, 4), ['20', '40', '60']);
  assert.equal(cells(html).length, 72, 'one rect per cell');
});

test('ArenaHeatmapChart leaves a short row as empty cells and outlined, unfilled rects', () => {
  const html = draw({ labels: ['a', 'b', 'c', 'd'], series: [{ label: 'Full', values: [1, 2, 3, 4] }, { label: 'Short', values: [4, 3] }] });
  const { rows } = table(html);
  assert.deepEqual(rows[1], ['Short', '4', '3', '', '']);
  const drawn = cells(html);
  const open = drawn.filter((tag) => attr(tag, 'fill') === 'none');
  assert.equal(open.length, 2, 'two cells have no value');
  for (const tag of open) {
    assert.equal(attr(tag, 'stroke'), 'var(--edge-separator)');
    assert.match(tag, /stroke-width:var\(--bw\)/);
  }
  assert.equal(drawn.filter((tag) => attr(tag, 'fill') !== 'none').length, 6);
});

test('ArenaHeatmapChart draws a NaN cell as an outline and never as the lowest step', () => {
  const html = draw({ labels: ['a', 'b', 'c'], series: [{ label: 'Row', values: [0, Number.NaN, 100] }] });
  const drawn = cells(html);
  assert.equal(attr(drawn[1] as string, 'fill'), 'none');
  assert.equal(attr(drawn[1] as string, 'stroke'), 'var(--edge-separator)');
  assert.equal(drawn.filter((tag) => attr(tag, 'fill') === 'var(--color-heat-1)').length, 1, 'only the real zero is step 1');
  assert.deepEqual(table(html).rows[0], ['Row', '0', '', '100']);
});

test('ArenaHeatmapChart paints a 0-to-max ramp in steps 1 to 5, in order', () => {
  const html = draw({ labels: ['a', 'b', 'c', 'd', 'e'], series: [{ label: 'Row', values: [0, 25, 45, 65, 100] }] });
  assert.deepEqual(fills(html), [1, 2, 3, 4, 5].map((n) => `var(--color-heat-${n})`));
});

test('ArenaHeatmapChart puts a value on a bin edge in the higher bin and the maximum in the top one', () => {
  const html = draw({ labels: ['a', 'b', 'c', 'd'], series: [{ label: 'Row', values: [19, 20, 99, 100] }] });
  assert.deepEqual(fills(html), [1, 2, 5, 5].map((n) => `var(--color-heat-${n})`));
});

test('ArenaHeatmapChart puts a decimal value on an edge in the higher step and writes round legend edges', () => {
  const html = draw({ labels: ['a', 'b', 'c'], series: [{ label: 'Row', values: [0.1, 0.6, 0.7] }] });
  assert.deepEqual(fills(html), [1, 4, 4].map((n) => `var(--color-heat-${n})`));
  assert.deepEqual(legendLabels(html), ['0', '0.2', '0.4', '0.6', '0.8']);
});

test('ArenaHeatmapChart keys its legend with five swatches and the lower edge of each step, written by the value writer', () => {
  const html = draw({ labels: ['a', 'b'], series: [{ label: 'Row', values: [0, 5000] }], valueFormat: { grouping: true }, valueSuffix: ' hits' });
  assert.deepEqual(legend(html), [1, 2, 3, 4, 5].map((n) => `var(--color-heat-${n})`));
  assert.deepEqual(legendLabels(html), ['0 hits', '1,000 hits', '2,000 hits', '3,000 hits', '4,000 hits']);
  assert.match(html, /<div aria-hidden="true"[^>]*heatmap-chart\.legend"/);
});

test('ArenaHeatmapChart computes its height from the row count and takes one that is passed', () => {
  const frame = (html: string) => Number(/<div [^>]*data-arena-part="heatmap-chart\.frame"[^>]*style="height:(\d+(?:\.\d+)?)px"/.exec(html)?.[1]);
  const plot = (html: string) => Number(/<svg [^>]*height="([^"]*)"/.exec(html)?.[1]);
  const two = draw({ series: ROWS.slice(0, 2) });
  const three = draw();
  assert.equal(frame(two), arenaHeatmapHeight(2));
  assert.equal(frame(three) - frame(two), chartHeatmapRowH, 'a row adds one pitch');
  assert.equal(frame(two), 2 * chartHeatmapRowH + ARENA_PAD.t + ARENA_PAD.b + chartLegendStrip);
  assert.equal(plot(three), frame(three) - chartLegendStrip, 'the legend strip comes out of the height');
  const room = frame(three) + chartHeatmapRowH;
  assert.equal(frame(draw({ height: room })), room);
  assert.equal(plot(draw({ height: room })), room - chartLegendStrip);
});

test('ArenaHeatmapChart overflows its rail only when a column cannot be narrower than minCellWidth', () => {
  assert.equal(svgWidth(draw()), '100%', 'absent, the plot fits its container');
  assert.equal(svgWidth(draw({ minCellWidth: 10 })), '100%', 'a floor the container already meets changes nothing');
  assert.equal(Number(svgWidth(draw({ minCellWidth: 40 }))), chartPadCategory + ARENA_PAD.r + 40 * HOURS.length);
  assert.match(draw({ minCellWidth: 40 }), /overflow-x:auto/);
  assert.match(draw(), /overflow-x:visible/, 'a rail that does not scroll lets the end label overhang');
});

test('ArenaHeatmapChart draws every nth column label when they would collide, and names every column in the table', () => {
  const long = Array.from({ length: 24 }, (_, i) => `Hour ${String(i).padStart(2, '0')}`);
  const html = draw({ labels: long });
  const drawn = texts(html).filter((t) => t.anchor === 'middle');
  assert.ok(drawn.length > 0 && drawn.length < long.length, `a stride drew ${drawn.length} of ${long.length}`);
  assert.equal(drawn[0]!.text, 'Hour 00', 'the first column is always named');
  assert.deepEqual(table(html).head, ['Row', ...long], 'the table keeps every column');
  assert.equal(texts(draw()).filter((t) => t.anchor === 'middle').length, HOURS.length, 'two-character labels fit at this width');
});

test('ArenaHeatmapChart names each row down the left gutter', () => {
  assert.deepEqual(texts(draw()).filter((t) => t.anchor === 'end').map((t) => t.text), DAYS);
});

test('ArenaHeatmapChart warns once that identity and meaning are ignored, and paints the same fills', () => {
  forgetArenaWarnings();
  const plain = draw({ labels: ['a', 'b'], series: [{ label: 'Row', values: [1, 9] }] });
  const marked = () => draw({ labels: ['a', 'b'], series: [{ label: 'Row', values: [1, 9], colorId: 3 }, { label: 'Two', values: [1, 9], tone: 'danger' }, { label: 'Three', values: [1, 9], colorIds: [1, 2] }] });
  forgetArenaWarnings();
  const warned = captureWarnings(() => { marked(); marked(); });
  assert.equal(warned.length, 1);
  assert.match(warned[0] as string, /ArenaHeatmapChart: a series' colorId, colorIds and tone, and the chart's colorStart, are ignored, because a cell's colour is its magnitude/);
  assert.deepEqual(fills(marked()).slice(0, 2), fills(plain));
  forgetArenaWarnings();
  assert.deepEqual(captureWarnings(() => { draw(); }), [], 'a plain series warns of nothing');
});

test('ArenaHeatmapChart throws on a missing label, labels or series', () => {
  assert.throws(() => draw({ label: '' }), /ArenaHeatmapChart: `label` is required/);
  assert.throws(() => draw({ labels: undefined as never }), /ArenaHeatmapChart: `labels` is required/);
  assert.throws(() => draw({ series: undefined as never }), /ArenaHeatmapChart: `series` is required/);
});

test('ArenaHeatmapChart with no rows draws an empty grid and its legend without throwing', () => {
  const html = draw({ series: [], labels: [] });
  assert.equal(cells(html).length, 0);
  assert.equal(legend(html).length, 5);
});
