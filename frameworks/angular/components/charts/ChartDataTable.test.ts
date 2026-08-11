/* Every chart answers figure-with-data-table the same way, so the shared
 * body is `assertFigure` and each test only supplies its own fixture: a loop over
 * the component classes does not typecheck, since TestBed.createComponent cannot
 * unify two unrelated component types. */
import { useTestEnvironment } from '../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { ArenaBarChart } from './arena-bar-chart/ArenaBarChart';
import { ArenaDoughnutChart } from './arena-doughnut-chart/ArenaDoughnutChart';
import { ArenaLineChart } from './arena-line-chart/ArenaLineChart';
import { ArenaHorizontalBarChart } from './arena-horizontal-bar-chart/ArenaHorizontalBarChart';
import { ArenaPyramidChart } from './arena-pyramid-chart/ArenaPyramidChart';
import { ArenaRadarChart } from './arena-radar-chart/ArenaRadarChart';
import { ArenaScatterChart } from './arena-scatter-chart/ArenaScatterChart';
import { assertPattern, ANGULAR_COMPONENTS } from '../../test/Compliance';
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

    assert.equal(table.style.position, 'absolute');
    assert.equal(table.style.width, '1px');
    assert.equal(table.style.height, '1px');
    assert.equal(table.style.overflow, 'hidden');
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

test('arena-bar-chart REFUSES to render without a label, where it used to name itself by type', () => {
  const fixture = TestBed.createComponent(ArenaBarChart);
  fixture.componentRef.setInput('labels', LABELS);
  fixture.componentRef.setInput('series', [{ label: SERIES, values: VALUES }]);
  try {
    assert.throws(
      () => fixture.detectChanges(),
      /NG0950/,
      'a name that is only the chart TYPE satisfies roles.label mechanically and tells a reader nothing; '
      + 'label is input.required now, so Angular refuses the render rather than inventing one',
    );
  } finally {
    fixture.destroy();
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

  const tooltip = [...host.querySelectorAll('div')]
    .find((el) => (el as HTMLElement).style.position === 'absolute' && (el as HTMLElement).style.pointerEvents === 'none');
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
  assert.equal(table.style.position, 'absolute', 'it is hidden by being taken out of flow, not by being removed');

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
