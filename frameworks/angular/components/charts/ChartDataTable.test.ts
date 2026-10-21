/* Every chart answers figure-with-data-table the same way, so the shared
 * body is `assertFigure` and each test only supplies its own fixture: a loop over
 * the component classes does not typecheck, since TestBed.createComponent cannot
 * unify two unrelated component types. */
import { useTestEnvironment } from '../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component, signal, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaBarChart } from './arena-bar-chart/ArenaBarChart';
import { ArenaDoughnutChart } from './arena-doughnut-chart/ArenaDoughnutChart';
import { ArenaLineChart } from './arena-line-chart/ArenaLineChart';
import { ArenaHorizontalBarChart } from './arena-horizontal-bar-chart/ArenaHorizontalBarChart';
import { ArenaPyramidChart } from './arena-pyramid-chart/ArenaPyramidChart';
import { ArenaRadarChart } from './arena-radar-chart/ArenaRadarChart';
import { ArenaScatterChart } from './arena-scatter-chart/ArenaScatterChart';
import { ArenaSparkline } from './arena-sparkline/ArenaSparkline';
import { ArenaGaugeChart } from './arena-gauge-chart/ArenaGaugeChart';
import { ArenaFunnelChart } from './arena-funnel-chart/ArenaFunnelChart';
import { ArenaHeatmapChart } from './arena-heatmap-chart/ArenaHeatmapChart';
import { arenaHeatmapHeight, arenaTextGutter } from './ChartAxis';
import { ARENA_PAD } from '../../DataVisuals';
import { arenaGaugePoint, arenaGaugeRadii } from './ChartPolar';
import { ArenaTable } from '../display/arena-table/ArenaTable';
import { ArenaTableRow } from '../display/arena-table-row/ArenaTableRow';
import { ArenaTableCell } from '../display/arena-table-cell/ArenaTableCell';
import { assertPattern, assertPatternCases, ANGULAR_COMPONENTS } from '../../test/Compliance';
import { arenaScrolledAnchorX } from './ChartTooltip';
import { arenaRailReveal } from './ChartRailView';
import { assertNoNode } from '../../test/NodeAssert';
import { forgetArenaWarnings } from '../../WarnOnce';
import { chartBarGap, chartGaugeHeight, chartHeatmapRowH, chartLegendStrip, chartPadCategory, chartSparklineHeight } from '../../Tokens.generated';
import type { ArenaGaugeBand } from '../../Api.generated';
const BINDING = join(ANGULAR_COMPONENTS, 'charts/arena-bar-chart/ArenaBarChart.behaviour.json');

const LABELS = ['Alpha', 'Beta', 'Gamma'];
const VALUES = [12, 30, 7];
const SERIES = 'Deliveries';
const CHART = 'Deliveries by region';

function renderBarChart() {
  const fixture = TestBed.createComponent(ArenaBarChart);
  fixture.componentRef.setInput('labels', LABELS);
  fixture.componentRef.setInput('series', [{ label: SERIES, values: VALUES }]);
  fixture.componentRef.setInput('label', CHART);
  fixture.detectChanges();
  return fixture;
}

test('arena-bar-chart renders a real <table> carrying every plotted number', () => {
  const fixture = renderBarChart();
  try {
    const host = fixture.nativeElement as Element;

    const table = host.querySelector('table');
    assert.notEqual(table, null, 'a chart with no data table is a picture nobody can read');

    const rows = [...table!.querySelectorAll('tbody tr')];
    assert.equal(rows.length, VALUES.length, 'one row per bar, so the table and the picture cannot disagree');

    const pairs = rows.map((row) => [...row.querySelectorAll('th, td')].map((c) => (c.textContent ?? '').trim()));
    assert.deepEqual(pairs, LABELS.map((label, i) => [label, String(VALUES[i])]));

    assert.equal((table!.querySelector('caption')?.textContent ?? '').trim(), `${CHART} — bar chart`);
    const headers = [...table!.querySelectorAll('thead th')].map((c) => (c.textContent ?? '').trim());
    assert.deepEqual(headers, ['Category', SERIES]);
  } finally {
    fixture.destroy();
  }
});

test('arena-bar-chart hides its data table visually without removing it from the accessibility tree', () => {
  const fixture = renderBarChart();
  try {
    const table = (fixture.nativeElement as Element).querySelector('table') as HTMLTableElement;

    assert.equal(table.hasAttribute('hidden'), false, 'a hidden table is not an alternative -- it is no table at all');
    assert.equal(table.getAttribute('aria-hidden'), null, 'the table must stay in the accessibility tree');
    assert.notEqual(table.style.display, 'none', 'display:none would remove it from the accessibility tree');

    const box = table.parentElement as HTMLElement;
    assert.equal(box.style.position, 'absolute');
    assert.equal(box.style.width, '1px');
    assert.equal(box.style.height, '1px');
    assert.equal(box.style.overflow, 'hidden');
  } finally {
    fixture.destroy();
  }
});

test('arena-bar-chart matches its figure-with-data-table binding, which excepts nothing', () => {
  const fixture = renderBarChart();
  try {
    const host = fixture.nativeElement as Element;
    assertPattern({
      root: host,
      bindingPath: BINDING,
      subjects: { default: host.querySelector('[role="img"]') },
      behavioural: { 'alternative.table': true, ...cursorVerdicts(fixture, host) },
    });
  } finally {
    fixture.destroy();
  }
});

test('arena-bar-chart REFUSES to render without a label, and names itself by nothing but the label', () => {
  const fixture = TestBed.createComponent(ArenaBarChart);
  fixture.componentRef.setInput('labels', LABELS);
  fixture.componentRef.setInput('series', [{ label: SERIES, values: VALUES }]);
  try {
    assert.throws(
      () => fixture.detectChanges(),
      /NG0950/,
      'a name that is only the chart TYPE satisfies roles.label mechanically and tells a reader nothing; '
      + 'label is input.required, so Angular refuses the render rather than inventing one',
    );
  } finally {
    fixture.destroy();
  }
});
function assertEmptyLabelRefused(type: Type<unknown>, inputs: Record<string, unknown>, message: RegExp): void {
  const fixture = TestBed.createComponent(type);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.componentRef.setInput('label', '');
  try {
    assert.throws(() => fixture.detectChanges(), message);
  } finally {
    fixture.destroy();
  }
}

const wholeMessage = (name: string, thing = 'chart') => new RegExp(
  `${name}: \`label\` is required \\(it names the ${thing} for the accessible name, and nothing can derive that\\)$`);

const WITH_SERIES = { labels: LABELS, series: [{ label: SERIES, values: VALUES }] };
const WITH_POINTS = { series: [{ label: SERIES, x: [1, 2, 3], y: VALUES }], xLabel: 'Requests', yLabel: 'Latency' };

test('arena-bar-chart REFUSES an empty label, since the accessible name would be the type alone', () => {
  assertEmptyLabelRefused(ArenaBarChart, WITH_SERIES, wholeMessage('ArenaBarChart'));
});

test('arena-line-chart REFUSES an empty label, since the accessible name would be the type alone', () => {
  assertEmptyLabelRefused(ArenaLineChart, WITH_SERIES, wholeMessage('ArenaLineChart'));
});

test('arena-horizontal-bar-chart REFUSES an empty label, since the accessible name would be the type alone', () => {
  assertEmptyLabelRefused(ArenaHorizontalBarChart, WITH_SERIES, wholeMessage('ArenaHorizontalBarChart'));
});

test('arena-pyramid-chart REFUSES an empty label, since the accessible name would be the type alone', () => {
  assertEmptyLabelRefused(ArenaPyramidChart, WITH_SERIES, wholeMessage('ArenaPyramidChart'));
});

test('arena-radar-chart REFUSES an empty label, since the accessible name would be the type alone', () => {
  assertEmptyLabelRefused(ArenaRadarChart, WITH_SERIES, wholeMessage('ArenaRadarChart'));
});

test('arena-scatter-chart REFUSES an empty label, since the accessible name would be the type alone', () => {
  assertEmptyLabelRefused(ArenaScatterChart, WITH_POINTS, wholeMessage('ArenaScatterChart'));
});

test('arena-doughnut-chart REFUSES an empty label, since the accessible name would be the type alone', () => {
  assertEmptyLabelRefused(ArenaDoughnutChart, WITH_SERIES, wholeMessage('ArenaDoughnutChart'));
});

test('arena-sparkline REFUSES an empty label, since the accessible name would be the type alone', () => {
  assertEmptyLabelRefused(ArenaSparkline, WITH_SERIES, wholeMessage('ArenaSparkline', 'sparkline'));
});

