import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_CAT_SLOTS } from '../../DataVisuals';
import { forgetArenaWarnings } from '../../WarnOnce';
import {
  arenaChartTable, arenaOneSeries, arenaSeriesColors, arenaSeriesDomain, arenaSeriesPointCount,
  arenaStackSegments, arenaStackDomain, arenaMirrorDomain, arenaTwoSeries,
  arenaPointCount, arenaPointSeriesDomain, arenaPointSeriesColor, arenaPointTable,
  arenaPointSized, arenaPointSizeRange,
} from './ChartSeries';
import type { ArenaPointSeries, ArenaSeries } from '../../Api.generated';
import type { ArenaSeriesTone } from '../../Api.generated';

const write = (value: number) => `${value} ms`;

function series(fields: Partial<ArenaSeries> = {}): ArenaSeries {
  return { label: 'One', values: [], ...fields };
}

function captureWarnings(body: () => void): string[] {
  const captured: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => { captured.push(args.map(String).join(' ')); };
  try { body(); } finally { console.warn = original; }
  return captured;
}

test('arenaSeriesColors always returns exactly `count` colours', () => {
  for (const count of [0, 1, 3, 25]) {
    assert.equal(arenaSeriesColors(series(), count, 1).length, count);
    assert.equal(arenaSeriesColors(series({ slot: 3 }), count, 1).length, count);
    assert.equal(arenaSeriesColors(series({ slots: [1, 2] }), count, 1).length, count);
    assert.equal(arenaSeriesColors(series({ tone: 'danger' }), count, 1).length, count);
  }
});

test('a series with no identity of its own takes the slot its POSITION gives it', () => {

  assert.deepEqual(arenaSeriesColors(series(), 2, 1), ['var(--color-cat-1)', 'var(--color-cat-1)']);
  assert.deepEqual(arenaSeriesColors(series(), 2, 3), ['var(--color-cat-3)', 'var(--color-cat-3)']);
});

test('`slot` paints the whole series one identity colour, whatever its position', () => {
  assert.deepEqual(arenaSeriesColors(series({ slot: 4 }), 2, 7), ['var(--color-cat-4)', 'var(--color-cat-4)']);
});

test('`slots` maps per mark, falling back to the mark index where it runs short', () => {

  assert.deepEqual(arenaSeriesColors(series({ slots: [5, 2] }), 4, 1), [
    'var(--color-cat-5)', 'var(--color-cat-2)', 'var(--color-cat-3)', 'var(--color-cat-4)',
  ]);
});

test('`slots` shorter than `count` still never cycles past the ramp', () => {
  const colours = arenaSeriesColors(series({ slots: [] }), 12, 1);
  assert.equal(colours[11], `var(--color-cat-${ARENA_CAT_SLOTS})`);
  assert.equal(new Set(colours).size, ARENA_CAT_SLOTS, 'the ramp clamps rather than wrapping');
});

test('`tone` paints the whole series the semantic colour', () => {
  assert.deepEqual(arenaSeriesColors(series({ tone: 'warning' }), 2, 1), ['var(--warning)', 'var(--warning)']);
});

test('`tone` wins over `slot` and over `slots`, and passing both warns', () => {
  forgetArenaWarnings();
  const warnings = captureWarnings(() => {
    assert.deepEqual(arenaSeriesColors(series({ tone: 'danger', slot: 3 }), 1, 1), ['var(--danger)']);
    assert.deepEqual(arenaSeriesColors(series({ tone: 'danger', slots: [3] }), 1, 1), ['var(--danger)']);
  });
  assert.ok(warnings.length <= 1, 'arenaWarnOnce must not warn twice for one message');
  forgetArenaWarnings();
});

