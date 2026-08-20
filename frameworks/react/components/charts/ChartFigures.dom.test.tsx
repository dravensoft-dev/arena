/* One suite for the four charts, because `figure-with-data-table` is Arena's own
 * pattern and all four answer it identically: a role="img" graphic with a name,
 * and a real <table> of the same numbers that is HIDDEN VISUALLY rather than
 * removed. `alternative.table` is BEHAVIOURAL -- no single element decides it --
 * so each verdict below is earned by reading the table against the input data.
 * What no suite can check is whether the name is a GOOD one, which is why `label` is
 * required and guarded rather than defaulted. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React from 'react';
import { mount, cleanup, act } from '../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../test/AssertPattern.tsx';
import { ArenaBarChart } from './arena-bar-chart/ArenaBarChart.tsx';
import { ArenaDoughnutChart } from './arena-doughnut-chart/ArenaDoughnutChart.tsx';
import { ArenaLineChart } from './arena-line-chart/ArenaLineChart.tsx';
import { ArenaHorizontalBarChart } from './arena-horizontal-bar-chart/ArenaHorizontalBarChart.tsx';
import { ArenaPyramidChart } from './arena-pyramid-chart/ArenaPyramidChart.tsx';
import { ArenaRadarChart } from './arena-radar-chart/ArenaRadarChart.tsx';
import { ArenaScatterChart } from './arena-scatter-chart/ArenaScatterChart.tsx';
import type { ArenaSeries } from '../../Api.generated';

afterEach(cleanup);

const LABELS = ['Alpha', 'Beta', 'Gamma'];
const VALUES = [12, 30, 7];
const SERIES = 'Deliveries';
const CHART = 'Deliveries by region';

type ChartComponent = React.ComponentType<{
  labels: string[]; series: readonly ArenaSeries[]; label?: string;
}>;
const CHARTS: [string, ChartComponent, string, string][] = [
  ['ArenaBarChart', ArenaBarChart as unknown as ChartComponent, 'charts/arena-bar-chart/ArenaBarChart.behaviour.json', 'Category'],
  ['ArenaDoughnutChart', ArenaDoughnutChart as unknown as ChartComponent, 'charts/arena-doughnut-chart/ArenaDoughnutChart.behaviour.json', 'Category'],
  ['ArenaLineChart', ArenaLineChart as unknown as ChartComponent, 'charts/arena-line-chart/ArenaLineChart.behaviour.json', 'Point'],
  ['ArenaHorizontalBarChart', ArenaHorizontalBarChart as unknown as ChartComponent, 'charts/arena-horizontal-bar-chart/ArenaHorizontalBarChart.behaviour.json', 'Category'],
  ['ArenaRadarChart', ArenaRadarChart as unknown as ChartComponent, 'charts/arena-radar-chart/ArenaRadarChart.behaviour.json', 'Axis'],
];

function press(region: HTMLElement, key: string) {
  act(() => {
    region.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
}

function reading(root: HTMLElement): string | null {

  const tooltip = [...root.querySelectorAll<HTMLElement>('div')]
    .find((el) => el.style.position === 'absolute' && el.style.pointerEvents === 'none');
  return tooltip ? (tooltip.textContent ?? '').trim() : null;
}

const CURSOR_KEYS = ['focus.roving', 'keyboard.ArrowLeft', 'keyboard.ArrowRight',
  'keyboard.ArrowUp', 'keyboard.ArrowDown', 'keyboard.Home', 'keyboard.End', 'keyboard.Escape'] as const;

const ACROSS: Record<string, [string, string]> = {
  ArenaHorizontalBarChart: ['ArrowDown', 'ArrowUp'],
  ArenaPyramidChart: ['ArrowDown', 'ArrowUp'],
};

function unusedPair(axis: [string, string]): string[] {
  return axis[0] === 'ArrowDown' ? ['keyboard.ArrowLeft', 'keyboard.ArrowRight']
    : ['keyboard.ArrowUp', 'keyboard.ArrowDown'];
}

function noCursor(root: HTMLElement): Record<string, boolean> {

  const legend = root.querySelector<HTMLElement>('[role="group"]');
  assert.ok(legend, 'the ring answers the keyboard through its legend, so the legend is the group');
  assert.equal(legend.getAttribute('tabindex'), null,
    'the legend rows are the stops; a stop on their container would be a dead one in front of them');
  const rows = [...root.querySelectorAll<HTMLElement>('[role="group"] > button')];
  assert.equal(rows.length, VALUES.length, 'one reachable button per slice, so a slice is not walked to');

  press(legend, 'ArrowRight');
  assert.equal(reading(root), null, 'a ring has no sequence to arrow along, and pretending otherwise would be a lie');

  return Object.fromEntries(CURSOR_KEYS.map((key) => [key, false]));
}

function cursorVerdicts(root: HTMLElement, name: string): Record<string, boolean> {

  if (name === 'ArenaDoughnutChart') return noCursor(root);
  const [forward, backward] = ACROSS[name] ?? ['ArrowRight', 'ArrowLeft'];
  const region = root.querySelector<HTMLElement>('[role="group"]');
  assert.ok(region, 'the plot must be one keyboard region');
  assert.equal(root.querySelectorAll('[tabindex="0"]').length, 1,
    'one tab stop for the whole plot: the cursor moves inside it and never adds a second');

  assert.equal(reading(root), null, 'a chart at rest reads nothing');

  press(region, forward);
  const first = reading(root);
  assert.ok(first?.includes(LABELS[0]!), `${forward} from rest must land on the first point, got ${first}`);

  press(region, forward);
  assert.ok(reading(root)?.includes(LABELS[1]!), `${forward} steps forward`);

  press(region, backward);
  assert.ok(reading(root)?.includes(LABELS[0]!), `${backward} steps back`);

  press(region, backward);
  assert.ok(reading(root)?.includes(LABELS[0]!), 'and CLAMPS at the first, because an axis has ends');

  press(region, 'End');
  assert.ok(reading(root)?.includes(LABELS[LABELS.length - 1]!), 'End jumps to the last point');

  press(region, 'Home');
  assert.ok(reading(root)?.includes(LABELS[0]!), 'Home jumps to the first');

  const idle = unusedPair([forward, backward]);
  for (const key of idle) {
    press(region, key.replace('keyboard.', ''));
  }
  assert.ok(reading(root)?.includes(LABELS[0]!),
    `${idle.join(' and ')} must not move a cursor this chart has no sequence for, and must leave the page its scroll`);

  press(region, 'Escape');
  assert.equal(reading(root), null, 'Escape clears the cursor');

  return Object.fromEntries(CURSOR_KEYS.map((key) => [key, !idle.includes(key)]));
}

const BOTTOM_AXIS: [string, ChartComponent][] = [
  ['ArenaBarChart', ArenaBarChart as unknown as ChartComponent],
  ['ArenaLineChart', ArenaLineChart as unknown as ChartComponent],
];

function bottomAnchors(root: HTMLElement) {
  const texts = [...root.querySelectorAll('svg text')];
  const floor = Math.max(...texts.map((at) => Number(at.getAttribute('y') ?? Number.NaN)));
  const bottom = texts.filter((at) => Number(at.getAttribute('y')) === floor);
  assert.ok(bottom.length > 1, 'a bottom axis with one label is not an axis');
  return [...new Set(bottom.map((at) => at.getAttribute('text-anchor')))];
}

const CENTRED = 'a label clamped to start or end sits beside the mark it names rather than over it, '
  + 'and the reader takes it for the neighbour: the overhang at either end is the price, and it is '
  + 'the one the horizontal bar and the pyramid already pay on the same edge';

for (const [name, Chart] of BOTTOM_AXIS) {
  test(`${name} centres every label on its bottom axis over the mark that label names`, () => {
    const root = mount(<Chart labels={LABELS} series={[{ label: SERIES, values: VALUES }]} label={CHART} />);
    assert.deepEqual(bottomAnchors(root), ['middle'], CENTRED);
  });
}

test('ArenaScatterChart centres its bottom axis too, though those labels are monospaced', () => {
  const root = mount(
    <ArenaScatterChart label={CHART} xLabel="Load" yLabel="Latency"
      series={[{ label: SERIES, x: [1, 2, 3, 4, 5], y: VALUES }]} />,
  );
  assert.deepEqual(bottomAnchors(root), ['middle'], CENTRED);
});

for (const [name, Chart, tail, heading] of CHARTS) {
  test(`${name} pairs a named graphic with a real table of the same numbers`, () => {
    const root = mount(<Chart labels={LABELS} series={[{ label: SERIES, values: VALUES }]} label={CHART} />);

    const graphic = root.querySelector<HTMLElement>('[role="img"]');
    assert.ok(graphic, 'a chart with no role="img" is a decoration, not a figure');
    assert.match(graphic.getAttribute('aria-label') ?? '', /\S/, 'the graphic must carry a name');

    const table = root.querySelector<HTMLElement>('table');
    assert.ok(table, 'a chart with no data table is a picture nobody can read');

    const head = [...table.querySelectorAll<HTMLElement>('thead th')].map((c) => (c.textContent ?? '').trim());
    assert.deepEqual(head, [heading, SERIES],
      'the head names the row column and then each series by its OWN label, not by the chart\'s');

    const pairs = [...table.querySelectorAll<HTMLElement>('tbody tr')]
      .map((row) => [...row.querySelectorAll<HTMLElement>('th, td')].map((c) => (c.textContent ?? '').trim()));
    assert.deepEqual(pairs, LABELS.map((label, i) => [label, String(VALUES[i])]),
      'the table and the picture must not be able to disagree');

    assert.equal(table.hasAttribute('hidden'), false,
      'a hidden table is not an alternative -- it is no table at all');
    assert.equal(table.getAttribute('aria-hidden'), null, 'the table must stay in the accessibility tree');
    assert.notEqual(table.style.display, 'none', 'display:none removes it from the accessibility tree');
    assert.equal(table.style.position, 'absolute', 'the table is hidden by being taken out of flow, not by being removed');

    assertPattern({
      root,
      bindingPath: join(REACT_COMPONENTS, tail!),
      subjects: { default: graphic },
      behavioural: { 'alternative.table': true, ...cursorVerdicts(root, name) },
    });
  });

  test(`${name} refuses to render without a label rather than naming itself by type`, () => {
    assert.throws(
      () => mount(<Chart labels={LABELS} series={[{ label: SERIES, values: VALUES }]} />),
      /`label` is required/,
      'a name that is only the chart TYPE satisfies roles.label mechanically while telling a reader nothing, '
      + 'and two charts on one page then announce identically -- which is why this is guarded rather than defaulted',
    );
  });
}

const CARTESIAN: [string, ChartComponent][] = [
  ['ArenaBarChart', ArenaBarChart as unknown as ChartComponent],
  ['ArenaLineChart', ArenaLineChart as unknown as ChartComponent],
  ['ArenaHorizontalBarChart', ArenaHorizontalBarChart as unknown as ChartComponent],
  ['ArenaRadarChart', ArenaRadarChart as unknown as ChartComponent],
];

const TWO: readonly ArenaSeries[] = [
  { label: 'Delivered', values: VALUES },
  { label: 'Returned', values: [3, 8, 1] },
];

function strip(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>('[aria-hidden="true"]');
}

for (const [name, Chart] of CARTESIAN) {
  test(`${name} draws no legend for one series, because the chart label and the table column already name it`, () => {
    const root = mount(<Chart labels={LABELS} series={[{ label: SERIES, values: VALUES }]} label={CHART} />);
    assert.equal(strip(root), null, 'a one-row legend restates the chart name and spends plot height on nothing');
  });

  test(`${name} draws a legend naming every series once two of them share the plot`, () => {
    const root = mount(<Chart labels={LABELS} series={TWO} label={CHART} />);
    const legend = strip(root);
    assert.ok(legend, 'two series are indistinguishable without a key unless the reader points at them');
    for (const one of TWO) {
      assert.ok((legend.textContent ?? '').includes(one.label), `the legend does not name ${one.label}`);
    }
  });

  test(`${name} keeps its legend out of the accessibility tree and out of the tab order`, () => {

    const root = mount(<Chart labels={LABELS} series={TWO} label={CHART} />);
    const legend = strip(root)!;
    assert.equal(legend.getAttribute('aria-hidden'), 'true',
      'the accessible table already heads each column with the series label, and one source per fact is the rule '
      + 'that a second copy in the same DOM would break');
    assert.equal(legend.querySelectorAll('button, a, [tabindex]').length, 0,
      'a key is not a control: focusable rows would add one tab stop per series to a plot that has exactly one');
    assert.equal(root.querySelectorAll('[tabindex="0"]').length, 1,
      'the rail is the plot\'s only tab stop, legend or no legend');
  });

  test(`${name} takes the legend out of the plot, so the component is the height it was asked for`, () => {
    const one = mount(<Chart labels={LABELS} series={[{ label: SERIES, values: VALUES }]} label={CHART} />);
    const alone = one.querySelector('svg')!.getAttribute('height');
    cleanup();
    const two = mount(<Chart labels={LABELS} series={TWO} label={CHART} />);
    const shared = two.querySelector('svg')!.getAttribute('height');
    assert.equal(Number(alone) - Number(shared), 26,
      'the strip comes out of the plot rather than being added to the box, so --chart-height stays the whole component');
  });
}

test('a pyramid mirrors two counts about one centre line, and the table keeps both unsigned', () => {

  const root = mount(<ArenaPyramidChart labels={LABELS} label={CHART}
    series={[{ label: 'Women', values: VALUES }, { label: 'Men', values: [9, 27, 11] }]} />);

  const paths = [...root.querySelectorAll('path')].map((p) => p.getAttribute('d') ?? '');
  assert.equal(paths.length, 6, 'two sides per band, three bands');

  const starts = paths.map((d) => Number(/^M([\d.]+),/.exec(d)?.[1]));
  const centre = starts[0]!;
  assert.ok(starts.every((x) => Math.abs(x - centre) < 1e-9),
    `every bar leaves the same centre line, got ${starts.join(', ')}`);

  const reaches = paths.map((d) => Number(/L([\d.]+),/.exec(d)?.[1]));
  assert.ok(reaches.some((x) => x < centre), 'the first series runs left of the centre');
  assert.ok(reaches.some((x) => x > centre), 'the second runs right of it');

  const cells = [...root.querySelectorAll('tbody td')].map((c) => (c.textContent ?? '').trim());
  assert.ok(cells.every((c) => !c.startsWith('-')),
    'the left side is negated when it is DRAWN and never in the table, which reads the counts that were passed');
});

test('a pyramid writes its axis in magnitudes, because both sides count up from the centre', () => {
  const root = mount(<ArenaPyramidChart labels={LABELS} label={CHART}
    series={[{ label: 'Women', values: VALUES }, { label: 'Men', values: [9, 27, 11] }]} />);
  const ticks = [...root.querySelectorAll('text')].map((t) => (t.textContent ?? '').trim());
  assert.ok(ticks.some((t) => /^\d/.test(t)), 'the axis is written at all');
  assert.ok(!ticks.some((t) => t.startsWith('-')),
    'a tick reading -20 would say the left side is a debt rather than a count');
});

test('ArenaPyramidChart matches its binding, whose cursor walks bands and not bars', () => {
  const root = mount(<ArenaPyramidChart labels={LABELS} label={CHART}
    series={[{ label: 'Women', values: VALUES }, { label: 'Men', values: [9, 27, 11] }]} />);

  const graphic = root.querySelector<HTMLElement>('[role="img"]');
  assert.ok(graphic, 'a chart with no role="img" is a decoration, not a figure');

  const table = root.querySelector<HTMLElement>('table');
  const head = [...table!.querySelectorAll<HTMLElement>('thead th')].map((c) => (c.textContent ?? '').trim());
  assert.deepEqual(head, ['Category', 'Women', 'Men'], 'each side heads its own column under its own name');

  assertPattern({
    root,
    bindingPath: join(REACT_COMPONENTS, 'charts/arena-pyramid-chart/ArenaPyramidChart.behaviour.json'),
    subjects: { default: graphic },
    behavioural: { 'alternative.table': true, ...cursorVerdicts(root, 'ArenaPyramidChart') },
  });
});

const CLOUD = [
  { label: 'Staging', x: [12, 19, 24], y: [240, 310, 290] },
  { label: 'Production', x: [15, 22], y: [180, 205] },
];

test('ArenaScatterChart matches its binding, and its table names both quantities', () => {
  const root = mount(<ArenaScatterChart series={CLOUD} label={CHART}
    xLabel="Concurrent requests" yLabel="p95 latency" />);

  const graphic = root.querySelector<HTMLElement>('[role="img"]');
  assert.ok(graphic, 'a chart with no role="img" is a decoration, not a figure');

  const table = root.querySelector<HTMLElement>('table')!;
  const head = [...table.querySelectorAll<HTMLElement>('thead th')].map((c) => (c.textContent ?? '').trim());
  assert.deepEqual(head, ['Series', 'Concurrent requests', 'p95 latency'],
    'a table of bare X and Y columns names neither quantity, which is why both labels are required');

  const rows = [...table.querySelectorAll<HTMLElement>('tbody tr')]
    .map((row) => [...row.querySelectorAll<HTMLElement>('th, td')].map((c) => (c.textContent ?? '').trim()));
  assert.equal(rows.length, 5, 'one row per pair, across both series');
  assert.deepEqual(rows[0], ['Staging', '12', '240']);
  assert.deepEqual(rows[3], ['Production', '15', '180'], 'the second series follows the first');

  assert.equal(root.querySelectorAll('circle').length, 5, 'one mark per pair and no more');

  assertPattern({
    root,
    bindingPath: join(REACT_COMPONENTS, 'charts/arena-scatter-chart/ArenaScatterChart.behaviour.json'),
    subjects: { default: graphic },
    behavioural: {
      'alternative.table': true,
      'focus.roving': true,
      'keyboard.ArrowLeft': true,
      'keyboard.ArrowRight': true,
      'keyboard.ArrowUp': false,
      'keyboard.ArrowDown': false,
      'keyboard.Home': true,
      'keyboard.End': true,
      'keyboard.Escape': true,
    },
  });
});

test('ArenaScatterChart refuses to render without a name for either axis', () => {

  assert.throws(
    () => mount(<ArenaScatterChart series={CLOUD} label={CHART} xLabel="" yLabel="Y" />),
    /`xLabel` is required/,
    'the horizontal quantity names itself to nobody, and no fallback can derive it',
  );
  assert.throws(
    () => mount(<ArenaScatterChart series={CLOUD} label={CHART} xLabel="X" yLabel="" />),
    /`yLabel` is required/,
    'and neither does the vertical one',
  );
});

test('the cursor walks the marks in the order the table lists them, so the two readings agree', () => {

  const root = mount(<ArenaScatterChart series={CLOUD} label={CHART} xLabel="Requests" yLabel="Latency" />);
  const region = root.querySelector<HTMLElement>('[role="group"]')!;

  press(region, 'ArrowRight');
  assert.ok(reading(root)?.includes('Staging'), `the first mark is the first row, got ${reading(root)}`);

  for (let i = 0; i < 3; i += 1) press(region, 'ArrowRight');
  assert.ok(reading(root)?.includes('Production'),
    'walking past the end of one series enters the next, which is what the table does too');

  press(region, 'End');
  assert.ok(reading(root)?.includes('Production'), 'End lands on the last mark of the last series');

  press(region, 'Escape');
  assert.equal(reading(root), null);
});