test('arena-horizontal-bar-chart clips a long category name at its gutter and keeps the full name in a title', () => {
  const name = 'Quarterly revenue from the northern area';
  assert.equal(name.length, 40, 'the case draws a category of exactly 40 characters');
  const fixture = TestBed.createComponent(ArenaHorizontalBarChart);
  fixture.componentRef.setInput('labels', [name, 'Short']);
  fixture.componentRef.setInput('series', [{ label: SERIES, values: [30, 12] }]);
  fixture.componentRef.setInput('label', CHART);
  fixture.detectChanges();
  try {
    const host = fixture.nativeElement as Element;
    const group = host.querySelector('g[clip-path]');
    assert.notEqual(group, null, 'the category labels sit in a group clipped by a clip path');
    const id = /^url\(#(.+)\)$/.exec(group!.getAttribute('clip-path') ?? '')?.[1];
    assert.notEqual(id, undefined, 'the clip-path names an id');
    const clipPath = host.querySelector(`clipPath[id="${id}"]`);
    assert.notEqual(clipPath, null, `a clipPath with id ${id} holds the gutter rectangle`);
    const rect = clipPath!.querySelector('rect')!;
    assert.equal(rect.getAttribute('width'), String(chartPadCategory), 'the rectangle is the gutter wide');
    assert.equal(rect.getAttribute('x'), '0');
    const titles = [...group!.querySelectorAll('text > title')].map((one) => one.textContent);
    assert.deepEqual(titles, [name, 'Short'], 'each label carries its full name as a title');
  } finally {
    fixture.destroy();
  }
});

test('arena-horizontal-bar-chart gives each instance its own gutter clip id', () => {
  const drawn: Array<ReturnType<typeof TestBed.createComponent<ArenaHorizontalBarChart>>> = [];
  try {
    for (let i = 0; i < 2; i += 1) {
      const fixture = TestBed.createComponent(ArenaHorizontalBarChart);
      drawn.push(fixture);
      fixture.componentRef.setInput('labels', ['A']);
      fixture.componentRef.setInput('series', [{ label: SERIES, values: [1] }]);
      fixture.componentRef.setInput('label', CHART);
      fixture.detectChanges();
    }
    const ids = drawn.map((fixture) => (fixture.nativeElement as Element).querySelector('clipPath')?.getAttribute('id'));
    assert.notEqual(ids[0], undefined);
    assert.notEqual(ids[0], ids[1]);
  } finally {
    for (const fixture of drawn) fixture.destroy();
  }
});

test('arena-bar-chart appends valueSuffix to the axis ticks and to the accessible table alike', () => {
  const fixture = TestBed.createComponent(ArenaBarChart);
  fixture.componentRef.setInput('labels', LABELS);
  fixture.componentRef.setInput('series', [{ label: SERIES, values: VALUES }]);
  fixture.componentRef.setInput('label', CHART);
  fixture.componentRef.setInput('valueSuffix', ' ms');
  fixture.detectChanges();
  try {
    const host = fixture.nativeElement as Element;

    const svgText = [...host.querySelectorAll('svg text')].map((t) => (t.textContent ?? '').trim());
    const ticks = svgText.filter((text) => /^-?[\d.,]+ ms$/.test(text));
    assert.ok(ticks.length >= 2, `no axis tick carried the suffix: ${JSON.stringify(svgText)}`);
    assert.ok(svgText.filter((text) => /^-?[\d.,]+$/.test(text)).length === 0,
      `a tick was written without the suffix: ${JSON.stringify(svgText)}`);

    const table = host.querySelector('table') as HTMLTableElement;
    const pairs = [...table.querySelectorAll('tbody tr')]
      .map((row) => [...row.querySelectorAll('th, td')].map((c) => (c.textContent ?? '').trim()));
    assert.deepEqual(pairs, LABELS.map((label, i) => [label, `${VALUES[i]} ms`]));
  } finally {
    fixture.destroy();
  }
});

test('arena-doughnut-chart takes its accessible name and caption from label, and its column from the series', () => {
  const fixture = TestBed.createComponent(ArenaDoughnutChart);
  fixture.componentRef.setInput('labels', LABELS);
  fixture.componentRef.setInput('series', [{ label: SERIES, values: VALUES }]);
  fixture.componentRef.setInput('label', CHART);
  fixture.detectChanges();
  try {
    const host = fixture.nativeElement as Element;

    const graphic = host.querySelector('[role="img"]') as Element;
    assert.equal(graphic.getAttribute('aria-label'), `${CHART} — doughnut chart`);

    const table = host.querySelector('table') as HTMLTableElement;
    assert.equal((table.querySelector('caption')?.textContent ?? '').trim(), `${CHART} — doughnut chart`);

    const headers = [...table.querySelectorAll('thead th')].map((c) => (c.textContent ?? '').trim());
    assert.deepEqual(headers, ['Category', SERIES]);
  } finally {
    fixture.destroy();
  }
});

const CURSOR_KEYS = ['focus.roving', 'keyboard.ArrowLeft', 'keyboard.ArrowRight',
  'keyboard.ArrowUp', 'keyboard.ArrowDown', 'keyboard.Home', 'keyboard.End', 'keyboard.Escape'] as const;

const ACROSS: Record<string, [string, string]> = { down: ['ArrowDown', 'ArrowUp'] };

function unusedPair(forward: string): string[] {
  return forward === 'ArrowDown' ? ['keyboard.ArrowLeft', 'keyboard.ArrowRight']
    : ['keyboard.ArrowUp', 'keyboard.ArrowDown'];
}

function press(fixture: { detectChanges: () => void }, region: Element, key: string): void {
  region.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  fixture.detectChanges();
}

function reading(host: Element): string | null {

  const tooltip = host.querySelector('[data-arena-part$=".tooltip"]');
  return tooltip ? (tooltip.textContent ?? '').trim() : null;
}

function cursorVerdicts(fixture: { detectChanges: () => void }, host: Element, axis = 'across'): Record<string, boolean> {
  const [forward, backward] = ACROSS[axis] ?? ['ArrowRight', 'ArrowLeft'];

  const region = host.querySelector('[role="group"]') as HTMLElement;
  assert.notEqual(region, null, 'the plot must be one keyboard region');
  assert.equal(host.querySelectorAll('[tabindex="0"]').length, 1,
    'one tab stop for the whole plot: the cursor moves inside it and never adds a second');

  assert.equal(reading(host), null, 'a chart at rest reads nothing');

  press(fixture, region, forward);
  assert.match(reading(host) ?? '', new RegExp(LABELS[0] as string), `${forward} from rest lands on the first point`);

  press(fixture, region, forward);
  assert.match(reading(host) ?? '', new RegExp(LABELS[1] as string), `${forward} steps forward`);

  press(fixture, region, backward);
  assert.match(reading(host) ?? '', new RegExp(LABELS[0] as string), `${backward} steps back`);

  press(fixture, region, backward);
  assert.match(reading(host) ?? '', new RegExp(LABELS[0] as string), 'and CLAMPS at the first, because an axis has ends');

  press(fixture, region, 'End');
  assert.match(reading(host) ?? '', new RegExp(LABELS[LABELS.length - 1] as string), 'End jumps to the last point');

  press(fixture, region, 'Home');
  assert.match(reading(host) ?? '', new RegExp(LABELS[0] as string), 'Home jumps to the first');

  const idle = unusedPair(forward);
  for (const key of idle) press(fixture, region, key.replace('keyboard.', ''));
  assert.match(reading(host) ?? '', new RegExp(LABELS[0] as string),
    'the pair this chart has no sequence for must move nothing, and must leave the page its own scroll');

  press(fixture, region, 'Escape');
  assert.equal(reading(host), null, 'Escape clears the cursor');

  return Object.fromEntries(CURSOR_KEYS.map((key) => [key, !idle.includes(key)]));
}

function noCursorVerdicts(fixture: { detectChanges: () => void }, host: Element): Record<string, boolean> {

  const legend = host.querySelector('[role="group"]') as HTMLElement;
  assert.notEqual(legend, null, 'the ring answers the keyboard through its legend, so the legend is the group');
  assert.equal(legend.getAttribute('tabindex'), null,
    'the legend rows are the stops; a stop on their container would be a dead one in front of them');
  assert.equal(host.querySelectorAll('[role="group"] > button').length, VALUES.length,
    'one reachable button per slice, so a slice is not walked to');

  press(fixture, legend, 'ArrowRight');
  assert.equal(reading(host), null, 'a ring has no sequence to arrow along, and pretending otherwise would be a lie');

  return Object.fromEntries(CURSOR_KEYS.map((key) => [key, false]));
}

function assertFigure(host: Element, tail: string, cursor: Record<string, boolean>): void {
  const graphic = host.querySelector('[role="img"]') as Element;
  assert.match(graphic.getAttribute('aria-label') ?? '', /\S/, 'the graphic must carry a name');

  const table = host.querySelector('table') as HTMLTableElement;
  assert.notEqual(table, null, 'a chart with no data table is a picture nobody can read');
  const pairs = [...table.querySelectorAll('tbody tr')]
    .map((row) => [...row.querySelectorAll('th, td')].map((c) => (c.textContent ?? '').trim()));
  assert.deepEqual(pairs, LABELS.map((label, i) => [label, String(VALUES[i])]),
    'the table and the picture must not be able to disagree');
  assert.equal(table.getAttribute('aria-hidden'), null, 'the table must stay in the accessibility tree');
  assert.equal(table.parentElement?.style.position, 'absolute',
    'it is hidden by its wrapper being taken out of flow, not by being removed');

  assertPattern({
    root: host,
    bindingPath: join(ANGULAR_COMPONENTS, tail),
    subjects: { default: graphic },
    behavioural: { 'alternative.table': true, ...cursor },
  });
}

test('arena-doughnut-chart matches its figure-with-data-table binding, which excepts nothing', () => {
  const fixture = TestBed.createComponent(ArenaDoughnutChart);
  fixture.componentRef.setInput('labels', LABELS);
  fixture.componentRef.setInput('series', [{ label: SERIES, values: VALUES }]);
  fixture.componentRef.setInput('label', CHART);
  fixture.detectChanges();
  try {
    const host = fixture.nativeElement as Element;
    assertFigure(host, 'charts/arena-doughnut-chart/ArenaDoughnutChart.behaviour.json',
      noCursorVerdicts(fixture, host));
  } finally {
    fixture.destroy();
  }
});

test('arena-line-chart matches its figure-with-data-table binding, which excepts nothing', () => {
  const fixture = TestBed.createComponent(ArenaLineChart);
  fixture.componentRef.setInput('labels', LABELS);
  fixture.componentRef.setInput('series', [{ label: SERIES, values: VALUES }]);
  fixture.componentRef.setInput('label', CHART);
  fixture.detectChanges();
  try {
    const host = fixture.nativeElement as Element;
    assertFigure(host, 'charts/arena-line-chart/ArenaLineChart.behaviour.json', cursorVerdicts(fixture, host));
  } finally {
    fixture.destroy();
  }
});

test('arena-horizontal-bar-chart matches its binding, whose cursor answers the vertical arrows', () => {
  const fixture = TestBed.createComponent(ArenaHorizontalBarChart);
  fixture.componentRef.setInput('labels', LABELS);
  fixture.componentRef.setInput('series', [{ label: SERIES, values: VALUES }]);
  fixture.componentRef.setInput('label', CHART);
  fixture.detectChanges();
  try {
    const host = fixture.nativeElement as Element;
    assertFigure(host, 'charts/arena-horizontal-bar-chart/ArenaHorizontalBarChart.behaviour.json',
      cursorVerdicts(fixture, host, 'down'));
  } finally {
    fixture.destroy();
  }
});

test('arena-pyramid-chart matches its binding, and keeps both sides unsigned in the table', () => {
  const fixture = TestBed.createComponent(ArenaPyramidChart);
  fixture.componentRef.setInput('labels', LABELS);
  fixture.componentRef.setInput('series', [
    { label: 'Women', values: VALUES },
    { label: 'Men', values: [9, 27, 11] },
  ]);
  fixture.componentRef.setInput('label', CHART);
  fixture.detectChanges();
  try {
    const host = fixture.nativeElement as Element;
    const head = [...host.querySelectorAll('thead th')].map((c) => (c.textContent ?? '').trim());
    assert.deepEqual(head, ['Category', 'Women', 'Men'], 'each side heads its own column under its own name');

    const cells = [...host.querySelectorAll('tbody td')].map((c) => (c.textContent ?? '').trim());
    assert.ok(cells.every((c) => !c.startsWith('-')),
      'the left side is negated when it is DRAWN and never in the table');

    assertPattern({
      root: host,
      bindingPath: join(ANGULAR_COMPONENTS, 'charts/arena-pyramid-chart/ArenaPyramidChart.behaviour.json'),
      subjects: { default: host.querySelector('[role="img"]') },
      behavioural: { 'alternative.table': true, ...cursorVerdicts(fixture, host, 'down') },
    });
  } finally {
    fixture.destroy();
  }
});

test('arena-radar-chart matches its binding, and its cursor walks the axes round the circle', () => {
  const fixture = TestBed.createComponent(ArenaRadarChart);
  fixture.componentRef.setInput('labels', LABELS);
  fixture.componentRef.setInput('series', [{ label: SERIES, values: VALUES }]);
  fixture.componentRef.setInput('label', CHART);
  fixture.detectChanges();
  try {
    const host = fixture.nativeElement as Element;
    assertFigure(host, 'charts/arena-radar-chart/ArenaRadarChart.behaviour.json', cursorVerdicts(fixture, host));
  } finally {
    fixture.destroy();
  }
});

test('arena-scatter-chart matches its binding, and its table names both quantities', () => {
  const fixture = TestBed.createComponent(ArenaScatterChart);
  fixture.componentRef.setInput('series', [
    { label: 'Staging', x: [12, 19, 24], y: [240, 310, 290] },
    { label: 'Production', x: [15, 22], y: [180, 205] },
  ]);
  fixture.componentRef.setInput('label', CHART);
  fixture.componentRef.setInput('xLabel', 'Concurrent requests');
  fixture.componentRef.setInput('yLabel', 'p95 latency');
  fixture.detectChanges();
  try {
    const host = fixture.nativeElement as Element;
    const head = [...host.querySelectorAll('thead th')].map((c) => (c.textContent ?? '').trim());
    assert.deepEqual(head, ['Series', 'Concurrent requests', 'p95 latency']);

    const rows = [...host.querySelectorAll('tbody tr')]
      .map((row) => [...row.querySelectorAll('th, td')].map((c) => (c.textContent ?? '').trim()));
    assert.equal(rows.length, 5, 'one row per pair, across both series');
    assert.deepEqual(rows[3], ['Production', '15', '180']);

    assert.equal(host.querySelectorAll('circle').length, 5, 'one mark per pair and no more');

    assertPattern({
      root: host,
      bindingPath: join(ANGULAR_COMPONENTS, 'charts/arena-scatter-chart/ArenaScatterChart.behaviour.json'),
      subjects: { default: host.querySelector('[role="img"]') },
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
  } finally {
    fixture.destroy();
  }
});

const SPARK = 'Deliveries this week';

function renderSparkline(interactive: boolean) {
  const fixture = TestBed.createComponent(ArenaSparkline);
  fixture.componentRef.setInput('labels', LABELS);
  fixture.componentRef.setInput('series', [{ label: SERIES, values: VALUES }]);
  fixture.componentRef.setInput('label', SPARK);
  fixture.componentRef.setInput('interactive', interactive);
  fixture.detectChanges();
  return fixture;
}

function sparkFigure(host: Element): Element {
  const graphic = host.querySelector('[role="img"]');
  assert.notEqual(graphic, null, 'a sparkline with no role="img" is a decoration, not a figure');
  assert.equal(graphic!.getAttribute('aria-label'), `${SPARK} — sparkline`, 'the name is the locale word around label');
  const table = host.querySelector('table') as HTMLTableElement;
  assert.equal((table.querySelector('caption')?.textContent ?? '').trim(), `${SPARK} — sparkline`, 'the caption is the same name');
  const head = [...table.querySelectorAll('thead th')].map((c) => (c.textContent ?? '').trim());
  assert.deepEqual(head, ['Point', SERIES], 'the point column, then the series under its own name');
  const rows = [...table.querySelectorAll('tbody tr')]
    .map((row) => [...row.querySelectorAll('th, td')].map((c) => (c.textContent ?? '').trim()));
  assert.deepEqual(rows, LABELS.map((label, i) => [label, String(VALUES[i])]), 'every point is a row, its label and its number');
  return graphic!;
}

test('arena-sparkline meets both of its declared cases', () => {
  const fixtures: { destroy: () => void }[] = [];
  try {
    assertPatternCases({
      bindingPath: join(ANGULAR_COMPONENTS, 'charts/arena-sparkline/ArenaSparkline.behaviour.json'),
      cases: {
        static: () => {
          const fixture = renderSparkline(false);
          fixtures.push(fixture);
          const host = fixture.nativeElement as Element;
          const graphic = sparkFigure(host);
          assert.equal(host.querySelectorAll('[tabindex]').length, 0, 'the static case is no tab stop at all');
          assertNoNode(host.querySelector('[role="group"]'), 'with no keyboard there is no region to name');
          press(fixture, host.querySelector('svg')!.parentElement!, 'ArrowRight');
          assert.equal(reading(host), null, 'a key reaches nothing, so no cursor and no tooltip appear');
          return {
            root: host, subjects: { default: graphic },
            behavioural: { 'alternative.table': true, ...Object.fromEntries(CURSOR_KEYS.map((key) => [key, false])) },
          };
        },
        interactive: () => {
          const fixture = renderSparkline(true);
          fixtures.push(fixture);
          const host = fixture.nativeElement as Element;
          const graphic = sparkFigure(host);
          assert.equal(host.querySelector('[role="group"]')?.getAttribute('aria-label'), `${SPARK} — sparkline`,
            'the keyboard region carries the same name');
          return { root: host, subjects: { default: graphic }, behavioural: { 'alternative.table': true, ...cursorVerdicts(fixture, host) } };
        },
      },
    });
  } finally {
    for (const fixture of fixtures) fixture.destroy();
  }
});

test('arena-sparkline draws the crosshair and the enlarged dot where the cursor is, and clears both on Escape', () => {
  const fixture = renderSparkline(true);
  try {
    const host = fixture.nativeElement as Element;
    const region = host.querySelector('[role="group"]')!;
    const dashed = () => [...host.querySelectorAll('line')].filter((l) => l.getAttribute('stroke-dasharray'));
    const radii = () => [...host.querySelectorAll('circle')].map((c) => c.getAttribute('r')).sort();
    assert.equal(dashed().length, 0, 'at rest there is no crosshair');
    assert.deepEqual(radii(), ['4'], 'at rest only the end dot is drawn');
    press(fixture, region, 'Home');
    assert.equal(dashed().length, 1, 'the cursor draws one crosshair');
    assert.equal(dashed()[0]!.getAttribute('stroke'), 'var(--edge-axis)', 'the crosshair is drawn in edge-axis, as the line chart\'s');
    assert.deepEqual(radii(), ['4', '5'], 'the end dot at rest and the cursor dot enlarged');
    press(fixture, region, 'End');
    assert.deepEqual(radii(), ['5'], 'on the last point the end dot is the cursor dot');
    press(fixture, region, 'Escape');
    assert.equal(dashed().length, 0, 'Escape clears the crosshair');
    assert.deepEqual(radii(), ['4']);
  } finally {
    fixture.destroy();
  }
});

test('the arena-sparkline readout starts at the first point and ends at the last, so it never leaves the frame', () => {
  const fixture = renderSparkline(true);
  try {
    const host = fixture.nativeElement as Element;
    const region = host.querySelector('[role="group"]')!;
    const shift = () => host.querySelector<HTMLElement>('[data-arena-part="sparkline.tooltip"]')!.style.getPropertyValue('--arena-sparkline-shift');
    press(fixture, region, 'Home');
    assert.equal(shift(), '0', 'on the first point the readout is start-aligned on the point');
    press(fixture, region, 'End');
    assert.equal(shift(), '1', 'on the last point the readout is end-aligned on the point');
    press(fixture, region, 'ArrowLeft');
    assert.ok(Number(shift()) > 0 && Number(shift()) < 1, 'between the ends the readout slides with the point');
  } finally {
    fixture.destroy();
  }
});

test('an interactive arena-sparkline is a keyboard region at least the smallest control height, with the plot centred in it', () => {
  const live = renderSparkline(true);
  try {
    const host = live.nativeElement as Element;
    const region = host.querySelector<HTMLElement>('[role="group"]')!;
    assert.equal(region.style.minHeight, 'var(--dz-ctl-h-sm)', 'the region is never shorter than the density\'s smallest control');
    assert.equal(region.style.display, 'flex');
    assert.equal(region.style.alignItems, 'center', 'the plot sits on the middle of the region');
    assert.equal(host.querySelector<HTMLElement>('[data-arena-part="sparkline.frame"]')!.style.height, '',
      'the frame is as tall as the region it holds');
  } finally {
    live.destroy();
  }
  const still = renderSparkline(false);
  try {
    const host = still.nativeElement as Element;
    const plot = host.querySelector('svg')!.parentElement as HTMLElement;
    assert.equal(plot.style.minHeight, '', 'the static plot keeps the height of its line');
    assert.equal(plot.style.display, 'block');
    assert.equal(host.querySelector<HTMLElement>('[data-arena-part="sparkline.frame"]')!.style.height, '20px');
  } finally {
    still.destroy();
  }
});

test('a static arena-sparkline answers no pointer, because it draws nothing a pointer could reveal', () => {
  const fixture = renderSparkline(false);
  try {
    const host = fixture.nativeElement as Element;
    assertNoNode(host.querySelector('rect'), 'no overlay listens for the pointer');
    host.querySelector('svg')!.dispatchEvent(new MouseEvent('pointermove', { clientX: 10, bubbles: true }));
    fixture.detectChanges();
    assert.equal(reading(host), null, 'a pointer over a static sparkline shows no tooltip');
  } finally {
    fixture.destroy();
  }
});

@Component({
  selector: 'chart-data-table-spark-column',
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell, ArenaSparkline],
  template: `
    <arena-table label="Services" [columns]="columns" [responsive]="false">
      @for (name of names; track name) {
        <tr arena-table-row>
          <td arena-table-cell>{{ name }}</td>
          <td arena-table-cell>
            @if (mode() === 'text') { {{ name }} }
            @else { <arena-sparkline [label]="'Trend ' + name" [labels]="labels" [series]="series" [interactive]="mode() === 'live'" /> }
          </td>
        </tr>
      }
    </arena-table>
  `,
})
class SparkColumnHost {
  readonly columns = [{ header: 'Service' }, { header: 'Trend' }];
  readonly names = ['checkout-api', 'billing-worker', 'search'];
  readonly labels = LABELS;
  readonly series = [{ label: SERIES, values: VALUES }];
  readonly mode = signal<'text' | 'static' | 'live'>('text');
}

test('a table with a column of static sparklines has the tab stops of the same table without them', () => {
  const root = document.documentElement;
  root.style.setProperty('--bp-md', '768px');
  const fixture = TestBed.createComponent(SparkColumnHost);
  try {
    fixture.detectChanges();
    const host = fixture.nativeElement as Element;
    const without = host.querySelectorAll('[tabindex="0"]').length;
    fixture.componentInstance.mode.set('static');
    fixture.detectChanges();
    assert.equal(host.querySelectorAll('svg[role="img"]').length, 3, 'every row draws its sparkline');
    assert.equal(host.querySelectorAll('[tabindex="0"]').length, without, 'a static sparkline adds no stop to the grid');
    fixture.componentInstance.mode.set('live');
    fixture.detectChanges();
    assert.equal(host.querySelectorAll('[role="group"][tabindex="0"]').length, 3,
      'an interactive sparkline is a control inside its cell and keeps a stop of its own, which is why the column default is static');
  } finally {
    fixture.destroy();
    root.style.removeProperty('--bp-md');
  }
});

const MARK_LABELS = ['Mon', 'Tue', 'Wed'];
const MARK_SERIES = [{ label: 'p95', values: [120, 180, 150] }];

function renderMarks(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(ArenaSparkline);
  fixture.componentRef.setInput('label', 'p95');
  fixture.componentRef.setInput('labels', MARK_LABELS);
  fixture.componentRef.setInput('series', MARK_SERIES);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  return fixture;
}

function captureWarnings(body: () => void): string[] {
  const captured: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => { captured.push(args.map(String).join(' ')); };
  try { body(); } finally { console.warn = original; }
  return captured;
}

const markYs = (host: Element) => [...host.querySelectorAll('polyline')]
  .flatMap((line) => (line.getAttribute('points') ?? '').split(' ').map((pair) => Number(pair.split(',')[1])));

const markCells = (host: Element) => [...host.querySelectorAll('tbody tr')]
  .map((row) => [...row.querySelectorAll('th, td')].map((cell) => (cell.textContent ?? '').trim()));

test('arena-sparkline is the sparkline height token tall by default, and the height input overrides it', () => {
  const fixture = renderMarks();
  try {
    const frame = () => (fixture.nativeElement as Element).querySelector<HTMLElement>('[data-arena-part="sparkline.frame"]')!;
    assert.equal(chartSparklineHeight, 20, 'the token is the compact row\'s line box');
    assert.equal(frame().style.height, `${chartSparklineHeight}px`);
    fixture.componentRef.setInput('height', 32);
    fixture.detectChanges();
    assert.equal(frame().style.height, '32px');
    fixture.componentRef.setInput('height', undefined);
    fixture.detectChanges();
    assert.equal(frame().style.height, `${chartSparklineHeight}px`, 'an explicit undefined falls back to the token');
  } finally {
    fixture.destroy();
  }
});

test('arena-sparkline spans its box with the data\'s own range, so the lowest value sits on the floor and the highest on the ceiling', () => {
  const fixture = renderMarks();
  try {
    const ys = markYs(fixture.nativeElement as Element);
    assert.deepEqual(ys, [16, 4, 10],
      'with a zero-based scale 120 to 180 would sit in a strip at the top of the box');
  } finally {
    fixture.destroy();
  }
});

test('arena-sparkline appends valueSuffix to every number of the accessible table', () => {
  const fixture = renderMarks({ valueSuffix: ' ms' });
  try {
    const cells = markCells(fixture.nativeElement as Element).map((row) => row[1]);
    assert.deepEqual(cells, ['120 ms', '180 ms', '150 ms']);
  } finally {
    fixture.destroy();
  }
});

test('arena-sparkline draws one end dot at the point radius, and no marker for the minimum or the maximum', () => {
  const fixture = renderMarks();
  try {
    const circles = [...(fixture.nativeElement as Element).querySelectorAll('circle')];
    assert.equal(circles.length, 1, 'one dot says where now is');
    assert.equal(circles[0]!.getAttribute('r'), '4');
    assert.equal(circles[0]!.getAttribute('cy'), '10', 'the dot is on the last point');
  } finally {
    fixture.destroy();
  }
});

test('arena-sparkline draws no axis, no tick, no label and no legend', () => {
  const fixture = renderMarks();
  try {
    const host = fixture.nativeElement as Element;
    assertNoNode(host.querySelector('text'), 'no text is drawn in the plot');
    assertNoNode(host.querySelector('line'), 'no axis and no gridline at rest');
    assertNoNode(host.querySelector('[data-arena-part*="legend"]'), 'no legend part is drawn');
  } finally {
    fixture.destroy();
  }
});

test('arena-sparkline draws the area fill only when area is set, down to the floor of the box', () => {
  const withArea = renderMarks({ area: true });
  const without = renderMarks();
  try {
    const fill = (withArea.nativeElement as Element).querySelector('path[stroke="none"]');
    assert.match(fill?.getAttribute('fill') ?? '', /color-mix\(in oklab, /, 'the 18% tint did not render');
    assert.match(fill?.getAttribute('d') ?? '', /L[^Z]*,16 [^Z]*Z/, 'the fill closes on the floor, which is the lowest value');
    assertNoNode((without.nativeElement as Element).querySelector('path[stroke="none"]'), 'the tint rendered without area being set');
  } finally {
    withArea.destroy();
    without.destroy();
  }
});

test('arena-sparkline takes the tone as its colour and the first identity slot otherwise', () => {
  const toned = renderMarks({ series: [{ ...MARK_SERIES[0]!, tone: 'danger' }] });
  const plain = renderMarks();
  try {
    assert.equal((toned.nativeElement as Element).querySelector('polyline')?.getAttribute('stroke'), 'var(--danger)');
    assert.equal((plain.nativeElement as Element).querySelector('polyline')?.getAttribute('stroke'), 'var(--color-cat-1)');
  } finally {
    toned.destroy();
    plain.destroy();
  }
});

test('arena-sparkline draws the first series and warns about a second, rather than drawing two lines with no legend', () => {
  forgetArenaWarnings();
  let fixture: ReturnType<typeof renderMarks> | undefined;
  try {
    const warnings = captureWarnings(() => {
      fixture = renderMarks({ series: [...MARK_SERIES, { label: 'p50', values: [1, 2, 3] }] });
    });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0]!, /ArenaSparkline: reads one series and was given 2\. A sparkline has no legend/);
    const host = fixture!.nativeElement as Element;
    assert.equal(host.querySelectorAll('polyline').length, 1);
    assert.doesNotMatch(host.innerHTML, /p50/, 'the ignored series reaches neither the plot nor the table');
  } finally {
    fixture?.destroy();
    forgetArenaWarnings();
  }
});

test('arena-sparkline drops a label with no value at its index, and writes an empty header for a value with no label', () => {
  const surplus = renderMarks({ labels: ['Alpha', 'Beta', 'SURPLUS'], series: [{ label: 'p95', values: [10, 20] }] });
  const short = renderMarks({ labels: ['Only'], series: [{ label: 'p95', values: [10, 20] }] });
  try {
    assert.doesNotMatch((surplus.nativeElement as Element).innerHTML, /SURPLUS/);
    const host = short.nativeElement as Element;
    assert.doesNotMatch(host.innerHTML, /undefined/);
    assert.deepEqual(markCells(host), [['Only', '10'], ['', '20']], 'the unlabelled point is still in the table');
    assert.equal(markYs(host).length, 2, 'the unlabelled point is still plotted');
  } finally {
    surplus.destroy();
    short.destroy();
  }
});

const GAUGE = 'CPU load';

const GAUGE_BANDS: ArenaGaugeBand[] = [
  { from: 0, tone: 'success', label: 'Healthy' },
  { from: 60, tone: 'warning', label: 'Elevated' },
  { from: 85, tone: 'danger', label: 'Critical' },
];

function renderGauge(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(ArenaGaugeChart);
  fixture.componentRef.setInput('label', GAUGE);
  fixture.componentRef.setInput('value', 72);
  fixture.componentRef.setInput('bands', GAUGE_BANDS);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  return fixture;
}

const gaugePaths = (host: Element) => [...host.querySelectorAll('svg path')]
  .map((path) => ({ d: path.getAttribute('d') ?? '', fill: path.getAttribute('fill') ?? '' }));
const gaugeTexts = (host: Element) => [...host.querySelectorAll('svg text')].map((text) => (text.textContent ?? '').trim());
const gaugeRows = (host: Element) => [...host.querySelectorAll('tbody tr')]
  .map((row) => [...row.querySelectorAll('th, td')].map((cell) => (cell.textContent ?? '').trim()));
const gaugeReading = (host: Element) => [...host.querySelectorAll('svg text')]
  .find((text) => text.getAttribute('fill') === 'var(--ink-heading)')!;
const gaugeTrack = (host: Element) => gaugePaths(host).find((path) => path.fill === 'var(--fill-track)')!;
const gaugeArc = (host: Element, fill: string) => gaugePaths(host).find((path) => path.fill === fill);
const gaugeFrame = (host: Element) => host.querySelector<HTMLElement>('[data-arena-part="gauge-chart.frame"]')!;

function onGauge(inputs: Record<string, unknown>, check: (host: Element) => void): void {
  const fixture = renderGauge(inputs);
  try {
    check(fixture.nativeElement as Element);
  } finally {
    fixture.destroy();
  }
}

test('arena-gauge-chart meets figure-with-data-table, with every cursor requirement excepted', () => {
  const fixture = renderGauge({ valueSuffix: ' %' });
  try {
    const host = fixture.nativeElement as Element;
    const graphic = host.querySelector('[role="img"]');
    assert.notEqual(graphic, null, 'a gauge with no role="img" is a decoration, not a figure');
    assert.equal(graphic!.getAttribute('aria-label'), `${GAUGE} — gauge`, 'the name is the locale word around label');
    const table = host.querySelector('table') as HTMLTableElement;
    assert.equal((table.querySelector('caption')?.textContent ?? '').trim(), `${GAUGE} — gauge`, 'the caption is the same name');
    const head = [...table.querySelectorAll('thead th')].map((c) => (c.textContent ?? '').trim());
    assert.deepEqual(head, ['Measure', 'Value']);
    assert.deepEqual(gaugeRows(host), [
      ['Value', '72 %'], ['Minimum', '0 %'], ['Maximum', '100 %'],
      ['Healthy', '0 % – 60 %'], ['Elevated', '60 % – 85 %'], ['Critical', '85 % – 100 %'],
    ], 'the table is the whole scale and not only the reading');
    assert.equal(host.querySelectorAll('[tabindex]').length, 0, 'the gauge is no tab stop at all');
    assertNoNode(host.querySelector('[role="group"]'), 'with no keyboard there is no region to name');
    press(fixture, host.querySelector('svg')!.parentElement!, 'ArrowRight');
    assert.equal(reading(host), null, 'a key reaches nothing, so no cursor and no tooltip appear');

    assertPattern({
      root: host,
      bindingPath: join(ANGULAR_COMPONENTS, 'charts/arena-gauge-chart/ArenaGaugeChart.behaviour.json'),
      subjects: { default: graphic! },
      behavioural: { 'alternative.table': true, ...Object.fromEntries(CURSOR_KEYS.map((key) => [key, false])) },
    });
  } finally {
    fixture.destroy();
  }
});

test('arena-gauge-chart is the gauge height token tall by default, and the height input overrides it', () => {
  const fixture = renderGauge();
  try {
    const host = fixture.nativeElement as Element;
    assert.equal(chartGaugeHeight, 200);
    assert.equal(gaugeFrame(host).style.height, `${chartGaugeHeight}px`);
    fixture.componentRef.setInput('height', 140);
    fixture.detectChanges();
    assert.equal(gaugeFrame(host).style.height, '140px');
    fixture.componentRef.setInput('height', undefined);
    fixture.detectChanges();
    assert.equal(gaugeFrame(host).style.height, `${chartGaugeHeight}px`, 'an explicit undefined falls back to the token');
  } finally {
    fixture.destroy();
  }
});

test('arena-gauge-chart writes the reading in the centre and the word of its band under it', () => {
  onGauge({ valueSuffix: ' %' }, (host) => {
    const written = gaugeTexts(host);
    assert.ok(written.includes('72 %'));
    assert.ok(written.includes('Elevated'));
    assert.equal(written.filter((t) => t === 'Healthy' || t === 'Critical').length, 0, 'only the band the value is in is named');
    assert.equal(gaugeReading(host).getAttribute('dominant-baseline'), null, 'with a word under it the number is not centred on the middle');
  });
});

test('arena-gauge-chart clamps the drawing above the scale and never the words', () => {
  onGauge({ value: 130, valueSuffix: ' %' }, (host) => {
    assert.equal(gaugeArc(host, 'var(--danger)')?.d, gaugeTrack(host).d, 'the arc ends where the track ends');
    assert.ok(gaugeTexts(host).includes('130 %'));
    assert.deepEqual(gaugeRows(host)[0], ['Value', '130 %']);
  });
});

test('arena-gauge-chart draws no arc below the scale, and still says the number it was given', () => {
  onGauge({ value: -20, valueSuffix: ' %' }, (host) => {
    assert.equal(gaugePaths(host).length, GAUGE_BANDS.length + 1, 'the band ring and the track only');
    assert.ok(gaugeTexts(host).includes('-20 %'));
    assert.ok(!gaugeTexts(host).includes('Healthy'), 'a value below the first band is in no band');
  });
});

test('arena-gauge-chart draws the empty track for a value that is not a number, with no reading and an empty cell', () => {
  onGauge({ value: Number.NaN }, (host) => {
    assert.equal(gaugePaths(host).length, GAUGE_BANDS.length + 1);
    assert.deepEqual(gaugeTexts(host), ['0', '60', '85', '100'], 'the scale is written and the reading is not');
    assert.deepEqual(gaugeRows(host)[0], ['Value', '']);
  });
});

test('arena-gauge-chart warns once for a scale with no length and draws only the track, with no tick', () => {
  forgetArenaWarnings();
  let fixture: ReturnType<typeof renderGauge> | undefined;
  try {
    const warnings = captureWarnings(() => { fixture = renderGauge({ value: 5, min: 0, max: 0 }); });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0]!, /ArenaGaugeChart: `max` \(0\) is not greater than `min` \(0\)/);
    const host = fixture!.nativeElement as Element;
    assert.equal(gaugePaths(host).length, 1);
    assert.equal(gaugePaths(host)[0]?.fill, 'var(--fill-track)');
    assertNoNode(host.querySelector('line'), 'no tick is drawn on a scale with no length');
    assert.deepEqual(gaugeTexts(host), ['5', 'Healthy'], 'no tick text, only the reading and the band the lookup finds');
  } finally {
    fixture?.destroy();
    forgetArenaWarnings();
  }
});