test('the mutually-exclusive warning fires once, and only when both are passed', () => {
  forgetArenaWarnings();
  const clean = captureWarnings(() => {
    arenaSeriesColors(series({ tone: 'danger' }), 1, 1);
    arenaSeriesColors(series({ slot: 2 }), 1, 1);
    arenaSeriesColors(series(), 1, 1);
  });
  assert.deepEqual(clean, [], 'identity alone and meaning alone are both legal, and silent');

  const warnings = captureWarnings(() => {
    arenaSeriesColors(series({ tone: 'danger', slot: 3 }), 1, 1);
    arenaSeriesColors(series({ tone: 'info', slots: [2] }), 1, 1);
  });
  assert.equal(warnings.length, 1, 'warned once for the two offending calls');
  assert.match(warnings[0] as string, /^\[arena\] chart:/);
  assert.match(warnings[0] as string, /mutually exclusive/);
  forgetArenaWarnings();
});

test('a tone outside the union falls back to slot 1 instead of yielding undefined', () => {

  const rogue = 'critical' as unknown as ArenaSeriesTone;
  assert.deepEqual(arenaSeriesColors(series({ tone: rogue }), 2, 4), ['var(--color-cat-1)', 'var(--color-cat-1)']);
});

test('`slot: 0` is still an identity, not an absent one', () => {

  assert.deepEqual(arenaSeriesColors(series({ slot: 0 }), 1, 5), ['var(--color-cat-1)']);
});

test('the point count is the longest series, so a short one does not truncate the axis', () => {

  assert.equal(arenaSeriesPointCount([series({ values: [1, 2] }), series({ values: [1, 2, 3, 4] })]), 4);
  assert.equal(arenaSeriesPointCount([]), 0);
});

test('the domain spans every series at once, so two series share one axis', () => {

  const domain = arenaSeriesDomain([series({ values: [10, 20] }), series({ values: [90] })]);
  assert.ok(domain.max >= 90, `the axis stopped at ${domain.max}, below the tallest series`);
  assert.equal(domain.min, 0);
});

test('the domain reaches below zero when any series does', () => {
  const domain = arenaSeriesDomain([series({ values: [10] }), series({ values: [-40] })]);
  assert.ok(domain.min <= -40, `the axis stopped at ${domain.min}`);
});

test('arenaOneSeries takes the first and warns about the rest, rather than drawing a sunburst', () => {

  forgetArenaWarnings();
  const warnings = captureWarnings(() => {
    const only = arenaOneSeries([series({ label: 'A' }), series({ label: 'B' })], 'ArenaDoughnutChart');
    assert.equal(only.label, 'A');
  });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0] as string, /sunburst/);
  forgetArenaWarnings();
});

test('arenaOneSeries is silent for one series, and returns an empty one for none', () => {
  forgetArenaWarnings();
  const warnings = captureWarnings(() => {
    assert.equal(arenaOneSeries([series({ label: 'A' })], 'ArenaDoughnutChart').label, 'A');
    assert.deepEqual(arenaOneSeries([], 'ArenaDoughnutChart').values, []);
  });
  assert.deepEqual(warnings, []);
  forgetArenaWarnings();
});

test('the table names the row column and then each series by its own label', () => {
  const table = arenaChartTable('Category', [series({ label: 'Revenue', values: [1] }), series({ label: 'Cost', values: [2] })], ['Jan'], write);
  assert.deepEqual(table.columns, ['Category', 'Revenue', 'Cost']);
});

test('one row per point, its label as the row header and one cell per series', () => {
  const table = arenaChartTable('Point', [series({ label: 'A', values: [12, 47] }), series({ label: 'B', values: [1, 2] })], ['Jan', 'Feb'], write);
  assert.deepEqual(table.rows, [
    { header: 'Jan', cells: ['12 ms', '1 ms'] },
    { header: 'Feb', cells: ['47 ms', '2 ms'] },
  ]);
});

test('a series shorter than the others leaves an empty cell rather than a zero', () => {

  const table = arenaChartTable('Point', [series({ label: 'A', values: [1, 2] }), series({ label: 'B', values: [9] })], ['Jan', 'Feb'], write);
  assert.deepEqual(table.rows[1]?.cells, ['2 ms', '']);
});

test('the table writes its numbers through the same writer the chart draws with', () => {

  const table = arenaChartTable('Category', [series({ label: 'Share', values: [1234.5] })], ['a'], (value) => `$${value.toFixed(2)}`);
  assert.equal(table.rows[0]?.cells[0], '$1234.50');
});

