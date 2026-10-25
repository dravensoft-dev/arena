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
import { assertPattern, assertPatternCases, REACT_COMPONENTS } from '../../test/AssertPattern.tsx';
import { ArenaBarChart } from './arena-bar-chart/ArenaBarChart.tsx';
import { ArenaDoughnutChart } from './arena-doughnut-chart/ArenaDoughnutChart.tsx';
import { ArenaLineChart } from './arena-line-chart/ArenaLineChart.tsx';
import { ArenaHorizontalBarChart } from './arena-horizontal-bar-chart/ArenaHorizontalBarChart.tsx';
import { ArenaPyramidChart } from './arena-pyramid-chart/ArenaPyramidChart.tsx';
import { ArenaRadarChart } from './arena-radar-chart/ArenaRadarChart.tsx';
import { ArenaScatterChart } from './arena-scatter-chart/ArenaScatterChart.tsx';
import { ArenaSparkline } from './arena-sparkline/ArenaSparkline.tsx';
import { ArenaGaugeChart } from './arena-gauge-chart/ArenaGaugeChart.tsx';
import { ArenaFunnelChart } from './arena-funnel-chart/ArenaFunnelChart.tsx';
import { ArenaHeatmapChart } from './arena-heatmap-chart/ArenaHeatmapChart.tsx';
import { arenaScrolledAnchorX } from './ChartTooltip.ts';
import { arenaRailReveal } from './ChartRailView.ts';
import { chartBarGap } from '../../Tokens.generated.js';
import { ArenaTable } from '../display/arena-table/ArenaTable.tsx';
import { ArenaTableRow } from '../display/arena-table-row/ArenaTableRow.tsx';
import { ArenaTableCell } from '../display/arena-table-cell/ArenaTableCell.tsx';
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

  const tooltip = root.querySelector<HTMLElement>('[data-arena-part$=".tooltip"]');
  return tooltip ? (tooltip.textContent ?? '').trim() : null;
}

const CURSOR_KEYS = ['focus.roving', 'keyboard.ArrowLeft', 'keyboard.ArrowRight',
  'keyboard.ArrowUp', 'keyboard.ArrowDown', 'keyboard.Home', 'keyboard.End', 'keyboard.Escape'] as const;