test('arena-gauge-chart reads bands given out of order as sorted, and warns', () => {
  forgetArenaWarnings();
  let fixture: ReturnType<typeof renderGauge> | undefined;
  try {
    const warnings = captureWarnings(() => {
      fixture = renderGauge({ bands: [GAUGE_BANDS[2]!, GAUGE_BANDS[0]!, GAUGE_BANDS[1]!] });
    });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0]!, /ArenaGaugeChart: reads its bands in ascending order of `from`/);
    const host = fixture!.nativeElement as Element;
    assert.deepEqual(gaugeRows(host).slice(3).map((r) => r[0]), ['Healthy', 'Elevated', 'Critical']);
    assert.ok(gaugeTexts(host).includes('Elevated'));
  } finally {
    fixture?.destroy();
    forgetArenaWarnings();
  }
});

test('arena-gauge-chart without bands draws one arc in an identity colour, no band and no word', () => {
  onGauge({ bands: undefined }, (host) => {
    assert.equal(gaugePaths(host).length, 2, 'the track and the arc');
    assert.ok(gaugeArc(host, 'var(--color-cat-1)'));
    assert.deepEqual(gaugeTexts(host), ['0', '100', '72']);
    assert.equal(gaugeReading(host).getAttribute('dominant-baseline'), 'middle', 'the number alone sits on the middle of the dial');
  });
  onGauge({ bands: undefined, colorId: 3 }, (host) => {
    assert.ok(gaugeArc(host, 'var(--color-cat-3)'));
  });
});