test('a value with no label at its index still gets a row, headed by an empty cell', () => {

  const table = arenaChartTable('Category', [series({ label: 'Share', values: [1, 2] })], ['only'], write);
  assert.equal(table.rows.length, 2);
  assert.equal(table.rows[1]?.header, '');
});

test('a label with no value is dropped, because the rows follow the data', () => {
  const table = arenaChartTable('Category', [series({ label: 'Share', values: [1] })], ['a', 'b', 'c'], write);
  assert.deepEqual(table.rows.map((row) => row.header), ['a']);
});

test('no series produce a header row and nothing under it, rather than no table', () => {
  const table = arenaChartTable('Category', [], [], write);
  assert.deepEqual(table.columns, ['Category']);
  assert.deepEqual(table.rows, []);
});

test('every row carries one cell per series column, so the widths agree', () => {
  const table = arenaChartTable('Category', [series({ label: 'A', values: [1, 2] }), series({ label: 'B', values: [3, 4] })], ['a', 'b'], write);
  for (const row of table.rows)
    assert.equal(row.cells.length + 1, table.columns.length, 'a row must fill every column it declares');
});

const STACK: ArenaSeries[] = [
  { label: 'Web', values: [10, 5, -4] },
  { label: 'API', values: [20, -8, -6] },
  { label: 'Jobs', values: [30, 2, 1] },
];

test('a stack sits each segment on the one below it, so the tip of the last is the total', () => {
  const segments = arenaStackSegments(STACK, 0);
  assert.deepEqual(segments.map((s) => [s.from, s.to]), [[0, 10], [10, 30], [30, 60]]);
});

test('negatives stack downward on their own run, so a mixed category grows both ways from zero', () => {

  const segments = arenaStackSegments(STACK, 1);
  assert.deepEqual(segments.map((s) => [s.seriesIndex, s.from, s.to]), [
    [0, 0, 5],
    [1, 0, -8],
    [2, 5, 7],
  ]);
});

test('only the last segment of each direction is the outer one, because that is where a radius belongs', () => {

  const segments = arenaStackSegments(STACK, 1);
  assert.deepEqual(segments.map((s) => s.outer), [false, true, true]);
});

test('an all-positive category rounds one end and leaves every joint square', () => {
  assert.deepEqual(arenaStackSegments(STACK, 0).map((s) => s.outer), [false, false, true]);
});

test('a missing value adds no segment, so the stack is the sum of the numbers that exist', () => {

  const holed: ArenaSeries[] = [
    { label: 'Web', values: [10, 5] },
    { label: 'API', values: [20] },
    { label: 'Jobs', values: [30, 7] },
  ];
  const segments = arenaStackSegments(holed, 1);
  assert.deepEqual(segments.map((s) => s.seriesIndex), [0, 2], 'the short series contributes nothing, not a zero');
  assert.deepEqual(segments.map((s) => [s.from, s.to]), [[0, 5], [5, 12]],
    'the segment above a hole sits on the one below it rather than floating over a gap');
});

test('a zero-valued series takes no room and does not steal the rounded end from the real top', () => {

  const flat: ArenaSeries[] = [
    { label: 'Web', values: [10] },
    { label: 'API', values: [0] },
  ];
  const segments = arenaStackSegments(flat, 0);
  assert.deepEqual(segments.map((s) => s.outer), [true, false],
    'a segment of no height carrying the radius would leave the visible top square');
});

test('a stacked domain measures totals, where a grouped one measures the largest single value', () => {

  assert.ok(arenaStackDomain(STACK).max > arenaSeriesDomain(STACK).max,
    'a stack is as tall as its total, where grouped bars are as tall as the tallest single value');
  assert.ok(arenaStackDomain(STACK).max >= 60, 'the tallest category totals 60 and the axis has to hold it');
});

test('a stacked domain sums each direction on its own, so a mixed category does not cancel out', () => {

  const domain = arenaStackDomain(STACK);
  assert.ok(domain.min <= -14, `a category summing to -14 downward needs room for it, got ${domain.min}`);
  assert.ok(domain.max >= 60, `got ${domain.max}`);
});