const ACROSS: Record<string, [string, string]> = {
  ArenaHorizontalBarChart: ['ArrowDown', 'ArrowUp'],
  ArenaPyramidChart: ['ArrowDown', 'ArrowUp'],
  ArenaFunnelChart: ['ArrowDown', 'ArrowUp'],
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
    assert.equal(table.parentElement?.style.position, 'absolute',
      'the table is hidden by its wrapper being taken out of flow, not by being removed');

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

const SPARK = 'Deliveries this week';

function sparkFigure(root: HTMLElement) {
  const graphic = root.querySelector<HTMLElement>('[role="img"]');
  assert.ok(graphic, 'a sparkline with no role="img" is a decoration, not a figure');
  assert.equal(graphic.getAttribute('aria-label'), `${SPARK} — sparkline`, 'the name is the locale word around label');
  const table = root.querySelector<HTMLElement>('table');
  assert.ok(table, 'the numbers must be in a real table');
  assert.equal(table.querySelector('caption')?.textContent, `${SPARK} — sparkline`, 'the caption is the same name');
  const head = [...table.querySelectorAll<HTMLElement>('thead th')].map((c) => (c.textContent ?? '').trim());
  assert.deepEqual(head, ['Point', SERIES], 'the point column, then the series under its own name');
  const rows = [...table.querySelectorAll<HTMLElement>('tbody tr')]
    .map((r) => [...r.querySelectorAll('th, td')].map((c) => (c.textContent ?? '').trim()));
  assert.deepEqual(rows, LABELS.map((l, i) => [l, String(VALUES[i])]), 'every point is a row, its label and its number');
  return graphic;
}

test('ArenaSparkline meets both of its declared cases', () => {
  assertPatternCases({
    bindingPath: join(REACT_COMPONENTS, 'charts/arena-sparkline/ArenaSparkline.behaviour.json'),
    cases: {
      static: () => {
        const root = mount(<ArenaSparkline labels={LABELS} label={SPARK} series={[{ label: SERIES, values: VALUES }]} />);
        const graphic = sparkFigure(root);
        assert.equal(root.querySelectorAll('[tabindex]').length, 0, 'the static case is no tab stop at all');
        assert.equal(root.querySelector('[role="group"]'), null, 'with no keyboard there is no region to name');
        press(root.querySelector('svg')!.parentElement as HTMLElement, 'ArrowRight');
        assert.equal(reading(root), null, 'a key reaches nothing, so no cursor and no tooltip appear');
        return { root, subjects: { default: graphic }, behavioural: { 'alternative.table': true, ...Object.fromEntries(CURSOR_KEYS.map((key) => [key, false])) } };
      },
      interactive: () => {
        const root = mount(<ArenaSparkline labels={LABELS} label={SPARK} series={[{ label: SERIES, values: VALUES }]} interactive />);
        const graphic = sparkFigure(root);
        const region = root.querySelector<HTMLElement>('[role="group"]');
        assert.equal(region?.getAttribute('aria-label'), `${SPARK} — sparkline`, 'the keyboard region carries the same name');
        return { root, subjects: { default: graphic }, behavioural: { 'alternative.table': true, ...cursorVerdicts(root, 'ArenaSparkline') } };
      },
    },
  });
});

test('ArenaSparkline draws the crosshair and the enlarged dot where the cursor is, and clears both on Escape', () => {
  const root = mount(<ArenaSparkline labels={LABELS} label={SPARK} series={[{ label: SERIES, values: VALUES }]} interactive />);
  const region = root.querySelector<HTMLElement>('[role="group"]')!;
  const dashed = () => [...root.querySelectorAll('line')].filter((l) => l.getAttribute('stroke-dasharray'));
  assert.equal(dashed().length, 0, 'at rest there is no crosshair');
  const radii = () => [...root.querySelectorAll('circle')].map((c) => c.getAttribute('r')).sort();
  assert.deepEqual(radii(), ['4'], 'at rest only the end dot is drawn');
  press(region, 'Home');
  assert.equal(dashed().length, 1, 'the cursor draws one crosshair');
  assert.equal(dashed()[0]!.getAttribute('stroke'), 'var(--edge-axis)', 'the crosshair is drawn in edge-axis, as the line chart\'s');
  assert.deepEqual(radii(), ['4', '5'], 'the end dot at rest and the cursor dot enlarged');
  press(region, 'End');
  assert.deepEqual(radii(), ['5'], 'on the last point the end dot is the cursor dot');
  press(region, 'Escape');
  assert.equal(dashed().length, 0, 'Escape clears the crosshair');
  assert.deepEqual(radii(), ['4']);
});

test('the sparkline readout starts at the first point and ends at the last, so it never leaves the frame', () => {
  const root = mount(<ArenaSparkline labels={LABELS} label={SPARK} series={[{ label: SERIES, values: VALUES }]} interactive />);
  const region = root.querySelector<HTMLElement>('[role="group"]')!;
  const shift = () => root.querySelector<HTMLElement>('[data-arena-part="sparkline.tooltip"]')!.style.getPropertyValue('--arena-sparkline-shift');
  press(region, 'Home');
  assert.equal(shift(), '0', 'on the first point the readout is start-aligned on the point');
  press(region, 'End');
  assert.equal(shift(), '1', 'on the last point the readout is end-aligned on the point');
  press(region, 'ArrowLeft');
  assert.ok(Number(shift()) > 0 && Number(shift()) < 1, 'between the ends the readout slides with the point');
});

test('an interactive sparkline is a keyboard region at least the smallest control height, with the plot centred in it', () => {
  const live = mount(<ArenaSparkline labels={LABELS} label={SPARK} series={[{ label: SERIES, values: VALUES }]} interactive />);
  const region = live.querySelector<HTMLElement>('[role="group"]')!;
  assert.equal(region.style.minHeight, 'var(--dz-ctl-h-sm)', 'the region is never shorter than the density\'s smallest control');
  assert.equal(region.style.display, 'flex');
  assert.equal(region.style.alignItems, 'center', 'the plot sits on the middle of the region');
  assert.equal(live.querySelector<HTMLElement>('[data-arena-part="sparkline.frame"]')!.style.height, '',
    'the frame is as tall as the region it holds');
  cleanup();
  const still = mount(<ArenaSparkline labels={LABELS} label={SPARK} series={[{ label: SERIES, values: VALUES }]} />);
  const plot = still.querySelector('svg')!.parentElement as HTMLElement;
  assert.equal(plot.style.minHeight, '', 'the static plot keeps the height of its line');
  assert.equal(plot.style.display, 'block');
  assert.equal(still.querySelector<HTMLElement>('[data-arena-part="sparkline.frame"]')!.style.height, '20px');
});

test('a static sparkline answers no pointer, because it draws nothing a pointer could reveal', () => {
  const root = mount(<ArenaSparkline labels={LABELS} label={SPARK} series={[{ label: SERIES, values: VALUES }]} />);
  assert.equal(root.querySelector('rect'), null, 'no overlay listens for the pointer');
  const svg = root.querySelector('svg')!;
  act(() => {
    svg.dispatchEvent(new window.MouseEvent('pointermove', { clientX: 10, bubbles: true }));
  });
  assert.equal(reading(root), null, 'a pointer over a static sparkline shows no tooltip');
});

const SPARK_COLUMNS = [{ header: 'Service' }, { header: 'Trend' }];

function sparkTable(cell: (i: number) => React.ReactNode) {
  return mount(
    <ArenaTable label="Services" columns={SPARK_COLUMNS} responsive={false}>
      {['checkout-api', 'billing-worker', 'search'].map((name, i) => (
        <ArenaTableRow key={name}><ArenaTableCell>{name}</ArenaTableCell><ArenaTableCell>{cell(i)}</ArenaTableCell></ArenaTableRow>
      ))}
    </ArenaTable>,
  );
}

test('a table with a column of static sparklines has the tab stops of the same table without them', () => {
  const plain = sparkTable((i) => `${VALUES[i]}`);
  const without = plain.querySelectorAll('[tabindex="0"]').length;
  cleanup();
  const sparked = sparkTable((i) => <ArenaSparkline labels={LABELS} label={`Trend ${i}`} series={[{ label: SERIES, values: VALUES }]} />);
  assert.equal(sparked.querySelectorAll('svg[role="img"]').length, 3, 'every row draws its sparkline');
  assert.equal(sparked.querySelectorAll('[tabindex="0"]').length, without, 'a static sparkline adds no stop to the grid');
  cleanup();
  const live = sparkTable((i) => <ArenaSparkline labels={LABELS} label={`Trend ${i}`} series={[{ label: SERIES, values: VALUES }]} interactive />);
  assert.equal(live.querySelectorAll('[role="group"][tabindex="0"]').length, 3,
    'an interactive sparkline is a control inside its cell and keeps a stop of its own, which is why the column default is static');
});

test('ArenaGaugeChart meets figure-with-data-table, with every cursor requirement excepted', () => {
  const root = mount(<ArenaGaugeChart value={72} label="CPU load" valueSuffix=" %"
    bands={[{ from: 0, tone: 'success', label: 'Healthy' }, { from: 60, tone: 'warning', label: 'Elevated' }, { from: 85, tone: 'danger', label: 'Critical' }]} />);
  const graphic = root.querySelector<HTMLElement>('[role="img"]');
  assert.ok(graphic, 'a gauge with no role="img" is a decoration, not a figure');
  assert.equal(graphic.getAttribute('aria-label'), 'CPU load — gauge', 'the name is the locale word around label');
  const table = root.querySelector<HTMLElement>('table');
  assert.ok(table, 'the numbers must be in a real table');
  assert.equal(table.querySelector('caption')?.textContent, 'CPU load — gauge', 'the caption is the same name');
  const head = [...table.querySelectorAll<HTMLElement>('thead th')].map((c) => (c.textContent ?? '').trim());
  assert.deepEqual(head, ['Measure', 'Value']);
  const body = [...table.querySelectorAll<HTMLElement>('tbody tr')]
    .map((r) => [...r.querySelectorAll('th, td')].map((c) => (c.textContent ?? '').trim()));
  assert.deepEqual(body, [
    ['Value', '72 %'], ['Minimum', '0 %'], ['Maximum', '100 %'],
    ['Healthy', '0 % – 60 %'], ['Elevated', '60 % – 85 %'], ['Critical', '85 % – 100 %'],
  ], 'the table is the whole scale and not only the reading');
  assert.equal(root.querySelectorAll('[tabindex]').length, 0, 'the gauge is no tab stop at all');
  assert.equal(root.querySelector('[role="group"]'), null, 'with no keyboard there is no region to name');
  const handlers = [root, ...root.querySelectorAll('*')].flatMap((node) => Object.keys(node)
    .filter((key) => key.startsWith('__reactProps$'))
    .flatMap((key) => Object.keys((node as unknown as Record<string, object>)[key]!).filter((prop) => /^on[A-Z]/.test(prop))));
  assert.deepEqual(handlers, [], 'the gauge carries no event handler at all');
  press(root.querySelector('svg')!.parentElement as HTMLElement, 'ArrowRight');
  assert.equal(reading(root), null, 'a key reaches nothing, so no cursor and no tooltip appear');

  assertPattern({
    root,
    bindingPath: join(REACT_COMPONENTS, 'charts/arena-gauge-chart/ArenaGaugeChart.behaviour.json'),
    subjects: { default: graphic },
    behavioural: { 'alternative.table': true, ...Object.fromEntries(CURSOR_KEYS.map((key) => [key, false])) },
  });
});

test('ArenaFunnelChart matches its binding, whose cursor walks stages and reads both conversions', () => {
  const root = mount(<ArenaFunnelChart labels={LABELS} label={CHART} series={[{ label: SERIES, values: VALUES }]} />);
  const graphic = root.querySelector<HTMLElement>('[role="img"]');
  assert.ok(graphic, 'a chart with no role="img" is a decoration, not a figure');
  assert.equal(graphic.getAttribute('aria-label'), `${CHART} — funnel chart`, 'the name is the locale word around label');

  const table = root.querySelector<HTMLElement>('table');
  assert.ok(table, 'the numbers must be in a real table');
  const head = [...table.querySelectorAll<HTMLElement>('thead th')].map((c) => (c.textContent ?? '').trim());
  assert.deepEqual(head, ['Category', SERIES, 'Of previous stage', 'Of first stage'],
    'the stage column, the series under its own name, then the two conversions');

  const region = root.querySelector<HTMLElement>('[role="group"]')!;
  press(region, 'ArrowDown');
  assert.deepEqual([...root.querySelectorAll('[data-arena-part="funnel-chart.tooltip-value"]')].map((l) => l.textContent),
    ['12', 'Of first stage: 100%'], 'the first stage reads its count and only the total, because nothing precedes it');
  press(region, 'ArrowDown');
  assert.deepEqual([...root.querySelectorAll('[data-arena-part="funnel-chart.tooltip-value"]')].map((l) => l.textContent),
    ['30', 'Of previous stage: 250%', 'Of first stage: 250%'], 'a later stage reads its count and both conversions');
  press(region, 'Escape');
  assert.equal(reading(root), null, 'Escape clears the cursor');
  press(region, 'ArrowRight');
  assert.equal(reading(root), null, 'the horizontal pair is idle and moves nothing');

  assertPattern({
    root,
    bindingPath: join(REACT_COMPONENTS, 'charts/arena-funnel-chart/ArenaFunnelChart.behaviour.json'),
    subjects: { default: graphic },
    behavioural: { 'alternative.table': true, ...cursorVerdicts(root, 'ArenaFunnelChart') },
  });
});

function funnelReads(values: number[], showConversion: boolean): Array<{ name: string; lines: string[] }> {
  const root = mount(
    <ArenaFunnelChart label={CHART} labels={values.map((_, i) => `S${i + 1}`)} showConversion={showConversion}
      series={[{ label: SERIES, values }]} />,
  );
  const region = root.querySelector<HTMLElement>('[role="group"]')!;
  return values.map(() => {
    press(region, 'ArrowDown');
    return {
      name: (root.querySelector('[data-arena-part="funnel-chart.tooltip-label"]')?.textContent ?? '').trim(),
      lines: [...root.querySelectorAll('[data-arena-part="funnel-chart.tooltip-value"]')].map((l) => (l.textContent ?? '').trim()),
    };
  });
}

test('ArenaFunnelChart omits the tooltip lines it has no number for, and the conversions when they are off', () => {
  assert.deepEqual(funnelReads([100, Number.NaN, 25], true), [
    { name: 'S1', lines: ['100', 'Of first stage: 100%'] },
    { name: 'S2', lines: [] },
    { name: 'S3', lines: ['25', 'Of first stage: 25%'] },
  ], 'a missing stage reads its name alone, and a stage after it has no previous stage to compare');
  assert.deepEqual(funnelReads([0, 5], true), [
    { name: 'S1', lines: ['0'] },
    { name: 'S2', lines: ['5'] },
  ], 'a first stage of 0 gives no ratio, so no conversion line is written');
  assert.deepEqual(funnelReads([100, Number.NaN, 25], false), [
    { name: 'S1', lines: ['100'] }, { name: 'S2', lines: [] }, { name: 'S3', lines: ['25'] },
  ], 'with the conversion off the tooltip reads the count only');
  assert.deepEqual(funnelReads([0, 5], false), [
    { name: 'S1', lines: ['0'] }, { name: 'S2', lines: ['5'] },
  ]);
});

const GRID = [0, 1, 2].map((row) => ({ label: `Row ${row}`, values: [0, 1, 2].map((col) => (row * 3 + col + 1) * 10) }));

function cellAt(root: HTMLElement): string | null {
  const column = root.querySelector('[data-arena-part="heatmap-chart.tooltip-label"]');
  const value = root.querySelector('[data-arena-part="heatmap-chart.tooltip-value"]');
  if (!column || !value) return null;
  return `${(value.textContent ?? '').split(':')[0]}/${(column.textContent ?? '').trim()}`;
}

function pressed(region: HTMLElement, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  act(() => { region.dispatchEvent(event); });
  return event;
}

test('ArenaHeatmapChart matches its binding, whose cursor is a cell moved by all four arrows', () => {
  const root = mount(<ArenaHeatmapChart labels={LABELS} label={CHART} series={GRID} />);
  const graphic = root.querySelector<HTMLElement>('[role="img"]');
  assert.ok(graphic, 'a chart with no role="img" is a decoration, not a figure');
  assert.equal(graphic.getAttribute('aria-label'), `${CHART} — heatmap`, 'the name is the locale word around label');
  const head = [...root.querySelectorAll<HTMLElement>('table thead th')].map((c) => (c.textContent ?? '').trim());
  assert.deepEqual(head, ['Row', ...LABELS], 'the row heading, then one column per label');
  assert.deepEqual([...root.querySelectorAll<HTMLElement>('table tbody th[scope="row"]')].map((c) => c.textContent), GRID.map((one) => one.label));

  const region = root.querySelector<HTMLElement>('[role="group"]')!;
  assert.equal(root.querySelectorAll('[tabindex="0"]').length, 1, 'one tab stop for the whole plot: the cursor moves inside it');
  assert.equal(cellAt(root), null, 'a chart at rest reads nothing');

  const walk: [string, string | null][] = [
    ['ArrowRight', 'Row 0/Alpha'], ['ArrowRight', 'Row 0/Beta'], ['ArrowDown', 'Row 1/Beta'], ['ArrowLeft', 'Row 1/Alpha'],
    ['ArrowLeft', 'Row 1/Alpha'], ['ArrowUp', 'Row 0/Alpha'], ['ArrowUp', 'Row 0/Alpha'], ['End', 'Row 0/Gamma'],
    ['ArrowRight', 'Row 0/Gamma'], ['ArrowDown', 'Row 1/Gamma'], ['ArrowDown', 'Row 2/Gamma'], ['ArrowDown', 'Row 2/Gamma'],
    ['Home', 'Row 2/Alpha'], ['End', 'Row 2/Gamma'], ['Escape', null],
  ];
  for (const [key, expected] of walk) {
    const event = pressed(region, key);
    assert.equal(cellAt(root), expected, `${key} lands on ${expected}`);
    assert.equal(event.defaultPrevented, true, `${key} is the plot's own while it has focus, so the page does not scroll`);
  }
  for (const [key, expected] of [['ArrowDown', 'Row 0/Alpha'], ['Escape', null], ['End', 'Row 0/Gamma'], ['Escape', null], ['Home', 'Row 0/Alpha'], ['Escape', null]] as const) {
    pressed(region, key);
    assert.equal(cellAt(root), expected, `${key} from rest or after Escape`);
  }

  pressed(region, 'ArrowRight');
  for (const key of ['PageDown', 'PageUp', 'Tab']) {
    assert.equal(pressed(region, key).defaultPrevented, false, `${key} is not bound, so the page keeps it`);
  }
  assert.equal(cellAt(root), 'Row 0/Alpha', 'an unbound key moves nothing');

  assertPattern({
    root,
    bindingPath: join(REACT_COMPONENTS, 'charts/arena-heatmap-chart/ArenaHeatmapChart.behaviour.json'),
    subjects: { default: graphic },
    behavioural: {
      'alternative.table': true,
      ...Object.fromEntries(CURSOR_KEYS.map((key) => [key, !['keyboard.Home', 'keyboard.End'].includes(key)])),
    },
  });
});

test('ArenaHeatmapChart outlines the cursor cell in the body ink, and only that one', () => {
  const root = mount(<ArenaHeatmapChart labels={LABELS} label={CHART} series={GRID} />);
  const outlined = () => [...root.querySelectorAll('svg rect')].filter((one) => one.getAttribute('stroke') === 'var(--ink-body)');
  assert.equal(outlined().length, 0, 'at rest nothing is outlined');
  const region = root.querySelector<HTMLElement>('[role="group"]')!;
  pressed(region, 'ArrowDown');
  assert.equal(outlined().length, 1);
  assert.equal(outlined()[0]!.getAttribute('fill'), 'none', 'the outline never covers the cell it marks');
  pressed(region, 'Escape');
  assert.equal(outlined().length, 0);
});

test('ArenaHeatmapChart reads the column label and the row with its number, and the row alone for a missing cell', () => {
  const root = mount(
    <ArenaHeatmapChart label={CHART} labels={LABELS} valueFormat={{ grouping: true }}
      series={[{ label: 'Full', values: [1200, 2, 3] }, { label: 'Short', values: [5] }, { label: 'Gap', values: [7, Number.NaN, 9] }]} />,
  );
  const region = root.querySelector<HTMLElement>('[role="group"]')!;
  const read = () => ({
    label: (root.querySelector('[data-arena-part="heatmap-chart.tooltip-label"]')?.textContent ?? '').trim(),
    lines: [...root.querySelectorAll('[data-arena-part="heatmap-chart.tooltip-value"]')].map((l) => (l.textContent ?? '').trim()),
  });
  pressed(region, 'ArrowRight');
  assert.deepEqual(read(), { label: 'Alpha', lines: ['Full: 1,200'] });
  pressed(region, 'ArrowDown');
  assert.deepEqual(read(), { label: 'Alpha', lines: ['Short: 5'] });
  pressed(region, 'ArrowRight');
  assert.deepEqual(read(), { label: 'Beta', lines: ['Short'] }, 'a short row has no number for this cell');
  pressed(region, 'ArrowDown');
  assert.deepEqual(read(), { label: 'Beta', lines: ['Gap'] }, 'a NaN cell reads as a missing one');
});

test('ArenaHeatmapChart hides its table in a wrapper, so a wide table never widens the page', () => {
  const root = mount(<ArenaHeatmapChart labels={LABELS} label={CHART} series={GRID} />);
  const box = root.querySelector('table')!.parentElement!;
  assert.equal(box.tagName, 'DIV');
  assert.equal(box.style.position, 'absolute');
  assert.equal(box.style.overflow, 'hidden');
  assert.equal(box.style.width, '1px');
});

test('ArenaHeatmapChart anchors the tooltip at the cell\'s place in the rail\'s visible span', () => {
  const root = mount(<ArenaHeatmapChart labels={LABELS} label={CHART} series={GRID} minCellWidth={400} />);
  const rail = root.querySelector<HTMLElement>('[role="group"]')!;
  let scrolled = 900;
  Object.defineProperty(rail, 'scrollLeft', { get: () => scrolled, set: () => {}, configurable: true });
  Object.defineProperty(rail, 'clientWidth', { get: () => 300, configurable: true });
  act(() => { rail.dispatchEvent(new Event('scroll')); });
  const region = root.querySelector<HTMLElement>('svg')!.parentElement!;
  pressed(region, 'End');
  const outline = root.querySelector('svg rect[stroke="var(--ink-body)"]')!;
  const centre = Number(outline.getAttribute('x')) + Number(outline.getAttribute('width')) / 2;
  const tip = () => parseFloat(root.querySelector<HTMLElement>('[data-arena-part="heatmap-chart.tooltip"]')!.style.left);
  assert.equal(tip(), Math.min(Math.max(centre - 900, 0), 300), 'the readout sits over the cell as it is scrolled');
  scrolled = 0;
  act(() => { rail.dispatchEvent(new Event('scroll')); });
  assert.equal(tip(), 300, 'a cell scrolled past the right edge holds the readout at the edge');
});

const RAIL_SCROLLED = 112;
const RAIL_VISIBLE = 800;
const RAIL_LABELS = Array.from({ length: 8 }, (_, i) => `d${i}`);
const RAIL_SERIES = [{ label: 'Revenue', values: RAIL_LABELS.map((_, i) => i + 1) }];

function leftOf(x: number): string {
  return `${x}px`;
}

function assertRailAnchor(root: HTMLElement, part: string): void {
  const rail = root.querySelector<HTMLElement>('[role="group"]')!;
  Object.defineProperty(rail, 'scrollLeft', { get: () => RAIL_SCROLLED, set: () => {}, configurable: true });
  Object.defineProperty(rail, 'clientWidth', { get: () => RAIL_VISIBLE, configurable: true });
  act(() => { rail.dispatchEvent(new Event('scroll')); });
  pressed(rail, 'End');
  const last = [...root.querySelectorAll('svg text')].find((one) => one.textContent === RAIL_LABELS[RAIL_LABELS.length - 1])!;
  const x = Number(last.getAttribute('x'));
  assert.notEqual(arenaScrolledAnchorX(x, RAIL_SCROLLED, RAIL_VISIBLE), arenaScrolledAnchorX(x, 0, RAIL_VISIBLE), 'the case separates a scrolled rail from an unscrolled one');
  const tip = root.querySelector<HTMLElement>(`[data-arena-part="${part}.tooltip"]`)!;
  assert.equal(tip.style.left, leftOf(arenaScrolledAnchorX(x, RAIL_SCROLLED, RAIL_VISIBLE)), 'the readout sits over the last point as the rail is scrolled');
}

test('ArenaLineChart anchors the tooltip at the point\'s place in the rail\'s visible span', () => {
  const root = mount(<ArenaLineChart labels={RAIL_LABELS} label={CHART} series={RAIL_SERIES} minPointSpacing={100} />);
  assertRailAnchor(root, 'line-chart');
});

test('ArenaBarChart anchors the tooltip at the bar\'s place in the rail\'s visible span', () => {
  const root = mount(<ArenaBarChart labels={RAIL_LABELS} label={CHART} series={RAIL_SERIES} minPointSpacing={100} />);
  assertRailAnchor(root, 'bar-chart');
});

type Span = (xs: number[], index: number, width: number) => [number, number];

function stubRail(rail: HTMLElement, start: number, visible: number): () => number {
  let scrolled = start;
  Object.defineProperty(rail, 'scrollLeft', { get: () => scrolled, set: (to: number) => { scrolled = to; }, configurable: true });
  Object.defineProperty(rail, 'clientWidth', { get: () => visible, configurable: true });
  act(() => { rail.dispatchEvent(new Event('scroll')); });
  return () => scrolled;
}

function assertRailFollows(root: HTMLElement, part: string, span: Span): void {
  const rail = root.querySelector<HTMLElement>('[role="group"]')!;
  const width = Number(root.querySelector('svg')!.getAttribute('width'));
  const xs = RAIL_LABELS.map((name) => Number([...root.querySelectorAll('svg text')].find((one) => one.textContent === name)!.getAttribute('x')));
  const visible = RAIL_VISIBLE / 2;
  const scrollAt = stubRail(rail, width - visible, visible);
  const tip = () => root.querySelector<HTMLElement>(`[data-arena-part="${part}.tooltip"]`)!.style.left;
  const parked = scrollAt();
  pressed(rail, 'Home');
  const [from, to] = span(xs, 0, width);
  const home = arenaRailReveal(from, to, parked, visible);
  assert.notEqual(home, parked, 'the case starts with the first point off screen');
  assert.equal(scrollAt(), home, 'Home scrolls the rail to the first point');
  assert.equal(tip(), leftOf(arenaScrolledAnchorX(xs[0] as number, home, visible)), 'the readout sits over the first point in the new view');
  assert.notEqual(tip(), leftOf(arenaScrolledAnchorX(xs[0] as number, parked, visible)), 'and not at the clamped edge of the old view');
  pressed(rail, 'End');
  const [lastFrom, lastTo] = span(xs, xs.length - 1, width);
  const back = arenaRailReveal(lastFrom, lastTo, home, visible);
  assert.notEqual(back, home, 'End moves the rail again');
  assert.equal(scrollAt(), back, 'End brings the rail back to the last point');
  assert.equal(tip(), leftOf(arenaScrolledAnchorX(xs[xs.length - 1] as number, back, visible)), 'the readout sits over the last point');
}

const LINE_SPAN: Span = (xs, index, width) => {
  const step = (xs[1] as number) - (xs[0] as number);
  return [Math.max(0, (xs[index] as number) - step / 2), Math.min(width, (xs[index] as number) + step / 2)];
};

const BAR_SPAN: Span = (xs, index) => {
  const band = (xs[1] as number) - (xs[0] as number) - chartBarGap;
  return [(xs[index] as number) - band / 2, (xs[index] as number) + band / 2];
};

test('ArenaLineChart scrolls the rail to keep the cursor\'s point in view', () => {
  const root = mount(<ArenaLineChart labels={RAIL_LABELS} label={CHART} series={RAIL_SERIES} minPointSpacing={100} />);
  assertRailFollows(root, 'line-chart', LINE_SPAN);
});

test('ArenaBarChart scrolls the rail to keep the cursor\'s bar in view', () => {
  const root = mount(<ArenaBarChart labels={RAIL_LABELS} label={CHART} series={RAIL_SERIES} minPointSpacing={100} />);
  assertRailFollows(root, 'bar-chart', BAR_SPAN);
});

test('ArenaHeatmapChart scrolls the rail to the cell\'s band through the shared reveal', () => {
  const root = mount(<ArenaHeatmapChart labels={LABELS} label={CHART} series={GRID} minCellWidth={400} />);
  const rail = root.querySelector<HTMLElement>('[role="group"]')!;
  const scrollAt = stubRail(rail, 900, 300);
  pressed(root.querySelector<HTMLElement>('svg')!.parentElement!, 'Home');
  const outline = root.querySelector('svg rect[stroke="var(--ink-body)"]')!;
  const left = Number(outline.getAttribute('x'));
  assert.equal(scrollAt(), arenaRailReveal(left, left + Number(outline.getAttribute('width')), 900, 300), 'Home scrolls the rail to the first cell');
  assert.notEqual(scrollAt(), 900, 'the case moves the rail');
});

function railChart(kind: 'line' | 'bar', count = RAIL_LABELS.length): React.ReactElement {
  const props = {
    labels: RAIL_LABELS.slice(0, count), label: CHART, minPointSpacing: 100,
    series: [{ label: 'Revenue', values: RAIL_SERIES[0]!.values.slice(0, count) }],
  };
  return kind === 'line' ? <ArenaLineChart {...props} /> : <ArenaBarChart {...props} />;
}

test('the line and bar charts keep the cursor\'s point in view after the container narrows', () => {
  const saved = globalThis.ResizeObserver;
  let report: ResizeObserverCallback = () => {};
  globalThis.ResizeObserver = class {
    constructor(callback: ResizeObserverCallback) { report = callback; }
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
  try {
    for (const [kind, span] of [['line', LINE_SPAN], ['bar', BAR_SPAN]] as const) {
      const root = mount(railChart(kind));
      const rail = root.querySelector<HTMLElement>('[role="group"]')!;
      const width = Number(root.querySelector('svg')!.getAttribute('width'));
      const xs = RAIL_LABELS.map((name) => Number([...root.querySelectorAll('svg text')].find((one) => one.textContent === name)!.getAttribute('x')));
      let visible = 600;
      const scrollAt = stubRail(rail, width - visible, visible);
      Object.defineProperty(rail, 'clientWidth', { get: () => visible, configurable: true });
      pressed(rail, 'End');
      const parked = scrollAt();
      visible = 390;
      act(() => { report([{ borderBoxSize: [{ inlineSize: 390 }], target: root } as unknown as ResizeObserverEntry], {} as ResizeObserver); });
      const [from, to] = span(xs, xs.length - 1, width);
      assert.equal(scrollAt(), arenaRailReveal(from, to, parked, visible), `${kind}: the last point is brought back into the narrower view`);
      assert.notEqual(scrollAt(), parked, `${kind}: the case moves the rail`);
    }
  } finally {
    globalThis.ResizeObserver = saved;
  }
});

test('the line and bar charts do not send the rail to a span past the series when it shrinks under the cursor', () => {
  for (const kind of ['line', 'bar'] as const) {
    let shrink = () => {};
    const Shrinks = () => {
      const [count, setCount] = React.useState(RAIL_LABELS.length);
      shrink = () => setCount(RAIL_LABELS.length - 1);
      return railChart(kind, count);
    };
    const root = mount(<Shrinks />);
    const rail = root.querySelector<HTMLElement>('[role="group"]')!;
    const scrollAt = stubRail(rail, 0, 400);
    Object.defineProperty(rail, 'scrollWidth', { get: () => 5000, configurable: true });
    pressed(rail, 'End');
    rail.scrollLeft = 4600;
    act(() => { shrink(); });
    assert.equal(scrollAt(), 4600, `${kind}: a cursor past the new last point sends the rail nowhere near that span`);
  }
});

test('ArenaHeatmapChart holds the tooltip inside the rail after the container narrows', () => {
  const saved = globalThis.ResizeObserver;
  let report: ResizeObserverCallback = () => {};
  globalThis.ResizeObserver = class {
    constructor(callback: ResizeObserverCallback) { report = callback; }
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
  try {
    const root = mount(<ArenaHeatmapChart labels={LABELS} label={CHART} series={GRID} minCellWidth={400} />);
    const rail = root.querySelector<HTMLElement>('[role="group"]')!;
    let visible = 300;
    Object.defineProperty(rail, 'scrollLeft', { get: () => 0, set: () => {}, configurable: true });
    Object.defineProperty(rail, 'clientWidth', { get: () => visible, configurable: true });
    pressed(root.querySelector<HTMLElement>('svg')!.parentElement!, 'End');
    const tip = () => parseFloat(root.querySelector<HTMLElement>('[data-arena-part="heatmap-chart.tooltip"]')!.style.left);
    assert.equal(tip(), 300, 'a cell past the right edge holds the readout at the rail\'s edge');
    visible = 200;
    act(() => { report([{ borderBoxSize: [{ inlineSize: 500 }], target: root } as unknown as ResizeObserverEntry], {} as ResizeObserver); });
    assert.equal(tip(), 200, 'the edge is the narrower rail\'s, with no scroll or key to refresh it');
  } finally {
    globalThis.ResizeObserver = saved;
  }
});

test('ArenaHeatmapChart puts the cursor under the pointer, on the cell the two band scales place there', () => {
  const root = mount(<ArenaHeatmapChart label={CHART} labels={LABELS} series={GRID} />);
  const plot = root.querySelector<SVGRectElement>('svg rect[fill="transparent"]')!;
  const x = Number(plot.getAttribute('x'));
  const y = Number(plot.getAttribute('y'));
  const w = Number(plot.getAttribute('width'));
  const h = Number(plot.getAttribute('height'));
  const move = (type: string, px: number, py: number, pointerType = 'mouse') => act(() => {
    const event = new MouseEvent(type, { bubbles: true, clientX: px, clientY: py });
    Object.defineProperty(event, 'pointerType', { value: pointerType });
    plot.dispatchEvent(event);
  });
  move('pointermove', x + w * 0.9, y + h * 0.1);
  assert.equal(cellAt(root), 'Row 0/Gamma', 'right edge, top row');
  move('pointermove', x + w * 0.1, y + h * 0.9);
  assert.equal(cellAt(root), 'Row 2/Alpha', 'left edge, bottom row');
  move('pointerout', 0, 0);
  assert.equal(cellAt(root), null, 'leaving the plot clears the cell, hover and cursor being one state');
});