test('arena-gauge-chart a band wholly outside the scale draws no segment of the ring', () => {
  const bands = [{ from: 0, tone: 'success', label: 'Healthy' }, { from: 140, tone: 'danger', label: 'Critical' }];
  onGauge({ bands, value: 50 }, (host) => {
    assert.equal(gaugePaths(host).filter((path) => path.fill === 'var(--fill-track)').length, 1);
    assert.equal(gaugePaths(host).length, 3, 'one ring segment, the track and the arc');
    assert.deepEqual(gaugeRows(host).slice(3).map((r) => r[0]), ['Healthy', 'Critical'], 'the table still lists both bands');
  });
});

test('arena-gauge-chart ignores colorId beside bands, with a warning', () => {
  forgetArenaWarnings();
  let fixture: ReturnType<typeof renderGauge> | undefined;
  try {
    const warnings = captureWarnings(() => { fixture = renderGauge({ colorId: 3 }); });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0]!, /ArenaGaugeChart: `colorId` is ignored while `bands` is given/);
    const host = fixture!.nativeElement as Element;
    assert.ok(gaugeArc(host, 'var(--warning)'));
    assert.equal(gaugeArc(host, 'var(--color-cat-3)'), undefined);
  } finally {
    fixture?.destroy();
    forgetArenaWarnings();
  }
});

test('arena-gauge-chart ignores colorId beside bands with a warning, even when the value draws no arc', () => {
  for (const value of [-20, Number.NaN]) {
    forgetArenaWarnings();
    let fixture: ReturnType<typeof renderGauge> | undefined;
    try {
      const warnings = captureWarnings(() => { fixture = renderGauge({ colorId: 3, value }); });
      assert.equal(warnings.length, 1, `value ${value}`);
      assert.match(warnings[0]!, /ArenaGaugeChart: `colorId` is ignored while `bands` is given/);
    } finally {
      fixture?.destroy();
      forgetArenaWarnings();
    }
  }
});

test('arena-gauge-chart takes the identity slot and no word for a value below the first band', () => {
  onGauge({ value: 5, bands: [{ from: 10, tone: 'success', label: 'Healthy' }, ...GAUGE_BANDS.slice(1)] }, (host) => {
    assert.ok(gaugeArc(host, 'var(--color-cat-1)'));
    assert.ok(!gaugeTexts(host).includes('Healthy'));
  });
});

test('arena-gauge-chart paints the arc in the tone of the band the value is in', () => {
  onGauge({ value: 72 }, (host) => assert.ok(gaugeArc(host, 'var(--warning)')));
  onGauge({ value: 90 }, (host) => assert.ok(gaugeArc(host, 'var(--danger)')));
  onGauge({ value: 60 }, (host) => assert.ok(gaugeArc(host, 'var(--warning)'), 'a band includes its lower edge'));
});

test('arena-gauge-chart sweeps from the 7:30 point to the 4:30 point, whatever the numbers are', () => {
  onGauge({}, (host) => {
    const { d } = gaugeTrack(host);
    const { cy, track } = arenaGaugeRadii(600, chartGaugeHeight);
    const start = arenaGaugePoint(300, cy, track.outer, 0);
    const end = arenaGaugePoint(300, cy, track.outer, 1);
    const [, x0, y0] = /^M([-\d.e]+),([-\d.e]+)/.exec(d) ?? [];
    const [, x1, y1] = /A[^ ]+ 0 \d 1 ([-\d.e]+),([-\d.e]+)/.exec(d) ?? [];
    const near = (a: string | undefined, b: number) => Math.abs(Number(a) - b) < 1e-9;
    assert.ok(near(x0, start.x) && near(y0, start.y), 'the arc starts at the lower left');
    assert.ok(near(x1, end.x) && near(y1, end.y), 'the arc ends at the lower right');
    assert.ok(start.x < 300 && start.y > cy, 'the start is below the centre and left of it');
    assert.ok(end.x > 300 && end.y > cy, 'the end is below the centre and right of it');
    assert.ok(Math.abs(start.y - end.y) < 1e-9 && Math.abs(300 - start.x - (end.x - 300)) < 1e-9, 'the two ends mirror about the vertical');
  });
});

