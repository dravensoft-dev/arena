/* Every chart answers figure-with-data-table the same way, so the shared
 * body is `assertFigure` and each test only supplies its own fixture: a loop over
 * the component classes does not typecheck, since TestBed.createComponent cannot
 * unify two unrelated component types. */
import { useTestEnvironment } from '../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component, signal } from '@angular/core';
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
import { arenaGaugePoint, arenaGaugeRadii } from './ChartPolar';
import { ArenaTable } from '../display/arena-table/ArenaTable';
import { ArenaTableRow } from '../display/arena-table-row/ArenaTableRow';
import { ArenaTableCell } from '../display/arena-table-cell/ArenaTableCell';
import { assertPattern, assertPatternCases, ANGULAR_COMPONENTS } from '../../test/Compliance';
import { assertNoNode } from '../../test/NodeAssert';
import { forgetArenaWarnings } from '../../WarnOnce';
import { chartGaugeHeight, chartSparklineHeight } from '../../Tokens.generated';
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
    assert.throws(() => unnamed.detectChanges(), /ArenaGaugeChart: `label` is required/);
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
