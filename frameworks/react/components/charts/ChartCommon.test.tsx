/* The bar, line and doughnut charts share four statics: a valueSuffix reaches what each draws
 * as a number, no suffix draws bare numbers, a label with no value at its index is dropped, and
 * a value with no label draws an empty label. One table per static, one row per chart. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaBarChart } from './arena-bar-chart/ArenaBarChart.tsx';
import { ArenaLineChart } from './arena-line-chart/ArenaLineChart.tsx';
import { ArenaDoughnutChart } from './arena-doughnut-chart/ArenaDoughnutChart.tsx';

type Chart = React.ComponentType<Record<string, unknown>>;
const bar = ArenaBarChart as unknown as Chart;
const line = ArenaLineChart as unknown as Chart;
const doughnut = ArenaDoughnutChart as unknown as Chart;

function draw(Chart: Chart, label: string, labels: string[], values: number[], suffix?: string) {
  return renderToStaticMarkup(
    <Chart label={label} labels={labels} series={[{ label, values }]} {...(suffix === undefined ? {} : { valueSuffix: suffix })} />,
  );
}

const SUFFIX = [
  { name: 'ArenaBarChart', Chart: bar, label: 'Deploys', labels: ['Mon', 'Tue', 'Wed'], values: [12, 30, 7], suffix: ' ms', ticks: true },
  { name: 'ArenaLineChart', Chart: line, label: 'p95', labels: ['Mon', 'Tue', 'Wed'], values: [120, 138, 131], suffix: ' ms', ticks: true },
  { name: 'ArenaDoughnutChart', Chart: doughnut, label: 'Traffic by region', labels: ['Web', 'API', 'Worker'], values: [420, 310, 140], suffix: ' rps', ticks: false },
];

const BARE = [
  { name: 'ArenaBarChart', Chart: bar, label: 'Deployments per week', labels: ['Mon', 'Tue', 'Wed'], values: [12, 30, 7] },
  { name: 'ArenaLineChart', Chart: line, label: 'p95 latency', labels: ['Mon', 'Tue', 'Wed'], values: [120, 138, 131] },
  { name: 'ArenaDoughnutChart', Chart: doughnut, label: 'Traffic by region', labels: ['Web', 'API', 'Worker'], values: [420, 310, 140] },
];

const SURPLUS = [
  { name: 'ArenaBarChart', Chart: bar, label: 'Deployments per week', suffix: undefined, noUndefined: false },
  { name: 'ArenaLineChart', Chart: line, label: 'p95 latency', suffix: undefined, noUndefined: false },
  { name: 'ArenaDoughnutChart', Chart: doughnut, label: 'Traffic by region', suffix: ' rps', noUndefined: true },
];

const EMPTY_LABEL = [
  { name: 'ArenaBarChart', Chart: bar, label: 'Deployments per week' },
  { name: 'ArenaLineChart', Chart: line, label: 'p95 latency' },
  { name: 'ArenaDoughnutChart', Chart: doughnut, label: 'Traffic by region' },
];

test('a valueSuffix reaches the table, and the axis ticks or the legend, of each chart', () => {
  assert.ok(SUFFIX.length > 0, 'no row');
  for (const row of SUFFIX) {
    const html = draw(row.Chart, row.label, row.labels, row.values, row.suffix);
    if (row.ticks) {
      const ticks = [...html.matchAll(/dz-text-2xs\)">([^<]*)</g)].map((m) => m[1] as string);
      assert.ok(ticks.length >= 2, `${row.name}: no axis ticks were drawn: ${JSON.stringify(ticks)}`);
      assert.ok(ticks.every((tick) => tick.endsWith(row.suffix)),
        `${row.name}: a tick was written without the suffix: ${JSON.stringify(ticks)}`);
    }
    for (const v of row.values) {
      assert.match(html, new RegExp(`<td>${v}${row.suffix}</td>`), `${row.name}: the ${v} row carries the suffix`);
      if (!row.ticks) {
        assert.equal((html.match(new RegExp(`${v}${row.suffix}`, 'g')) ?? []).length, 2,
          `${row.name}: ${v} should appear in both the legend and the table`);
      }
    }
  }
});

test('with no valueSuffix a chart draws bare numbers, so the suffix is genuinely optional', () => {
  assert.ok(BARE.length > 0, 'no row');
  for (const row of BARE) {
    const html = draw(row.Chart, row.label, row.labels, row.values);
    for (const v of row.values) assert.match(html, new RegExp(`<td>${v}</td>`), `${row.name}: the ${v} row is bare`);
    assert.doesNotMatch(html, /undefined/, `${row.name}: an absent suffix must not render the string "undefined"`);
  }
});

test('a label with no value at its index is dropped, rather than drawn over empty plot', () => {
  assert.ok(SURPLUS.length > 0, 'no row');
  for (const row of SURPLUS) {
    const html = draw(row.Chart, row.label, ['Alpha', 'Beta', 'SURPLUS'], [10, 20], row.suffix);
    assert.doesNotMatch(html, /SURPLUS/, `${row.name}: a label with no value at its index reached the chart`);
    if (row.noUndefined) assert.doesNotMatch(html, /undefined/, `${row.name}: the surplus legend row printed "undefined" as its value`);
    assert.match(html, />Alpha</, `${row.name}: the first label is drawn`);
    assert.match(html, />Beta</, `${row.name}: the second label is drawn`);
  }
});

test('a value with no label draws an empty label, rather than throwing or printing undefined', () => {
  assert.ok(EMPTY_LABEL.length > 0, 'no row');
  for (const row of EMPTY_LABEL) {
    const html = draw(row.Chart, row.label, ['Only'], [10, 20]);
    assert.doesNotMatch(html, /undefined/, `${row.name}: a value with no label rendered the string "undefined"`);
    assert.match(html, />Only</, `${row.name}: the one supplied label still renders`);
    assert.match(html, /<td>20<\/td>/, `${row.name}: the unlabelled value is still plotted and still in the table`);
  }
});