test('arena-gauge-chart writes both ends and every band edge once, in mono, as text', () => {
  onGauge({}, (host) => {
    const ticks = [...host.querySelectorAll('svg text')]
      .filter((text) => text.getAttribute('font-family') === 'var(--font-mono)' && (text as HTMLElement).style.fontSize === 'var(--dz-text-2xs)')
      .map((text) => (text.textContent ?? '').trim());
    assert.deepEqual(ticks, ['0', '60', '85', '100']);
    assert.equal(host.querySelectorAll('line').length, 4);
  });
  onGauge({ bands: [{ from: 0, tone: 'success', label: 'Healthy' }, ...GAUGE_BANDS.slice(1)] }, (host) => {
    assert.equal(gaugeTexts(host).filter((t) => t === '0').length, 1, 'a band that starts at the minimum does not write it twice');
  });
});

test('arena-gauge-chart throws without a label or with an empty one, and for a band without its word', () => {
  const missing = TestBed.createComponent(ArenaGaugeChart);
  try {
    assert.throws(() => missing.detectChanges(), /NG0950/);
  } finally {
    missing.destroy();
  }
  const unnamed = TestBed.createComponent(ArenaGaugeChart);
  unnamed.componentRef.setInput('label', '');
  unnamed.componentRef.setInput('value', 1);
  try {
    assert.throws(() => unnamed.detectChanges(), wholeMessage('ArenaGaugeChart'));
  } finally {
    unnamed.destroy();
  }
  const wordless = TestBed.createComponent(ArenaGaugeChart);
  wordless.componentRef.setInput('label', GAUGE);
  wordless.componentRef.setInput('value', 1);
  wordless.componentRef.setInput('bands', [{ from: 0, tone: 'success', label: '' }]);
  try {
    assert.throws(() => wordless.detectChanges(), /ArenaGaugeChart: every band needs a `label`/);
  } finally {
    wordless.destroy();
  }
});

test('arena-gauge-chart adds no tab stop, no keyboard region and no pointer surface', () => {
  const fixture = renderGauge();
  try {
    const listeners = fixture.debugElement.queryAll(() => true).flatMap((node) => node.listeners);
    assert.equal(listeners.length, 0, 'the gauge registers no event listener');
  } finally {
    fixture.destroy();
  }
  onGauge({}, (host) => {
    assertNoNode(host.querySelector('[tabindex]'), 'no tab stop');
    assertNoNode(host.querySelector('[role="group"]'), 'no keyboard region');
    assertNoNode(host.querySelector('rect'), 'no pointer surface');
  });
});

const FUNNEL = 'Trial conversion';
const STAGES = ['Visits', 'Sign-ups', 'Activated', 'Subscribed', 'Retained'];
const COUNTS = [12480, 3120, 1904, 702, 518];

function renderFunnel(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(ArenaFunnelChart);
  fixture.componentRef.setInput('label', FUNNEL);
  fixture.componentRef.setInput('labels', STAGES);
  fixture.componentRef.setInput('series', [{ label: 'Accounts', values: COUNTS }]);
  fixture.componentRef.setInput('valueFormat', { grouping: true });
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  return fixture;
}

function renderValues(values: number[], inputs: Record<string, unknown> = {}) {
  return renderFunnel({
    labels: values.map((_, i) => `S${i + 1}`), series: [{ label: 'Accounts', values }], valueFormat: undefined, ...inputs,
  });
}

function onFunnel(fixture: ReturnType<typeof renderFunnel>, check: (host: Element) => void): void {
  try {
    check(fixture.nativeElement as Element);
  } finally {
    fixture.destroy();
  }
}

const funnelMarks = (host: Element) => [...host.querySelectorAll('svg rect[rx]')].map((rect) => ({
  x: Number(rect.getAttribute('x')), y: Number(rect.getAttribute('y')),
  width: Number(rect.getAttribute('width')), height: Number(rect.getAttribute('height')),
  fill: rect.getAttribute('fill') ?? '',
}));
const funnelConnectors = (host: Element) => [...host.querySelectorAll('svg path')]
  .map((path) => ({ d: path.getAttribute('d') ?? '', fill: path.getAttribute('fill') ?? '' }));
const funnelTexts = (host: Element) => [...host.querySelectorAll('svg text')].map((text) => ({
  x: Number(text.getAttribute('x')), anchor: text.getAttribute('text-anchor') ?? '', text: (text.textContent ?? '').trim(),
}));
const funnelTable = (host: Element) => ({
  head: [...host.querySelectorAll('thead th')].map((c) => (c.textContent ?? '').trim()),
  rows: [...host.querySelectorAll('tbody tr')]
    .map((row) => [...row.querySelectorAll('th, td')].map((c) => (c.textContent ?? '').trim())),
});
const funnelGutter = (host: Element) => funnelTexts(host).filter((t) => t.anchor !== 'end').map((t) => t.text).sort();
const funnelCells = (host: Element) => funnelTable(host).rows.flatMap((row) => [row[1], row[2]]).filter((cell) => cell !== '').sort();
const funnelLines = (host: Element) => [...host.querySelectorAll('[data-arena-part="funnel-chart.tooltip-value"]')]
  .map((line) => (line.textContent ?? '').trim());

test('arena-funnel-chart matches its binding, and its cursor walks stages and reads both conversions', () => {
  const fixture = TestBed.createComponent(ArenaFunnelChart);
  fixture.componentRef.setInput('labels', LABELS);
  fixture.componentRef.setInput('series', [{ label: SERIES, values: VALUES }]);
  fixture.componentRef.setInput('label', CHART);
  fixture.detectChanges();
  try {
    const host = fixture.nativeElement as Element;
    const graphic = host.querySelector('[role="img"]');
    assert.notEqual(graphic, null, 'a chart with no role="img" is a decoration, not a figure');
    assert.equal(graphic!.getAttribute('aria-label'), `${CHART} — funnel chart`, 'the name is the locale word around label');
    assert.deepEqual(funnelTable(host).head, ['Category', SERIES, 'Of previous stage', 'Of first stage'],
      'the stage column, the series under its own name, then the two conversions');

    const region = host.querySelector('[role="group"]') as HTMLElement;
    press(fixture, region, 'ArrowDown');
    assert.deepEqual(funnelLines(host), ['12', 'Of first stage: 100%'],
      'the first stage reads its count and only the total, because nothing precedes it');
    press(fixture, region, 'ArrowDown');
    assert.deepEqual(funnelLines(host), ['30', 'Of previous stage: 250%', 'Of first stage: 250%'],
      'a later stage reads its count and both conversions');
    press(fixture, region, 'Escape');
    assert.equal(reading(host), null, 'Escape clears the cursor');
    press(fixture, region, 'ArrowRight');
    assert.equal(reading(host), null, 'the horizontal pair is idle and moves nothing');

    assertPattern({
      root: host,
      bindingPath: join(ANGULAR_COMPONENTS, 'charts/arena-funnel-chart/ArenaFunnelChart.behaviour.json'),
      subjects: { default: graphic },
      behavioural: { 'alternative.table': true, ...cursorVerdicts(fixture, host, 'down') },
    });
  } finally {
    fixture.destroy();
  }
});

function funnelReads(values: number[], showConversion: boolean): Array<{ name: string; lines: string[] }> {
  const fixture = renderValues(values, { showConversion });
  try {
    const host = fixture.nativeElement as Element;
    const region = host.querySelector('[role="group"]') as HTMLElement;
    return values.map(() => {
      press(fixture, region, 'ArrowDown');
      return {
        name: (host.querySelector('[data-arena-part="funnel-chart.tooltip-label"]')?.textContent ?? '').trim(),
        lines: funnelLines(host),
      };
    });
  } finally {
    fixture.destroy();
  }
}

test('arena-funnel-chart omits the tooltip lines it has no number for, and the conversions when they are off', () => {
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

test('arena-funnel-chart is a named figure whose table holds the counts and both conversions', () => {
  onFunnel(renderFunnel(), (host) => {
    assert.equal(host.querySelector('svg')!.getAttribute('aria-label'), 'Trial conversion — funnel chart');
    assert.equal((host.querySelector('caption')?.textContent ?? '').trim(), 'Trial conversion — funnel chart');
    const { head, rows } = funnelTable(host);
    assert.deepEqual(head, ['Category', 'Accounts', 'Of previous stage', 'Of first stage']);
    assert.equal(rows.length, 5);
    assert.equal(rows[0]![2], '', 'the first stage has no stage before it, so its step cell is empty');
    assert.deepEqual(rows[0], ['Visits', '12,480', '', '100%']);
    assert.equal(rows[1]![3], '25%');
  });
});

test('arena-funnel-chart without the conversion is two columns and draws no connector', () => {
  onFunnel(renderFunnel({ showConversion: false }), (host) => {
    const { head, rows } = funnelTable(host);
    assert.deepEqual(head, ['Category', 'Accounts']);
    assert.ok(rows.every((row) => row.length === 2));
    assert.equal(funnelConnectors(host).length, 0, 'no connector is drawn');
    assert.ok(!funnelTexts(host).some((t) => t.text.endsWith('%')), 'no conversion is written');
  });
});

test('arena-funnel-chart draws a width proportional to the value from zero', () => {
  onFunnel(renderFunnel(), (host) => {
    const [first, second] = funnelMarks(host);
    assert.ok(Math.abs(second!.width / first!.width - 3120 / 12480) < 1e-6);
  });
});

test('arena-funnel-chart gives a mark twice the height of the gap between two marks', () => {
  onFunnel(renderFunnel(), (host) => {
    const [first, second] = funnelMarks(host);
    const gap = second!.y - (first!.y + first!.height);
    assert.ok(Math.abs(first!.height - 2 * gap) < 1e-6, `a mark of ${first!.height} over a gap of ${gap}`);
  });
});

test('arena-funnel-chart centres every mark on one axis', () => {
  onFunnel(renderFunnel(), (host) => {
    const centres = funnelMarks(host).map((m) => m.x + m.width / 2);
    assert.ok(centres.every((c) => Math.abs(c - centres[0]!) < 1e-6));
  });
});

test('arena-funnel-chart draws a stage larger than its predecessor as it is and writes its ratio above 100%', () => {
  onFunnel(renderValues([100, 150]), (host) => {
    const [first, second] = funnelMarks(host);
    assert.ok(second!.width > first!.width, 'the second mark is wider and nothing is clamped');
    const [connector] = funnelConnectors(host);
    const [, lowerRight, lowerLeft] = [...connector!.d.matchAll(/L([\d.]+),/g)].map((m) => Number(m[1]));
    assert.ok(lowerRight! > first!.x + first!.width, 'the connector widens towards the larger stage');
    assert.ok(lowerLeft! < first!.x, 'both lower corners lie outside the narrower mark');
    assert.equal(funnelTable(host).rows[1]![2], '150%');
    assert.ok(funnelTexts(host).some((t) => t.text === '150%'), 'the drawing writes what the table writes');
  });
});

test('arena-funnel-chart draws a zero stage with no width and leaves the next step empty', () => {
  onFunnel(renderValues([100, 0, 50]), (host) => {
    assert.equal(funnelMarks(host)[1]!.width, 0);
    const rows = funnelTable(host).rows;
    assert.equal(rows[1]![2], '0%', 'a zero over a positive count is 0%');
    assert.equal(rows[2]![2], '', 'a ratio over a zero is the empty cell and never 0%');
    assert.deepEqual(funnelGutter(host), ['0', '0%', '100', '50'], 'the drawing writes one 0% and no step under the zero stage');
    assert.deepEqual(funnelGutter(host), funnelCells(host), 'the gutter holds exactly the non-empty count and step cells');
  });
});

test('arena-funnel-chart draws a negative stage with no width and writes it as passed', () => {
  onFunnel(renderValues([100, -5]), (host) => {
    assert.equal(funnelMarks(host)[1]!.width, 0);
    assert.equal(funnelTable(host).rows[1]![1], '-5');
    assert.deepEqual(funnelGutter(host), ['-5', '-5%', '100'], 'the drawing writes the count and the step as passed');
    assert.deepEqual(funnelGutter(host), funnelCells(host), 'the gutter holds exactly the non-empty count and step cells');
  });
});

test('arena-funnel-chart draws no mark for a missing stage and no connector touching it', () => {
  onFunnel(renderFunnel({ labels: ['A', 'B', 'C'], series: [{ label: 'Accounts', values: [100, 50] }], valueFormat: undefined }), (host) => {
    assert.equal(funnelMarks(host).length, 2, 'no third mark');
    assert.equal(funnelConnectors(host).length, 1, 'only the connector between the two stages that exist');
    assert.deepEqual(funnelTable(host).rows[2], ['C', '', '', '']);
    assert.deepEqual(funnelGutter(host), ['100', '50', '50%'], 'no count is written for the missing stage');
    assert.deepEqual(funnelGutter(host), funnelCells(host), 'the gutter holds exactly the non-empty count and step cells');
  });
  onFunnel(renderValues([100, Number.NaN, 25]), (host) => {
    assert.equal(funnelMarks(host).length, 2, 'a NaN draws no mark');
    assert.equal(funnelConnectors(host).length, 0, 'and breaks the connector on either side');
    assert.deepEqual(funnelTable(host).rows[1], ['S2', '', '', '']);
    assert.deepEqual(funnelGutter(host), ['100', '25'], 'no count and no step is written for the missing stage or beside it');
    assert.deepEqual(funnelGutter(host), funnelCells(host), 'the gutter holds exactly the non-empty count and step cells');
  });
});

test('arena-funnel-chart draws a stage a hundredth of the first wider than nothing', () => {
  onFunnel(renderValues([10000, 100]), (host) => {
    assert.ok(funnelMarks(host)[1]!.width > 0);
  });
});

test('arena-funnel-chart puts no text inside a mark, whatever its anchor', () => {
  onFunnel(renderFunnel(), (host) => {
    const drawn = funnelMarks(host);
    const left = Math.min(...drawn.map((m) => m.x));
    const right = Math.max(...drawn.map((m) => m.x + m.width));
    for (const { x, anchor, text } of funnelTexts(host)) {
      if (anchor === 'end') assert.ok(x <= left, `the name ${text} ends at ${x}, left of the marks at ${left}`);
      else assert.ok(x >= right, `${text} starts at ${x}, right of the marks at ${right}`);
    }
  });
});

test('arena-funnel-chart widens its right gutter with the widest text and never draws a mark into it', () => {
  const edge = (host: Element) => { const m = funnelMarks(host)[0]!; return m.x + m.width; };
  const start = (host: Element) => funnelTexts(host).find((t) => t.anchor === 'start')!.x;
  const narrow = renderFunnel({ series: [{ label: 'Accounts', values: [9, 8, 7, 6, 5] }], valueFormat: undefined });
  const wide = renderFunnel({ series: [{ label: 'Accounts', values: [9000000, 8, 7, 6, 5] }], valueFormat: undefined });
  try {
    const narrowHost = narrow.nativeElement as Element;
    const wideHost = wide.nativeElement as Element;
    assert.ok(edge(wideHost) < edge(narrowHost), 'a wider text takes room from the plot');
    assert.ok(edge(wideHost) <= start(wideHost), 'the marks stop before the gutter');
    assert.equal(arenaTextGutter(['9000000']) > arenaTextGutter(['9']), true);
  } finally {
    narrow.destroy();
    wide.destroy();
  }
});

test('arena-funnel-chart writes a conversion with one fraction digit whatever the counts keep', () => {
  onFunnel(renderValues([1000, 624], { valueFormat: { locale: 'en-US', fractionDigits: 0 } }), (host) => {
    assert.equal(funnelTable(host).rows[1]![2], '62.4%');
    assert.ok(funnelTexts(host).some((t) => t.text === '62.4%'));
  });
});

test('arena-funnel-chart paints every mark one hue by default, and tone paints the whole series', () => {
  onFunnel(renderFunnel(), (host) => {
    assert.ok(funnelMarks(host).every((m) => m.fill === 'var(--color-cat-1)'));
  });
  onFunnel(renderFunnel({ series: [{ label: 'Accounts', values: COUNTS, tone: 'danger' }] }), (host) => {
    assert.ok(funnelMarks(host).every((m) => m.fill === 'var(--danger)'));
  });
});

test('arena-funnel-chart paints a stage by its colour id when colorIds is given', () => {
  onFunnel(renderFunnel({ series: [{ label: 'Accounts', values: COUNTS, colorIds: [3, 4, 5, 6, 7] }] }), (host) => {
    assert.deepEqual(funnelMarks(host).map((m) => m.fill), [3, 4, 5, 6, 7].map((id) => `var(--color-cat-${id})`));
  });
});

test('arena-funnel-chart tints each connector with the colour of the stage above it', () => {
  onFunnel(renderFunnel({ series: [{ label: 'Accounts', values: COUNTS, colorIds: [3, 4, 5, 6, 7] }] }), (host) => {
    const fills = funnelConnectors(host).map((c) => c.fill);
    assert.equal(fills.length, 4);
    assert.match(fills[0] as string, /var\(--color-cat-3\)/);
    assert.match(fills[3] as string, /var\(--color-cat-6\)/);
  });
});

test('arena-funnel-chart warns once of a second series and ignores it', () => {
  forgetArenaWarnings();
  const two = [{ label: 'A', values: COUNTS }, { label: 'B', values: [1, 2, 3, 4, 5] }];
  const fixtures: ReturnType<typeof renderFunnel>[] = [];
  try {
    const warnings = captureWarnings(() => {
      fixtures.push(renderFunnel({ series: two }), renderFunnel({ series: two }));
    });
    const { head } = funnelTable(fixtures[0]!.nativeElement as Element);
    assert.deepEqual(head, ['Category', 'A', 'Of previous stage', 'Of first stage']);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0] as string, /ArenaFunnelChart: reads one series and was given 2/);
  } finally {
    for (const fixture of fixtures) fixture.destroy();
  }
});