test('a stacked domain still puts zero on a tick, which is what makes the two directions readable', () => {

  const domain = arenaStackDomain(STACK);
  assert.ok(Math.abs(domain.min / domain.step - Math.round(domain.min / domain.step)) < 1e-9,
    'the floor must be a whole number of steps from zero');
});

test('a stack of one series is the domain that series always had', () => {
  const one: ArenaSeries[] = [{ label: 'Web', values: [10, 20, 30] }];
  assert.deepEqual(arenaStackDomain(one), arenaSeriesDomain(one));
});

test('no series stacks to nothing rather than throwing', () => {
  assert.deepEqual(arenaStackSegments([], 0), []);
  assert.equal(arenaStackDomain([]).max, arenaSeriesDomain([]).max);
});

test('a mirrored domain reaches the same distance on both sides, or the two halves are not comparable', () => {

  const sides: ArenaSeries[] = [
    { label: 'Women', values: [40, 30, 12] },
    { label: 'Men', values: [38, 33, 9] },
  ];
  const domain = arenaMirrorDomain(sides);
  assert.equal(domain.min, -domain.max, `got ${domain.min} and ${domain.max}`);
  assert.ok(domain.max >= 40, 'the widest bar on either side has to fit');
});

test('the mirror measures the larger side, so one lopsided category does not squash the other half', () => {

  const lopsided: ArenaSeries[] = [
    { label: 'Left', values: [10, 10] },
    { label: 'Right', values: [10, 90] },
  ];
  const domain = arenaMirrorDomain(lopsided);
  assert.equal(domain.min, -domain.max);
  assert.ok(domain.max >= 90, `got ${domain.max}`);
});

test('a mirrored domain still puts zero on a tick, which is the centre line the two sides share', () => {
  const domain = arenaMirrorDomain([{ label: 'a', values: [37] }, { label: 'b', values: [23] }]);
  assert.ok(Math.abs(domain.max / domain.step - Math.round(domain.max / domain.step)) < 1e-9,
    'the reach must be a whole number of steps from zero, or the centre is not a gridline');
});

test('two series are what a pyramid reads, and anything else warns rather than drawing a lie', () => {

  forgetArenaWarnings();
  const warnings: string[] = [];
  const real = console.warn;
  console.warn = (message: string) => { warnings.push(message); };
  try {
    const pair = arenaTwoSeries([{ label: 'only', values: [1] }], 'ArenaPyramidChart');
    assert.equal(pair.length, 2, 'the missing side is empty rather than absent, so the chart still lays out');
    assert.equal(pair[1]?.values.length, 0);
    assert.ok(warnings.some((w) => w.includes('two series')), `no warning, got ${JSON.stringify(warnings)}`);
  } finally {
    console.warn = real;
  }
});

const PAIRS: ArenaPointSeries[] = [
  { label: 'Staging', x: [12, 19, 24], y: [240, 310, 290] },
  { label: 'Production', x: [15, 22], y: [180, 205] },
];

test('a pair needs both halves, so the shorter array ends the series', () => {

  const ragged: ArenaPointSeries[] = [{ label: 'Half', x: [1, 2, 3], y: [10, 20] }];
  assert.equal(arenaPointCount(ragged), 2, 'a third x with no y is not a point, and inventing the y is the one thing a chart may not do');
  assert.equal(arenaPointTable('Series', ragged, 'X', 'Y', 'Size', String).rows.length, 2, 'and the table says the same');
});

test('the mark count is every pair across every series, because the cursor walks them all', () => {
  assert.equal(arenaPointCount(PAIRS), 5);
  assert.equal(arenaPointCount([]), 0);
});

test('a scatter measures two ranges, and neither one borrows the other\'s ticks', () => {

  const domains = arenaPointSeriesDomain(PAIRS);
  assert.ok(domains.x.max >= 24, `x reaches ${domains.x.max}`);
  assert.ok(domains.y.max >= 310, `y reaches ${domains.y.max}`);
  assert.notEqual(domains.x.max, domains.y.max, 'two quantities in different units share no scale');
});

