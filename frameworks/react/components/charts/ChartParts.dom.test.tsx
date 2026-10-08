/* The legend and the tooltip of every chart are drawn from the chart's manifest:
 * each carries its data-arena-part and none of the inline properties the manifest
 * answers. What stays inline is a value the render computes. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../test/Harness.tsx';
import { ArenaBarChart } from './arena-bar-chart/ArenaBarChart.tsx';
import { ArenaDoughnutChart } from './arena-doughnut-chart/ArenaDoughnutChart.tsx';
import { ArenaLineChart } from './arena-line-chart/ArenaLineChart.tsx';
import { ArenaHorizontalBarChart } from './arena-horizontal-bar-chart/ArenaHorizontalBarChart.tsx';
import { ArenaPyramidChart } from './arena-pyramid-chart/ArenaPyramidChart.tsx';
import { ArenaRadarChart } from './arena-radar-chart/ArenaRadarChart.tsx';
import { ArenaScatterChart } from './arena-scatter-chart/ArenaScatterChart.tsx';

if (!globalThis.document) {
  throw new Error('A .dom.test. suite needs its DOM installed before react-dom is evaluated; run it with the React preload.');
}

afterEach(cleanup);

const LABELS = ['Alpha', 'Beta', 'Gamma'];
const TWO = [{ label: 'North', values: [12, 30, 7] }, { label: 'South', values: [5, 9, 14] }];
const CLOUD = [
  { label: 'Staging', x: [12, 19, 24], y: [240, 310, 290] },
  { label: 'Production', x: [15, 22], y: [180, 205] },
];

const SERIES_CHARTS: [string, string, () => React.ReactElement][] = [
  ['ArenaBarChart', 'bar-chart', () => <ArenaBarChart labels={LABELS} series={TWO} label="Deliveries" />],
  ['ArenaHorizontalBarChart', 'horizontal-bar-chart', () => <ArenaHorizontalBarChart labels={LABELS} series={TWO} label="Deliveries" />],
  ['ArenaLineChart', 'line-chart', () => <ArenaLineChart labels={LABELS} series={TWO} label="Deliveries" />],
  ['ArenaPyramidChart', 'pyramid-chart', () => <ArenaPyramidChart labels={LABELS} series={TWO} label="Deliveries" />],
  ['ArenaRadarChart', 'radar-chart', () => <ArenaRadarChart labels={LABELS} series={TWO} label="Deliveries" />],
  ['ArenaScatterChart', 'scatter-chart', () => <ArenaScatterChart series={CLOUD} label="Latency" xLabel="Requests" yLabel="p95" />],
];

for (const [name, part, render] of SERIES_CHARTS) {
  test(`${name} draws its legend item and tooltip from the manifest`, () => {
    const root = mount(render());
    const item = root.querySelector<HTMLElement>(`[data-arena-part="${part}.legend-item"]`);
    assert.ok(item, `${name} draws no legend item part`);
    assert.equal(item.style.gap, '', 'the legend item carries no inline gap');

    const region = root.querySelector<HTMLElement>('[role="group"]')!;
    act(() => {
      region.dispatchEvent(new KeyboardEvent('keydown', { key: ['horizontal-bar-chart', 'pyramid-chart'].includes(part) ? 'ArrowDown' : 'ArrowRight', bubbles: true, cancelable: true }));
    });
    const tooltip = root.querySelector<HTMLElement>(`[data-arena-part="${part}.tooltip"]`);
    assert.ok(tooltip, `${name} draws no tooltip part`);
    assert.equal(tooltip.style.padding, '', 'the tooltip carries no inline padding');
    assert.equal(tooltip.style.background, '', 'the tooltip carries no inline background');
  });
}

const TONED_CHARTS: [string, string, (series: object[]) => React.ReactElement][] = [
  ['ArenaBarChart', 'bar-chart', (series) => <ArenaBarChart labels={LABELS} series={series as never} label="Deliveries" />],
  ['ArenaHorizontalBarChart', 'horizontal-bar-chart', (series) => <ArenaHorizontalBarChart labels={LABELS} series={series as never} label="Deliveries" />],
  ['ArenaLineChart', 'line-chart', (series) => <ArenaLineChart labels={LABELS} series={series as never} label="Deliveries" />],
  ['ArenaPyramidChart', 'pyramid-chart', (series) => <ArenaPyramidChart labels={LABELS} series={series as never} label="Deliveries" />],
  ['ArenaRadarChart', 'radar-chart', (series) => <ArenaRadarChart labels={LABELS} series={series as never} label="Deliveries" />],
];

for (const [name, part, render] of TONED_CHARTS) {
  test(`${name} paints a legend swatch through an attribute, a tone for a toned series and a colour id otherwise`, () => {
    const root = mount(render([{ label: 'North', values: [12, 30, 7], tone: 'success' }, { label: 'South', values: [5, 9, 14], colorId: 9 }]));
    const swatches = root.querySelectorAll<HTMLElement>(`[data-arena-part="${part}.legend-swatch"]`);
    assert.equal(swatches.length, 2);
    assert.equal(swatches[0]!.getAttribute('data-arena-tone'), 'success');
    assert.equal(swatches[0]!.hasAttribute('data-arena-color-id'), false);
    assert.equal(swatches[1]!.getAttribute('data-arena-color-id'), '8');
    assert.equal(swatches[1]!.hasAttribute('data-arena-tone'), false);
    for (const swatch of swatches) assert.equal(swatch.style.background, '', 'the swatch carries no inline background');
  });
}

test('ArenaScatterChart swatches read tone or colour id from the series, by position when it names neither', () => {
  const root = mount(<ArenaScatterChart series={[{ ...CLOUD[0]!, tone: 'danger' }, CLOUD[1]!]} label="Latency" xLabel="Requests" yLabel="p95" />);
  const swatches = root.querySelectorAll<HTMLElement>('[data-arena-part="scatter-chart.legend-swatch"]');
  assert.equal(swatches[0]!.getAttribute('data-arena-tone'), 'danger');
  assert.equal(swatches[1]!.getAttribute('data-arena-color-id'), '2');
  for (const swatch of swatches) assert.equal(swatch.style.background, '');
});

test('ArenaDoughnutChart legend swatches carry a colour id by slice position, or the series tone', () => {
  const plain = mount(<ArenaDoughnutChart labels={LABELS} series={[{ label: 'North', values: [12, 30, 7] }]} label="Deliveries" />);
  const ids = [...plain.querySelectorAll('[data-arena-part="doughnut-chart.legend-swatch"]')].map((one) => one.getAttribute('data-arena-color-id'));
  assert.deepEqual(ids, ['1', '2', '3']);
  const toned = mount(<ArenaDoughnutChart labels={LABELS} series={[{ label: 'North', values: [12, 30, 7], tone: 'info' }]} label="Deliveries" />);
  for (const one of toned.querySelectorAll<HTMLElement>('[data-arena-part="doughnut-chart.legend-swatch"]')) {
    assert.equal(one.getAttribute('data-arena-tone'), 'info');
    assert.equal(one.style.background, '');
  }
});

test('ArenaDoughnutChart draws its legend row from the manifest', () => {
  const root = mount(<ArenaDoughnutChart labels={LABELS} series={[{ label: 'North', values: [12, 30, 7] }]} label="Deliveries" />);
  const row = root.querySelector<HTMLElement>('[data-arena-part="doughnut-chart.legend-row"]');
  assert.ok(row, 'ArenaDoughnutChart draws no legend row part');
  assert.equal(row.style.gap, '', 'the legend row carries no inline gap');
});

const FRAME_CHARTS: [string, string, () => React.ReactElement][] = [
  ...SERIES_CHARTS,
  ['ArenaDoughnutChart', 'doughnut-chart', () => <ArenaDoughnutChart labels={LABELS} series={[{ label: 'North', values: [12, 30, 7] }]} label="Deliveries" />],
];

for (const [name, part, render] of FRAME_CHARTS) {
  test(`${name} draws inside its frame part, with the frame class and no inline position or width`, () => {
    const root = mount(render());
    const frame = root.querySelector<HTMLElement>(`[data-arena-part="${part}.frame"]`);
    assert.ok(frame, `${name} draws no frame part`);
    assert.ok(frame.className.split(' ').includes(`arena-${part}__frame`), 'the frame carries its generated class');
    assert.equal(frame.style.position, '');
    assert.equal(frame.style.width, '');
    if (part === 'doughnut-chart') assert.equal(frame.getAttribute('style'), null, 'the doughnut frame carries no inline style');
  });
}