test('arena-funnel-chart REFUSES to render without a label, labels or series', () => {
  for (const missing of ['label', 'labels', 'series']) {
    const fixture = TestBed.createComponent(ArenaFunnelChart);
    for (const [name, value] of [['label', FUNNEL], ['labels', STAGES], ['series', [{ label: 'Accounts', values: COUNTS }]]] as const) {
      if (name !== missing) fixture.componentRef.setInput(name, value);
    }
    try {
      assert.throws(() => fixture.detectChanges(), /NG0950/, `${missing} is input.required, so Angular refuses the render`);
    } finally {
      fixture.destroy();
    }
  }
});

test('arena-funnel-chart REFUSES an empty label, since the accessible name would be the type alone', () => {
  const fixture = TestBed.createComponent(ArenaFunnelChart);
  fixture.componentRef.setInput('label', '');
  fixture.componentRef.setInput('labels', STAGES);
  fixture.componentRef.setInput('series', [{ label: 'Accounts', values: COUNTS }]);
  try {
    assert.throws(() => fixture.detectChanges(), wholeMessage('ArenaFunnelChart'));
  } finally {
    fixture.destroy();
  }
});

const HEAT = 'Sign-ups by hour';
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const DAYS = ['Mon', 'Tue', 'Wed'];
const ROWS = DAYS.map((label, d) => ({ label, values: HOURS.map((_, h) => (d + 1) * 10 * (h + 1)) }));
const GRID = [0, 1, 2].map((row) => ({ label: `Row ${row}`, values: [0, 1, 2].map((col) => (row * 3 + col + 1) * 10) }));

function renderHeat(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(ArenaHeatmapChart);
  fixture.componentRef.setInput('label', HEAT);
  fixture.componentRef.setInput('labels', HOURS);
  fixture.componentRef.setInput('series', ROWS);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  return fixture;
}

function onHeat(fixture: ReturnType<typeof renderHeat>, check: (host: Element) => void): void {
  try {
    check(fixture.nativeElement as Element);
  } finally {
    fixture.destroy();
  }
}

const heatCells = (host: Element) => [...host.querySelectorAll('svg rect[rx]')]
  .filter((rect) => rect.getAttribute('fill') !== 'none' || rect.getAttribute('stroke') !== 'var(--ink-body)');
const heatFills = (host: Element) => heatCells(host).map((rect) => rect.getAttribute('fill'));
const heatTexts = (host: Element) => [...host.querySelectorAll('svg text')]
  .map((text) => ({ anchor: text.getAttribute('text-anchor') ?? '', text: (text.textContent ?? '').trim() }));
const heatTable = (host: Element) => ({
  head: [...host.querySelectorAll('thead th')].map((c) => (c.textContent ?? '').trim()),
  rows: [...host.querySelectorAll('tbody tr')]
    .map((row) => [...row.querySelectorAll('th, td')].map((c) => (c.textContent ?? '').trim())),
});
const heatStep = (n: number) => `var(--heat-step-${n})`;

function heatCell(host: Element): string | null {
  const column = host.querySelector('[data-arena-part="heatmap-chart.tooltip-label"]');
  const value = host.querySelector('[data-arena-part="heatmap-chart.tooltip-value"]');
  if (!column || !value) return null;
  return `${(value.textContent ?? '').split(':')[0]}/${(column.textContent ?? '').trim()}`;
}

function heatPress(fixture: { detectChanges: () => void }, region: Element, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  region.dispatchEvent(event);
  fixture.detectChanges();
  return event;
}

test('arena-heatmap-chart matches its binding, whose cursor is a cell moved by all four arrows', () => {
  const fixture = renderHeat({ labels: LABELS, series: GRID, label: CHART });
  try {
    const host = fixture.nativeElement as Element;
    const graphic = host.querySelector('[role="img"]');
    assert.notEqual(graphic, null, 'a chart with no role="img" is a decoration, not a figure');
    assert.equal(graphic!.getAttribute('aria-label'), `${CHART} — heatmap`, 'the name is the locale word around label');
    assert.deepEqual(heatTable(host).head, ['Row', ...LABELS], 'the row heading, then one column per label');
    assert.deepEqual([...host.querySelectorAll('tbody th[scope="row"]')].map((c) => c.textContent), GRID.map((one) => one.label));

    const region = host.querySelector('[role="group"]') as HTMLElement;
    assert.equal(host.querySelectorAll('[tabindex="0"]').length, 1, 'one tab stop for the whole plot: the cursor moves inside it');
    assert.equal(heatCell(host), null, 'a chart at rest reads nothing');

    const walk: [string, string | null][] = [
      ['ArrowRight', 'Row 0/Alpha'], ['ArrowRight', 'Row 0/Beta'], ['ArrowDown', 'Row 1/Beta'], ['ArrowLeft', 'Row 1/Alpha'],
      ['ArrowLeft', 'Row 1/Alpha'], ['ArrowUp', 'Row 0/Alpha'], ['ArrowUp', 'Row 0/Alpha'], ['End', 'Row 0/Gamma'],
      ['ArrowRight', 'Row 0/Gamma'], ['ArrowDown', 'Row 1/Gamma'], ['ArrowDown', 'Row 2/Gamma'], ['ArrowDown', 'Row 2/Gamma'],
      ['Home', 'Row 2/Alpha'], ['End', 'Row 2/Gamma'], ['Escape', null],
    ];
    for (const [key, expected] of walk) {
      const event = heatPress(fixture, region, key);
      assert.equal(heatCell(host), expected, `${key} lands on ${expected}`);
      assert.equal(event.defaultPrevented, true, `${key} is the plot's own while it has focus, so the page does not scroll`);
    }
    for (const [key, expected] of [['ArrowDown', 'Row 0/Alpha'], ['Escape', null], ['End', 'Row 0/Gamma'], ['Escape', null], ['Home', 'Row 0/Alpha'], ['Escape', null]] as const) {
      heatPress(fixture, region, key);
      assert.equal(heatCell(host), expected, `${key} from rest or after Escape`);
    }

    heatPress(fixture, region, 'ArrowRight');
    for (const key of ['PageDown', 'PageUp', 'Tab']) {
      assert.equal(heatPress(fixture, region, key).defaultPrevented, false, `${key} is not bound, so the page keeps it`);
    }
    assert.equal(heatCell(host), 'Row 0/Alpha', 'an unbound key moves nothing');

    assertPattern({
      root: host,
      bindingPath: join(ANGULAR_COMPONENTS, 'charts/arena-heatmap-chart/ArenaHeatmapChart.behaviour.json'),
      subjects: { default: graphic },
      behavioural: {
        'alternative.table': true,
        ...Object.fromEntries(CURSOR_KEYS.map((key) => [key, !['keyboard.Home', 'keyboard.End'].includes(key)])),
      },
    });
  } finally {
    fixture.destroy();
  }
});

test('arena-heatmap-chart outlines the cursor cell in the body ink, and only that one', () => {
  const fixture = renderHeat({ labels: LABELS, series: GRID });
  try {
    const host = fixture.nativeElement as Element;
    const outlined = () => [...host.querySelectorAll('svg rect')].filter((one) => one.getAttribute('stroke') === 'var(--ink-body)');
    assert.equal(outlined().length, 0, 'at rest nothing is outlined');
    const region = host.querySelector('[role="group"]') as HTMLElement;
    heatPress(fixture, region, 'ArrowDown');
    assert.equal(outlined().length, 1);
    assert.equal(outlined()[0]!.getAttribute('fill'), 'none', 'the outline never covers the cell it marks');
    heatPress(fixture, region, 'Escape');
    assert.equal(outlined().length, 0);
  } finally {
    fixture.destroy();
  }
});