test('both domains still put zero on a tick, which is what the two rules are drawn against', () => {
  const domains = arenaPointSeriesDomain(PAIRS);
  for (const [which, domain] of [['x', domains.x], ['y', domains.y]] as const) {
    assert.ok(Math.abs(domain.max / domain.step - Math.round(domain.max / domain.step)) < 1e-9, `${which} axis`);
  }
});

test('the table lists a row per pair with the series named on every one, in the order given', () => {

  const table = arenaPointTable('Series', PAIRS, 'Requests', 'Latency', 'Size', (v: number) => `${v}`);
  assert.deepEqual(table.columns, ['Series', 'Requests', 'Latency']);
  assert.equal(table.rows.length, 5);
  assert.deepEqual(table.rows[0], { header: 'Staging', cells: ['12', '240'] });
  assert.deepEqual(table.rows[3], { header: 'Production', cells: ['15', '180'] },
    'the second series follows the first, which is the order the cursor walks too');
});

test('a point series takes its colour by position when it declares none', () => {
  assert.notEqual(arenaPointSeriesColor(PAIRS[0] as ArenaPointSeries, 1),
    arenaPointSeriesColor(PAIRS[1] as ArenaPointSeries, 2),
    'two clouds that were never told apart must not come out the same colour');
});

test('tone still wins over slot on a point series, and still warns', () => {

  forgetArenaWarnings();
  const warnings: string[] = [];
  const real = console.warn;
  console.warn = (message: string) => { warnings.push(message); };
  try {
    const both: ArenaPointSeries = { label: 'Both', x: [1], y: [1], slot: 4, tone: 'danger' };
    assert.equal(arenaPointSeriesColor(both, 1), arenaPointSeriesColor({ label: 'T', x: [], y: [], tone: 'danger' }, 1));
    assert.ok(warnings.some((w) => w.includes('mutually exclusive')), `no warning, got ${JSON.stringify(warnings)}`);
  } finally {
    console.warn = real;
  }
});

test('a size column appears only when a series carries one, so a plain scatter keeps three columns', () => {

  const plain = arenaPointTable('Series', PAIRS, 'X', 'Y', 'Size', String);
  assert.deepEqual(plain.columns, ['Series', 'X', 'Y']);
  assert.equal(arenaPointSized(PAIRS), false);

  const sized: ArenaPointSeries[] = [{ label: 'A', x: [1, 2], y: [3, 4], r: [10, 20] }];
  assert.equal(arenaPointSized(sized), true);
  assert.deepEqual(arenaPointTable('Series', sized, 'X', 'Y', 'Weight', String).columns, ['Series', 'X', 'Y', 'Weight']);
});

test('an unmeasured size leaves an empty cell and keeps its mark, because the POSITION was measured', () => {

  const holed: ArenaPointSeries[] = [
    { label: 'Sized', x: [1, 2], y: [3, 4], r: [10] },
    { label: 'Unsized', x: [5], y: [6] },
  ];
  const rows = arenaPointTable('Series', holed, 'X', 'Y', 'Weight', String).rows;
  assert.equal(rows.length, 3, 'every pair still has a row: a missing size is not a missing point');
  assert.deepEqual(rows[1]?.cells, ['2', '4', ''], 'the second pair has no size, and says so rather than saying zero');
  assert.deepEqual(rows[2]?.cells, ['5', '6', '']);
});

test('the size range spans every series that carries one and ignores the ones that do not', () => {

  const mixed: ArenaPointSeries[] = [
    { label: 'A', x: [1, 2], y: [1, 2], r: [40, 12] },
    { label: 'B', x: [3], y: [3] },
    { label: 'C', x: [4], y: [4], r: [90] },
  ];
  assert.deepEqual(arenaPointSizeRange(mixed), { min: 12, max: 90 });
});

test('no sizes at all give a range of nothing rather than an infinite one', () => {
  assert.deepEqual(arenaPointSizeRange(PAIRS), { min: 0, max: 0 });
});