test('arena-heatmap-chart reads the column label and the row with its number, and the row alone for a missing cell', () => {
  const fixture = renderHeat({
    labels: LABELS, valueFormat: { grouping: true },
    series: [{ label: 'Full', values: [1200, 2, 3] }, { label: 'Short', values: [5] }, { label: 'Gap', values: [7, Number.NaN, 9] }],
  });
  try {
    const host = fixture.nativeElement as Element;
    const region = host.querySelector('[role="group"]') as HTMLElement;
    const read = () => ({
      label: (host.querySelector('[data-arena-part="heatmap-chart.tooltip-label"]')?.textContent ?? '').trim(),
      lines: [...host.querySelectorAll('[data-arena-part="heatmap-chart.tooltip-value"]')].map((l) => (l.textContent ?? '').trim()),
    });
    heatPress(fixture, region, 'ArrowRight');
    assert.deepEqual(read(), { label: 'Alpha', lines: ['Full: 1,200'] });
    heatPress(fixture, region, 'ArrowDown');
    assert.deepEqual(read(), { label: 'Alpha', lines: ['Short: 5'] });
    heatPress(fixture, region, 'ArrowRight');
    assert.deepEqual(read(), { label: 'Beta', lines: ['Short'] }, 'a short row has no number for this cell');
    heatPress(fixture, region, 'ArrowDown');
    assert.deepEqual(read(), { label: 'Beta', lines: ['Gap'] }, 'a NaN cell reads as a missing one');
  } finally {
    fixture.destroy();
  }
});

test('arena-heatmap-chart hides its table in a wrapper, so a wide table never widens the page', () => {
  onHeat(renderHeat(), (host) => {
    const box = host.querySelector('table')!.parentElement as HTMLElement;
    assert.equal(box.tagName, 'DIV');
    assert.equal(box.style.position, 'absolute');
    assert.equal(box.style.overflow, 'hidden');
    assert.equal(box.style.width, '1px');
  });
});

test('arena-heatmap-chart anchors the tooltip at the cell\'s place in the rail\'s visible span', () => {
  const fixture = renderHeat({ labels: LABELS, series: GRID, minCellWidth: 400 });
  try {
    const host = fixture.nativeElement as Element;
    const rail = host.querySelector('[role="group"]') as HTMLElement;
    let scrolled = 900;
    Object.defineProperty(rail, 'scrollLeft', { get: () => scrolled, set: () => {}, configurable: true });
    Object.defineProperty(rail, 'clientWidth', { get: () => 300, configurable: true });
    rail.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    heatPress(fixture, rail, 'End');
    const outline = host.querySelector('svg rect[stroke="var(--ink-body)"]') as Element;
    const centre = Number(outline.getAttribute('x')) + Number(outline.getAttribute('width')) / 2;
    const tip = () => parseFloat((host.querySelector('[data-arena-part="heatmap-chart.tooltip"]') as HTMLElement).style.left);
    assert.equal(tip(), Math.min(Math.max(centre - 900, 0), 300), 'the readout sits over the cell as it is scrolled');
    scrolled = 0;
    rail.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    assert.equal(tip(), 300, 'a cell scrolled past the right edge holds the readout at the edge');
  } finally {
    fixture.destroy();
  }
});

const SCROLLED_BY = 112;
const RAIL_WIDTH = 800;
const RAIL_LABELS = Array.from({ length: 8 }, (_, i) => `d${i}`);
const RAIL_SERIES = [{ label: 'Revenue', values: RAIL_LABELS.map((_, i) => i + 1) }];

function leftOf(x: number): string {
  return `${x}px`;
}

function assertRailAnchor(type: Type<unknown>, part: string): void {
  const fixture = TestBed.createComponent(type);
  fixture.componentRef.setInput('labels', RAIL_LABELS);
  fixture.componentRef.setInput('series', RAIL_SERIES);
  fixture.componentRef.setInput('label', CHART);
  fixture.componentRef.setInput('minPointSpacing', 100);
  fixture.detectChanges();
  try {
    const host = fixture.nativeElement as Element;
    const rail = host.querySelector('[role="group"]') as HTMLElement;
    Object.defineProperty(rail, 'scrollLeft', { get: () => SCROLLED_BY, set: () => {}, configurable: true });
    Object.defineProperty(rail, 'clientWidth', { get: () => RAIL_WIDTH, configurable: true });
    rail.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    heatPress(fixture, rail, 'End');
    const last = [...host.querySelectorAll('svg text')].find((one) => one.textContent === RAIL_LABELS[RAIL_LABELS.length - 1]) as Element;
    const x = Number(last.getAttribute('x'));
    assert.notEqual(arenaScrolledAnchorX(x, SCROLLED_BY, RAIL_WIDTH), arenaScrolledAnchorX(x, 0, RAIL_WIDTH), 'the case separates a scrolled rail from an unscrolled one');
    const tip = host.querySelector(`[data-arena-part="${part}.tooltip"]`) as HTMLElement;
    assert.equal(tip.style.left, leftOf(arenaScrolledAnchorX(x, SCROLLED_BY, RAIL_WIDTH)), 'the readout sits over the last point as the rail is scrolled');
  } finally {
    fixture.destroy();
  }
}

test('arena-line-chart anchors the tooltip at the point\'s place in the rail\'s visible span', () => {
  assertRailAnchor(ArenaLineChart, 'line-chart');
});

test('arena-bar-chart anchors the tooltip at the bar\'s place in the rail\'s visible span', () => {
  assertRailAnchor(ArenaBarChart, 'bar-chart');
});

type Span = (xs: number[], index: number, width: number) => [number, number];

function stubRail(fixture: { detectChanges: () => void }, rail: HTMLElement, start: number, visible: number): () => number {
  let scrolled = start;
  Object.defineProperty(rail, 'scrollLeft', { get: () => scrolled, set: (to: number) => { scrolled = to; }, configurable: true });
  Object.defineProperty(rail, 'clientWidth', { get: () => visible, configurable: true });
  rail.dispatchEvent(new Event('scroll'));
  fixture.detectChanges();
  return () => scrolled;
}

function assertRailFollows(type: Type<unknown>, part: string, span: Span): void {
  const fixture = TestBed.createComponent(type);
  fixture.componentRef.setInput('labels', RAIL_LABELS);
  fixture.componentRef.setInput('series', RAIL_SERIES);
  fixture.componentRef.setInput('label', CHART);
  fixture.componentRef.setInput('minPointSpacing', 100);
  fixture.detectChanges();
  try {
    const host = fixture.nativeElement as Element;
    const rail = host.querySelector('[role="group"]') as HTMLElement;
    const width = Number((host.querySelector('svg') as Element).getAttribute('width'));
    const xs = RAIL_LABELS.map((name) => Number([...host.querySelectorAll('svg text')].find((one) => one.textContent === name)?.getAttribute('x')));
    const visible = RAIL_WIDTH / 2;
    const scrollAt = stubRail(fixture, rail, width - visible, visible);
    const tip = () => (host.querySelector(`[data-arena-part="${part}.tooltip"]`) as HTMLElement).style.left;
    const parked = scrollAt();
    heatPress(fixture, rail, 'Home');
    const [from, to] = span(xs, 0, width);
    const home = arenaRailReveal(from, to, parked, visible);
    assert.notEqual(home, parked, 'the case starts with the first point off screen');
    assert.equal(scrollAt(), home, 'Home scrolls the rail to the first point');
    assert.equal(tip(), leftOf(arenaScrolledAnchorX(xs[0] as number, home, visible)), 'the readout sits over the first point in the new view');
    assert.notEqual(tip(), leftOf(arenaScrolledAnchorX(xs[0] as number, parked, visible)), 'and not at the clamped edge of the old view');
    heatPress(fixture, rail, 'End');
    const [lastFrom, lastTo] = span(xs, xs.length - 1, width);
    const back = arenaRailReveal(lastFrom, lastTo, home, visible);
    assert.notEqual(back, home, 'End moves the rail again');
    assert.equal(scrollAt(), back, 'End brings the rail back to the last point');
    assert.equal(tip(), leftOf(arenaScrolledAnchorX(xs[xs.length - 1] as number, back, visible)), 'the readout sits over the last point');
  } finally {
    fixture.destroy();
  }
}

const LINE_SPAN: Span = (xs, index, width) => {
  const step = (xs[1] as number) - (xs[0] as number);
  return [Math.max(0, (xs[index] as number) - step / 2), Math.min(width, (xs[index] as number) + step / 2)];
};

const BAR_SPAN: Span = (xs, index) => {
  const band = (xs[1] as number) - (xs[0] as number) - chartBarGap;
  return [(xs[index] as number) - band / 2, (xs[index] as number) + band / 2];
};

test('arena-line-chart scrolls the rail to keep the cursor\'s point in view', () => {
  assertRailFollows(ArenaLineChart, 'line-chart', LINE_SPAN);
});

test('arena-bar-chart scrolls the rail to keep the cursor\'s bar in view', () => {
  assertRailFollows(ArenaBarChart, 'bar-chart', BAR_SPAN);
});

test('arena-heatmap-chart scrolls the rail to the cell\'s band through the shared reveal', () => {
  const fixture = renderHeat({ labels: LABELS, series: GRID, minCellWidth: 400 });
  try {
    const host = fixture.nativeElement as Element;
    const rail = host.querySelector('[role="group"]') as HTMLElement;
    const scrollAt = stubRail(fixture, rail, 900, 300);
    heatPress(fixture, rail, 'Home');
    const outline = host.querySelector('svg rect[stroke="var(--ink-body)"]') as Element;
    const left = Number(outline.getAttribute('x'));
    assert.equal(scrollAt(), arenaRailReveal(left, left + Number(outline.getAttribute('width')), 900, 300), 'Home scrolls the rail to the first cell');
    assert.notEqual(scrollAt(), 900, 'the case moves the rail');
  } finally {
    fixture.destroy();
  }
});

function railFixture(type: Type<unknown>, count = RAIL_LABELS.length) {
  const fixture = TestBed.createComponent(type);
  fixture.componentRef.setInput('labels', RAIL_LABELS.slice(0, count));
  fixture.componentRef.setInput('series', [{ label: 'Revenue', values: RAIL_SERIES[0]!.values.slice(0, count) }]);
  fixture.componentRef.setInput('label', CHART);
  fixture.componentRef.setInput('minPointSpacing', 100);
  fixture.detectChanges();
  return fixture;
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
    for (const [type, span] of [[ArenaLineChart, LINE_SPAN], [ArenaBarChart, BAR_SPAN]] as const) {
      const fixture = railFixture(type);
      try {
        const host = fixture.nativeElement as Element;
        const rail = host.querySelector('[role="group"]') as HTMLElement;
        const width = Number((host.querySelector('svg') as Element).getAttribute('width'));
        const xs = RAIL_LABELS.map((name) => Number([...host.querySelectorAll('svg text')].find((one) => one.textContent === name)?.getAttribute('x')));
        let visible = 600;
        const scrollAt = stubRail(fixture, rail, width - visible, visible);
        Object.defineProperty(rail, 'clientWidth', { get: () => visible, configurable: true });
        heatPress(fixture, rail, 'End');
        const parked = scrollAt();
        visible = 390;
        report([{ borderBoxSize: [{ inlineSize: 390 }], target: rail } as unknown as ResizeObserverEntry], {} as ResizeObserver);
        fixture.detectChanges();
        const [from, to] = span(xs, xs.length - 1, width);
        assert.equal(scrollAt(), arenaRailReveal(from, to, parked, visible), 'the last point is brought back into the narrower view');
        assert.notEqual(scrollAt(), parked, 'the case moves the rail');
      } finally {
        fixture.destroy();
      }
    }
  } finally {
    globalThis.ResizeObserver = saved;
  }
});

test('the line and bar charts do not send the rail to a span past the series when it shrinks under the cursor', () => {
  for (const type of [ArenaLineChart, ArenaBarChart]) {
    const fixture = railFixture(type);
    try {
      const host = fixture.nativeElement as Element;
      const rail = host.querySelector('[role="group"]') as HTMLElement;
      const scrollAt = stubRail(fixture, rail, 0, 400);
      Object.defineProperty(rail, 'scrollWidth', { get: () => 5000, configurable: true });
      heatPress(fixture, rail, 'End');
      rail.scrollLeft = 4600;
      fixture.componentRef.setInput('labels', RAIL_LABELS.slice(0, RAIL_LABELS.length - 1));
      fixture.componentRef.setInput('series', [{ label: 'Revenue', values: RAIL_SERIES[0]!.values.slice(0, RAIL_LABELS.length - 1) }]);
      fixture.detectChanges();
      assert.equal(scrollAt(), 4600, 'a cursor past the new last point sends the rail nowhere near that span');
    } finally {
      fixture.destroy();
    }
  }
});

test('arena-heatmap-chart holds the tooltip inside the rail after the container narrows', () => {
  const saved = globalThis.ResizeObserver;
  let report: ResizeObserverCallback = () => {};
  globalThis.ResizeObserver = class {
    constructor(callback: ResizeObserverCallback) { report = callback; }
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
  const fixture = renderHeat({ labels: LABELS, series: GRID, minCellWidth: 400 });
  try {
    const host = fixture.nativeElement as Element;
    const rail = host.querySelector('[role="group"]') as HTMLElement;
    let visible = 300;
    Object.defineProperty(rail, 'scrollLeft', { get: () => 0, set: () => {}, configurable: true });
    Object.defineProperty(rail, 'clientWidth', { get: () => visible, configurable: true });
    heatPress(fixture, rail, 'End');
    const tip = () => parseFloat((host.querySelector('[data-arena-part="heatmap-chart.tooltip"]') as HTMLElement).style.left);
    assert.equal(tip(), 300, 'a cell past the right edge holds the readout at the rail\'s edge');
    visible = 200;
    report([{ borderBoxSize: [{ inlineSize: 500 }], target: rail } as unknown as ResizeObserverEntry], {} as ResizeObserver);
    fixture.detectChanges();
    assert.equal(tip(), 200, 'the edge is the narrower rail\'s, with no scroll or key to refresh it');
  } finally {
    fixture.destroy();
    globalThis.ResizeObserver = saved;
  }
});

test('arena-heatmap-chart puts the cursor under the pointer, on the cell the two band scales place there', () => {
  const fixture = renderHeat({ labels: LABELS, series: GRID });
  try {
    const host = fixture.nativeElement as Element;
    const plot = host.querySelector('svg rect[fill="transparent"]') as SVGRectElement;
    const x = Number(plot.getAttribute('x'));
    const y = Number(plot.getAttribute('y'));
    const w = Number(plot.getAttribute('width'));
    const h = Number(plot.getAttribute('height'));
    const move = (type: string, px: number, py: number, pointerType = 'mouse') => {
      const event = new MouseEvent(type, { bubbles: true, clientX: px, clientY: py });
      Object.defineProperty(event, 'pointerType', { value: pointerType });
      plot.dispatchEvent(event);
      fixture.detectChanges();
    };
    move('pointermove', x + w * 0.9, y + h * 0.1);
    assert.equal(heatCell(host), 'Row 0/Gamma', 'right edge, top row');
    move('pointermove', x + w * 0.1, y + h * 0.9);
    assert.equal(heatCell(host), 'Row 2/Alpha', 'left edge, bottom row');
    move('pointerleave', 0, 0);
    assert.equal(heatCell(host), null, 'leaving the plot clears the cell, hover and cursor being one state');
  } finally {
    fixture.destroy();
  }
});

test('arena-heatmap-chart is a named figure whose table has a column per label and a row per series', () => {
  onHeat(renderHeat(), (host) => {
    assert.equal(host.querySelector('svg')!.getAttribute('aria-label'), 'Sign-ups by hour — heatmap');
    assert.equal(host.querySelector('svg')!.getAttribute('role'), 'img');
    assert.equal((host.querySelector('caption')?.textContent ?? '').trim(), 'Sign-ups by hour — heatmap');
    const { head, rows } = heatTable(host);
    assert.deepEqual(head, ['Row', ...HOURS]);
    assert.equal(rows.length, 3);
    assert.deepEqual(rows.map((row) => row[0]), DAYS, 'each row is headed by its series, as a row header');
    assert.equal(host.querySelectorAll('tbody th[scope="row"]').length, 3);
    assert.equal(rows[0]!.length, 1 + HOURS.length);
    assert.deepEqual(rows[1]!.slice(1, 4), ['20', '40', '60']);
    assert.equal(heatCells(host).length, 72, 'one rect per cell');
  });
});

test('arena-heatmap-chart leaves a short row as empty cells and outlined, unfilled rects', () => {
  onHeat(renderHeat({ labels: ['a', 'b', 'c', 'd'], series: [{ label: 'Full', values: [1, 2, 3, 4] }, { label: 'Short', values: [4, 3] }] }), (host) => {
    assert.deepEqual(heatTable(host).rows[1], ['Short', '4', '3', '', '']);
    const drawn = heatCells(host);
    const open = drawn.filter((rect) => rect.getAttribute('fill') === 'none');
    assert.equal(open.length, 2, 'two cells have no value');
    for (const rect of open) {
      assert.equal(rect.getAttribute('stroke'), 'var(--edge-separator)');
      assert.equal((rect as SVGElement).style.strokeWidth, 'var(--bw)');
    }
    assert.equal(drawn.filter((rect) => rect.getAttribute('fill') !== 'none').length, 6);
  });
});

test('arena-heatmap-chart draws a NaN cell as an outline and never as the lowest step', () => {
  onHeat(renderHeat({ labels: ['a', 'b', 'c'], series: [{ label: 'Row', values: [0, Number.NaN, 100] }] }), (host) => {
    const drawn = heatCells(host);
    assert.equal(drawn[1]!.getAttribute('fill'), 'none');
    assert.equal(drawn[1]!.getAttribute('stroke'), 'var(--edge-separator)');
    assert.equal(drawn.filter((rect) => rect.getAttribute('fill') === heatStep(1)).length, 1, 'only the real zero is step 1');
    assert.deepEqual(heatTable(host).rows[0], ['Row', '0', '', '100']);
  });
});

test('arena-heatmap-chart paints a 0-to-max ramp in steps 1 to 5, in order', () => {
  onHeat(renderHeat({ labels: ['a', 'b', 'c', 'd', 'e'], series: [{ label: 'Row', values: [0, 25, 45, 65, 100] }] }), (host) => {
    assert.deepEqual(heatFills(host), [1, 2, 3, 4, 5].map(heatStep));
  });
});

test('arena-heatmap-chart puts a value on a bin edge in the higher bin and the maximum in the top one', () => {
  onHeat(renderHeat({ labels: ['a', 'b', 'c', 'd'], series: [{ label: 'Row', values: [19, 20, 99, 100] }] }), (host) => {
    assert.deepEqual(heatFills(host), [1, 2, 5, 5].map(heatStep));
  });
});

test('arena-heatmap-chart puts a decimal value on an edge in the higher step and writes round legend edges', () => {
  onHeat(renderHeat({ labels: ['a', 'b', 'c'], series: [{ label: 'Row', values: [0.1, 0.6, 0.7] }] }), (host) => {
    assert.deepEqual(heatFills(host), [1, 4, 4].map(heatStep));
    assert.deepEqual(
      [...host.querySelectorAll('[data-arena-part="heatmap-chart.legend-label"]')].map((one) => (one.textContent ?? '').trim()),
      ['0', '0.2', '0.4', '0.6', '0.8'],
    );
  });
});

test('arena-heatmap-chart keys its legend with five swatches and the lower edge of each step, written by the value writer', () => {
  onHeat(renderHeat({ labels: ['a', 'b'], series: [{ label: 'Row', values: [0, 5000] }], valueFormat: { grouping: true }, valueSuffix: ' hits' }), (host) => {
    const swatches = [...host.querySelectorAll<HTMLElement>('[data-arena-part="heatmap-chart.legend-swatch"]')];
    assert.deepEqual(swatches.map((one) => one.style.background), [1, 2, 3, 4, 5].map(heatStep));
    assert.deepEqual(
      [...host.querySelectorAll('[data-arena-part="heatmap-chart.legend-label"]')].map((one) => (one.textContent ?? '').trim()),
      ['0 hits', '1,000 hits', '2,000 hits', '3,000 hits', '4,000 hits'],
    );
    assert.equal(host.querySelector('[data-arena-part="heatmap-chart.legend"]')!.getAttribute('aria-hidden'), 'true');
  });
});

test('arena-heatmap-chart computes its height from the row count and takes one that is passed', () => {
  const frame = (host: Element) => Number.parseFloat((host.querySelector('[data-arena-part="heatmap-chart.frame"]') as HTMLElement).style.height);
  const plot = (host: Element) => Number(host.querySelector('svg')!.getAttribute('height'));
  const heights = (inputs: Record<string, unknown>) => {
    const fixture = renderHeat(inputs);
    try {
      const host = fixture.nativeElement as Element;
      return { frame: frame(host), plot: plot(host) };
    } finally {
      fixture.destroy();
    }
  };
  const two = heights({ series: ROWS.slice(0, 2) });
  const three = heights({});
  assert.equal(two.frame, arenaHeatmapHeight(2));
  assert.equal(three.frame - two.frame, chartHeatmapRowH, 'a row adds one pitch');
  assert.equal(two.frame, 2 * chartHeatmapRowH + ARENA_PAD.t + ARENA_PAD.b + chartLegendStrip);
  assert.equal(three.plot, three.frame - chartLegendStrip, 'the legend strip comes out of the height');
  const room = three.frame + chartHeatmapRowH;
  assert.deepEqual(heights({ height: room }), { frame: room, plot: room - chartLegendStrip });
});

test('arena-heatmap-chart overflows its rail only when a column cannot be narrower than minCellWidth', () => {
  const width = (inputs: Record<string, unknown>) => {
    const fixture = renderHeat(inputs);
    try {
      return (fixture.nativeElement as Element).querySelector('svg')!.getAttribute('width');
    } finally {
      fixture.destroy();
    }
  };
  assert.equal(width({}), '100%', 'absent, the plot fits its container');
  assert.equal(width({ minCellWidth: 10 }), '100%', 'a floor the container already meets changes nothing');
  assert.equal(Number(width({ minCellWidth: 40 })), chartPadCategory + ARENA_PAD.r + 40 * HOURS.length);
  onHeat(renderHeat({ minCellWidth: 40 }), (host) => {
    assert.equal((host.querySelector('[role="group"]') as HTMLElement).style.overflowX, 'auto');
  });
});

test('arena-heatmap-chart draws every nth column label when they would collide, and names every column in the table', () => {
  const long = Array.from({ length: 24 }, (_, i) => `Hour ${String(i).padStart(2, '0')}`);
  onHeat(renderHeat({ labels: long }), (host) => {
    const drawn = heatTexts(host).filter((t) => t.anchor === 'middle');
    assert.ok(drawn.length > 0 && drawn.length < long.length, `a stride drew ${drawn.length} of ${long.length}`);
    assert.equal(drawn[0]!.text, 'Hour 00', 'the first column is always named');
    assert.deepEqual(heatTable(host).head, ['Row', ...long], 'the table keeps every column');
  });
  onHeat(renderHeat(), (host) => {
    assert.equal(heatTexts(host).filter((t) => t.anchor === 'middle').length, HOURS.length, 'two-character labels fit at this width');
  });
});

test('arena-heatmap-chart names each row down the left gutter', () => {
  onHeat(renderHeat(), (host) => {
    assert.deepEqual(heatTexts(host).filter((t) => t.anchor === 'end').map((t) => t.text), DAYS);
  });
});

test('arena-heatmap-chart warns once that identity and meaning are ignored, and paints the same fills', () => {
  forgetArenaWarnings();
  const small = { labels: ['a', 'b'] };
  const marked = [
    { label: 'Row', values: [1, 9], colorId: 3 }, { label: 'Two', values: [1, 9], tone: 'danger' },
    { label: 'Three', values: [1, 9], colorIds: [1, 2] },
  ];
  const plain = renderHeat({ ...small, series: [{ label: 'Row', values: [1, 9] }] });
  const fixtures: ReturnType<typeof renderHeat>[] = [];
  try {
    forgetArenaWarnings();
    const warned = captureWarnings(() => {
      fixtures.push(renderHeat({ ...small, series: marked }), renderHeat({ ...small, series: marked }));
    });
    assert.equal(warned.length, 1);
    assert.match(warned[0] as string, /ArenaHeatmapChart: a series' colorId, colorIds and tone, and the chart's colorStart, are ignored, because a cell's colour is its magnitude/);
    const markedFills = heatFills(fixtures[0]!.nativeElement as Element).slice(0, 2);
    const plainFills = heatFills(plain.nativeElement as Element);
    assert.deepEqual(markedFills, plainFills);
    forgetArenaWarnings();
    assert.deepEqual(captureWarnings(() => { fixtures.push(renderHeat()); }), [], 'a plain series warns of nothing');
  } finally {
    plain.destroy();
    for (const fixture of fixtures) fixture.destroy();
  }
});

test('arena-heatmap-chart REFUSES to render without a label, labels or series', () => {
  for (const missing of ['label', 'labels', 'series']) {
    const fixture = TestBed.createComponent(ArenaHeatmapChart);
    for (const [name, value] of [['label', HEAT], ['labels', HOURS], ['series', ROWS]] as const) {
      if (name !== missing) fixture.componentRef.setInput(name, value);
    }
    try {
      assert.throws(() => fixture.detectChanges(), /NG0950/, `${missing} is input.required, so Angular refuses the render`);
    } finally {
      fixture.destroy();
    }
  }
  const fixture = TestBed.createComponent(ArenaHeatmapChart);
  fixture.componentRef.setInput('label', '');
  fixture.componentRef.setInput('labels', HOURS);
  fixture.componentRef.setInput('series', ROWS);
  try {
    assert.throws(() => fixture.detectChanges(), wholeMessage('ArenaHeatmapChart'));
  } finally {
    fixture.destroy();
  }
});

test('arena-heatmap-chart with no rows draws an empty grid and its legend without throwing', () => {
  onHeat(renderHeat({ series: [], labels: [] }), (host) => {
    assert.equal(heatCells(host).length, 0);
    assert.equal(host.querySelectorAll('[data-arena-part="heatmap-chart.legend-swatch"]').length, 5);
  });
});
