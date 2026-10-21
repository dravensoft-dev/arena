import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_CAT_SLOTS } from '../../DataVisuals';
import { forgetArenaWarnings } from '../../WarnOnce';
import { arenaLinearScale, arenaScaleValue, arenaNiceStep } from './ChartScales';
import {
  arenaChartTable, arenaOneSeries, arenaSeriesColors, arenaSeriesDomain, arenaSeriesPointCount,
  arenaStackSegments, arenaStackDomain, arenaMirrorDomain, arenaTwoSeries,
  arenaPointCount, arenaPointSeriesDomain, arenaPointSeriesColor, arenaPointTable,
  arenaPointSized, arenaPointSizeRange, arenaSwatchChoice, arenaSparkDomain,
  arenaGaugeBands, arenaGaugeBand, arenaGaugeTicks, arenaGaugeColor, arenaGaugeTable,
  arenaFunnelConversions, arenaFunnelMax, arenaFunnelTable, arenaHeatDomain, arenaHeatmapTable,
} from './ChartSeries';
import type { ArenaGaugeBand, ArenaPointSeries, ArenaSeries } from '../../Api.generated';
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
    assert.equal(arenaSeriesColors(series(), count, 1, 'ArenaLineChart').length, count);
    assert.equal(arenaSeriesColors(series({ colorId: 3 }), count, 1, 'ArenaLineChart').length, count);
    assert.equal(arenaSeriesColors(series({ colorIds: [1, 2] }), count, 1, 'ArenaLineChart').length, count);
    assert.equal(arenaSeriesColors(series({ tone: 'danger' }), count, 1, 'ArenaLineChart').length, count);
  }
});

test('a series with no identity of its own takes the slot its POSITION gives it', () => {

  assert.deepEqual(arenaSeriesColors(series(), 2, 1, 'ArenaLineChart'), ['var(--color-cat-1)', 'var(--color-cat-1)']);
  assert.deepEqual(arenaSeriesColors(series(), 2, 3, 'ArenaLineChart'), ['var(--color-cat-3)', 'var(--color-cat-3)']);
});

test('`colorId` paints the whole series one identity colour, whatever its position', () => {
  assert.deepEqual(arenaSeriesColors(series({ colorId: 4 }), 2, 7, 'ArenaLineChart'), ['var(--color-cat-4)', 'var(--color-cat-4)']);
});

test('`colorIds` maps per mark, falling back to the mark index where it runs short', () => {

  assert.deepEqual(arenaSeriesColors(series({ colorIds: [5, 2] }), 4, 1, 'ArenaLineChart'), [
    'var(--color-cat-5)', 'var(--color-cat-2)', 'var(--color-cat-3)', 'var(--color-cat-4)',
  ]);
});

test('`colorIds` shorter than `count` falls back to the rotated position, which wraps after the last slot', () => {
  const colours = arenaSeriesColors(series({ colorIds: [] }), 12, 1, 'ArenaLineChart', 1);
  assert.equal(colours[8], 'var(--color-cat-1)');
  assert.equal(colours[11], 'var(--color-cat-4)');
});

test('the colorIds fallback counts from `start`', () => {
  assert.deepEqual(arenaSeriesColors(series({ colorIds: [5] }), 3, 1, 'ArenaLineChart', 6),
    ['var(--color-cat-5)', 'var(--color-cat-7)', 'var(--color-cat-8)']);
});

test('an explicit colorId ignores `start` and still clamps', () => {
  assert.deepEqual(arenaSeriesColors(series({ colorId: 9 }), 1, 1, 'ArenaLineChart', 3), [`var(--color-cat-${ARENA_CAT_SLOTS})`]);
});

test('the swatch counts the colorIds fallback from `start`', () => {
  assert.deepEqual(arenaSwatchChoice({ colorIds: [] }, 1, 2, 6), { colorId: '8' });
});

test('without bands the arc takes colorId, then start', () => {
  assert.equal(arenaGaugeColor([], -1, undefined, 'ArenaGaugeChart', 4), 'var(--color-cat-4)');
  assert.equal(arenaGaugeColor([], -1, 2, 'ArenaGaugeChart', 4), 'var(--color-cat-2)');
});

test('a value in no band takes start', () => {
  assert.equal(arenaGaugeColor(BANDS, -1, undefined, 'ArenaGaugeChart', 4), 'var(--color-cat-4)');
});

test('`tone` paints the whole series the semantic colour', () => {
  assert.deepEqual(arenaSeriesColors(series({ tone: 'warning' }), 2, 1, 'ArenaLineChart'), ['var(--warning)', 'var(--warning)']);
});

test('`tone` wins over `colorId` and over `colorIds`, and passing both warns', () => {
  forgetArenaWarnings();
  const warnings = captureWarnings(() => {
    assert.deepEqual(arenaSeriesColors(series({ tone: 'danger', colorId: 3 }), 1, 1, 'ArenaLineChart'), ['var(--danger)']);
    assert.deepEqual(arenaSeriesColors(series({ tone: 'danger', colorIds: [3] }), 1, 1, 'ArenaLineChart'), ['var(--danger)']);
  });
  assert.ok(warnings.length <= 1, 'arenaWarnOnce must not warn twice for one message');
  forgetArenaWarnings();
});

test('the mutually-exclusive warning fires once, and only when both are passed', () => {
  forgetArenaWarnings();
  const clean = captureWarnings(() => {
    arenaSeriesColors(series({ tone: 'danger' }), 1, 1, 'ArenaLineChart');
    arenaSeriesColors(series({ colorId: 2 }), 1, 1, 'ArenaLineChart');
    arenaSeriesColors(series(), 1, 1, 'ArenaLineChart');
  });
  assert.deepEqual(clean, [], 'identity alone and meaning alone are both legal, and silent');

  const warnings = captureWarnings(() => {
    arenaSeriesColors(series({ tone: 'danger', colorId: 3 }), 1, 1, 'ArenaLineChart');
    arenaSeriesColors(series({ tone: 'info', colorIds: [2] }), 1, 1, 'ArenaLineChart');
  });
  assert.equal(warnings.length, 1, 'warned once for the two offending calls');
  assert.match(warnings[0] as string, /^\[arena\] ArenaLineChart:/);
  assert.match(warnings[0] as string, /mutually exclusive/);
  forgetArenaWarnings();
});

test('the mutually-exclusive warning names the chart that drew it, so a second chart is heard too', () => {
  forgetArenaWarnings();
  const warnings = captureWarnings(() => {
    arenaSeriesColors(series({ tone: 'danger', colorId: 3 }), 1, 1, 'ArenaLineChart');
    arenaSeriesColors(series({ tone: 'danger', colorId: 3 }), 1, 1, 'ArenaSparkline');
    arenaPointSeriesColor({ label: 'T', x: [], y: [], tone: 'danger', colorId: 3 }, 1, 'ArenaScatterChart');
  });
  assert.deepEqual(warnings.map((line) => /^\[arena\] (\w+):/.exec(line)?.[1]), ['ArenaLineChart', 'ArenaSparkline', 'ArenaScatterChart']);
  forgetArenaWarnings();
});

test('a tone outside the union falls back to slot 1 instead of yielding undefined', () => {

  const rogue = 'critical' as unknown as ArenaSeriesTone;
  assert.deepEqual(arenaSeriesColors(series({ tone: rogue }), 2, 4, 'ArenaLineChart'), ['var(--color-cat-1)', 'var(--color-cat-1)']);
});

test('`colorId: 0` is still an identity, not an absent one', () => {

  assert.deepEqual(arenaSeriesColors(series({ colorId: 0 }), 1, 5, 'ArenaLineChart'), ['var(--color-cat-1)']);
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

test('a spark domain is the data\'s own range, so 120 to 180 fills the box instead of a strip at its top', () => {
  assert.deepEqual(arenaSparkDomain([150, 120, 180, 160]), { min: 120, max: 180, step: 60 });
  const zeroBased = arenaSeriesDomain([series({ values: [150, 120, 180, 160] })]);
  assert.equal(zeroBased.min, 0, 'the axis-bearing charts keep zero, which is why the sparkline has its own domain');
});

test('a flat spark series is drawn on the middle of the box, never on an edge', () => {
  for (const value of [0, 42, -7]) {
    const domain = arenaSparkDomain([value, value, value]);
    const scale = arenaLinearScale(domain.min, domain.max, 20, 0);
    assert.equal(arenaScaleValue(scale, value), 10, `a flat run of ${value}`);
  }
});

test('one point is a flat series, drawn on the middle', () => {
  const domain = arenaSparkDomain([9]);
  assert.equal(arenaScaleValue(arenaLinearScale(domain.min, domain.max, 20, 0), 9), 10);
});

test('a spark domain below zero is the data\'s range there too, and zero is not pulled in', () => {
  assert.deepEqual(arenaSparkDomain([-30, -10, -20]), { min: -30, max: -10, step: 20 });
  assert.deepEqual(arenaSparkDomain([-5, 5]), { min: -5, max: 5, step: 10 });
});

test('a missing number is not a zero: a gap or a non-number leaves the range the numbers give', () => {
  const sparse = [120, 180];
  sparse[3] = 150;
  assert.deepEqual(arenaSparkDomain(sparse), { min: 120, max: 180, step: 60 });
  assert.deepEqual(arenaSparkDomain([120, Number.NaN, 180, Number.POSITIVE_INFINITY]), { min: 120, max: 180, step: 60 });
});

test('a spark series with no number at all still yields a domain the scale can draw on', () => {
  for (const values of [[], [Number.NaN]]) {
    const domain = arenaSparkDomain(values);
    assert.ok(domain.max > domain.min, `the span was ${domain.max - domain.min}`);
  }
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

test('arenaOneSeries warns with the reason its chart gives, so a sparkline never speaks of a ring', () => {
  forgetArenaWarnings();
  const warnings = captureWarnings(() => {
    arenaOneSeries([series({ label: 'A' }), series({ label: 'B' })], 'ArenaSparkline', 'A sparkline has no legend to tell two lines apart');
  });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0] as string, /^\[arena\] ArenaSparkline: reads one series and was given 2\. A sparkline has no legend to tell two lines apart; the rest are ignored\.$/);
  assert.doesNotMatch(warnings[0] as string, /sunburst/);
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
  assert.notEqual(arenaPointSeriesColor(PAIRS[0] as ArenaPointSeries, 1, 'ArenaScatterChart'),
    arenaPointSeriesColor(PAIRS[1] as ArenaPointSeries, 2, 'ArenaScatterChart'),
    'two clouds that were never told apart must not come out the same colour');
});

test('tone still wins over colorId on a point series, and still warns', () => {

  forgetArenaWarnings();
  const warnings: string[] = [];
  const real = console.warn;
  console.warn = (message: string) => { warnings.push(message); };
  try {
    const both: ArenaPointSeries = { label: 'Both', x: [1], y: [1], colorId: 4, tone: 'danger' };
    assert.equal(arenaPointSeriesColor(both, 1, 'ArenaScatterChart'), arenaPointSeriesColor({ label: 'T', x: [], y: [], tone: 'danger' }, 1, 'ArenaScatterChart'));
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

test('a swatch choice is the tone of a toned series and otherwise a clamped colour id', () => {
  assert.deepEqual(arenaSwatchChoice(series({ tone: 'success' }), 2), { tone: 'success' });
  assert.deepEqual(arenaSwatchChoice(series({ tone: 'nope' as never }), 3), { colorId: '1' }, 'an unknown tone is what the plot paints');
  assert.deepEqual(arenaSwatchChoice(series(), 3), { colorId: '3' });
  assert.deepEqual(arenaSwatchChoice(series({ colorId: 4 }), 3), { colorId: '4' });
  assert.deepEqual(arenaSwatchChoice(series({ colorIds: [5, 6] }), 1, 1), { colorId: '6' });
  assert.deepEqual(arenaSwatchChoice(series({ colorIds: [5] }), 7, 1), { colorId: '2' });
  assert.deepEqual(arenaSwatchChoice(series({ colorIds: [5], colorId: 4 }), 7), { colorId: '5' }, 'colorIds wins, colorId is ignored');
  assert.deepEqual(arenaSwatchChoice(series({ colorId: 9 as never }), 1), { colorId: '8' });
});

const BANDS: ArenaGaugeBand[] = [
  { from: 0, tone: 'success', label: 'Healthy' },
  { from: 60, tone: 'warning', label: 'Elevated' },
  { from: 85, tone: 'danger', label: 'Critical' },
];
const WORDS = { measure: 'Measure', value: 'Value', minimum: 'Minimum', maximum: 'Maximum', range: '{from} – {to}' };

test('a band includes its own from edge and stops short of the next band\'s', () => {
  assert.equal(arenaGaugeBand(BANDS, 0), 0);
  assert.equal(arenaGaugeBand(BANDS, 59.9), 0);
  assert.equal(arenaGaugeBand(BANDS, 60), 1, 'a value equal to from is in that band');
  assert.equal(arenaGaugeBand(BANDS, 85), 2);
  assert.equal(arenaGaugeBand(BANDS, 130), 2, 'the last band runs on past max, because the words do not clamp');
});

test('a value below the first band, or not a number, is in no band', () => {
  assert.equal(arenaGaugeBand(BANDS.slice(1), 10), -1);
  assert.equal(arenaGaugeBand(BANDS, Number.NaN), -1);
  assert.equal(arenaGaugeBand([], 50), -1, 'no bands, no band');
});

test('unsorted bands are sorted ascending and warn, because their order is configuration', () => {
  forgetArenaWarnings();
  const shuffled = [BANDS[2], BANDS[0], BANDS[1]] as ArenaGaugeBand[];
  let sorted: ArenaGaugeBand[] = [];
  const warned = captureWarnings(() => { sorted = arenaGaugeBands(shuffled, 'ArenaGaugeChart'); });
  assert.deepEqual(sorted.map((band) => band.from), [0, 60, 85]);
  assert.equal(warned.length, 1);
  assert.match(warned[0] as string, /ArenaGaugeChart: reads its bands in ascending order/);
  forgetArenaWarnings();
  assert.deepEqual(captureWarnings(() => arenaGaugeBands(BANDS, 'ArenaGaugeChart')), [], 'sorted bands say nothing');
});

test('the ticks are both ends and every band edge inside the scale, once each', () => {
  assert.deepEqual(arenaGaugeTicks(BANDS, 0, 100, 'ArenaGaugeChart'), [0, 60, 85, 100], 'a band starting at min is not a second tick');
  assert.deepEqual(arenaGaugeTicks([{ from: -10, tone: 'info', label: 'Low' }, { from: 140, tone: 'danger', label: 'Off' }], 0, 100, 'ArenaGaugeChart'),
    [0, 100], 'an edge outside the scale draws no tick');
  assert.deepEqual(arenaGaugeTicks([], 0, 100, 'ArenaGaugeChart'), [0, 100]);
});

test('a scale whose max is not above its min warns once and draws no tick', () => {
  forgetArenaWarnings();
  const warned = captureWarnings(() => {
    assert.deepEqual(arenaGaugeTicks(BANDS, 100, 100, 'ArenaGaugeChart'), []);
    assert.deepEqual(arenaGaugeTicks(BANDS, 100, 100, 'ArenaGaugeChart'), []);
  });
  assert.equal(warned.length, 1);
  assert.match(warned[0] as string, /ArenaGaugeChart: `max` \(100\) is not greater than `min` \(100\)/);
});

test('the arc takes the hue of the band the value is in, and the identity slot without bands', () => {
  assert.equal(arenaGaugeColor(BANDS, 2, undefined, 'ArenaGaugeChart'), 'var(--danger)');
  assert.equal(arenaGaugeColor(BANDS, 0, undefined, 'ArenaGaugeChart'), 'var(--success)');
  assert.equal(arenaGaugeColor(BANDS, -1, undefined, 'ArenaGaugeChart'), 'var(--color-cat-1)', 'below the first band is the identity default');
  assert.equal(arenaGaugeColor([], -1, undefined, 'ArenaGaugeChart'), 'var(--color-cat-1)');
  assert.equal(arenaGaugeColor([], -1, 3, 'ArenaGaugeChart'), 'var(--color-cat-3)');
  assert.equal(arenaGaugeColor([], -1, 99, 'ArenaGaugeChart'), `var(--color-cat-${ARENA_CAT_SLOTS})`, 'clamped to the ramp');
});

test('a colorId beside bands is ignored and warns, because a chart carries identity or meaning', () => {
  forgetArenaWarnings();
  const warned = captureWarnings(() => assert.equal(arenaGaugeColor(BANDS, 1, 4, 'ArenaGaugeChart'), 'var(--warning)'));
  assert.equal(warned.length, 1);
  assert.match(warned[0] as string, /ArenaGaugeChart: `colorId` is ignored while `bands` is given/);
});

test('the gauge table holds the whole scale: the value, both ends and every band\'s range', () => {
  const table = arenaGaugeTable(WORDS, 130, 0, 100, BANDS, (value) => `${value} %`);
  assert.deepEqual(table.columns, ['Measure', 'Value']);
  assert.deepEqual(table.rows.map((row) => [row.header, ...row.cells]), [
    ['Value', '130 %'],
    ['Minimum', '0 %'],
    ['Maximum', '100 %'],
    ['Healthy', '0 % – 60 %'],
    ['Elevated', '60 % – 85 %'],
    ['Critical', '85 % – 100 %'],
  ], 'the words say what was passed, 130 and not 100');
});

test('a non-number leaves the value cell empty rather than writing a zero', () => {
  const table = arenaGaugeTable(WORDS, Number.NaN, 0, 100, [], String);
  assert.deepEqual(table.rows.map((row) => [row.header, ...row.cells]), [['Value', ''], ['Minimum', '0'], ['Maximum', '100']]);
});

const FUNNEL_WORDS = { stage: 'Stage', step: 'Of previous stage', total: 'Of first stage' };
const percent = (ratio: number) => `${Math.round(ratio * 1000) / 10}%`;

test('a conversion is the share of the previous stage and of the first, and the first stage has no previous', () => {
  const [first, second, third] = arenaFunnelConversions([200, 100, 25]);
  assert.deepEqual(first, { step: null, total: 1 });
  assert.deepEqual(second, { step: 0.5, total: 0.5 });
  assert.deepEqual(third, { step: 0.25, total: 0.125 });
  assert.deepEqual(arenaFunnelConversions([]), [], 'no stage, no conversion');
});

test('a zero, negative, missing or non-finite denominator gives no ratio rather than a zero', () => {
  assert.deepEqual(arenaFunnelConversions([0, 5]), [{ step: null, total: null }, { step: null, total: null }]);
  assert.deepEqual(arenaFunnelConversions([-4, 5]), [{ step: null, total: null }, { step: null, total: null }]);
  assert.deepEqual(arenaFunnelConversions([Number.NaN, 5])[1], { step: null, total: null });
  assert.deepEqual(arenaFunnelConversions([100, Number.POSITIVE_INFINITY, 50])[2], { step: null, total: 0.5 }, 'an infinite predecessor is no denominator');
  assert.deepEqual(arenaFunnelConversions([100, 0, 50])[2], { step: null, total: 0.5 }, 'a zero predecessor leaves the step empty and the total whole');
});

test('a non-finite numerator gives no ratio, and a stage that is zero gives zero percent', () => {
  assert.deepEqual(arenaFunnelConversions([100, Number.NaN])[1], { step: null, total: null });
  assert.deepEqual(arenaFunnelConversions([100, 0])[1], { step: 0, total: 0 });
});

test('a stage above its predecessor gives a ratio above one, uncorrected', () => {
  const [, second] = arenaFunnelConversions([100, 150]);
  assert.equal(second?.step, 1.5);
  assert.equal(second?.total, 1.5);
});

test('a negative stage over a positive denominator gives a negative ratio, as passed', () => {
  assert.equal(arenaFunnelConversions([100, -5])[1]?.step, -0.05);
});

test('the funnel max is the largest finite value floored at zero', () => {
  assert.equal(arenaFunnelMax([3, 9, 4]), 9);
  assert.equal(arenaFunnelMax([3, Number.NaN, Number.POSITIVE_INFINITY, 4]), 4, 'a non-finite value never sets the scale');
  assert.equal(arenaFunnelMax([-3, -9]), 0);
  assert.equal(arenaFunnelMax([]), 0);
});

test('the funnel table has the conversion columns only when asked, one row per stage and the first step cell empty', () => {
  const one = series({ label: 'Accounts', values: [200, 100, 25] });
  const full = arenaFunnelTable(FUNNEL_WORDS, one, ['Visits', 'Sign-ups', 'Active'], write, percent, true);
  assert.deepEqual(full.columns, ['Stage', 'Accounts', 'Of previous stage', 'Of first stage']);
  assert.deepEqual(full.rows.map((row) => [row.header, ...row.cells]), [
    ['Visits', '200 ms', '', '100%'],
    ['Sign-ups', '100 ms', '50%', '50%'],
    ['Active', '25 ms', '25%', '12.5%'],
  ]);
  const bare = arenaFunnelTable(FUNNEL_WORDS, one, ['Visits', 'Sign-ups', 'Active'], write, percent, false);
  assert.deepEqual(bare.columns, ['Stage', 'Accounts']);
  assert.ok(bare.rows.every((row) => row.cells.length === 1), 'no conversion cell');
});

test('the funnel table writes a negative stage as passed and leaves a missing or non-finite one empty', () => {
  const table = arenaFunnelTable(FUNNEL_WORDS, series({ label: 'A', values: [100, -5, Number.NaN] }), ['a', 'b', 'c', 'd'], write, percent, true);
  assert.equal(table.rows.length, 4, 'the longer of the labels and the values');
  assert.deepEqual(table.rows[1]?.cells, ['-5 ms', '-5%', '-5%']);
  assert.deepEqual(table.rows[2]?.cells, ['', '', '']);
  assert.deepEqual(table.rows[3]?.cells, ['', '', ''], 'a label with no value is an empty row');
  const longer = arenaFunnelTable(FUNNEL_WORDS, series({ label: 'A', values: [4, 2, 1] }), ['a'], write, percent, true);
  assert.deepEqual(longer.rows.map((row) => row.header), ['a', '', ''], 'a value with no label has an empty header');
});

test('the heat domain covers every value, holds exactly five steps and lands every edge on a multiple of the step', () => {
  const samples = [[7], [1, 2, 3], [0.3, 0.9], [499, 12, 240], [1000000, 3], [-3, 8], [-250, -10], [0.004, 0.0071], [4.4, 99.9]];
  for (const values of samples) {
    const domain = arenaHeatDomain([series({ values })]);
    const label = `values ${values.join(', ')}`;
    assert.ok(domain.min <= Math.min(0, ...values) + 1e-9, `${label}: covers the minimum`);
    assert.ok(domain.max >= Math.max(0, ...values) - 1e-9, `${label}: covers the maximum`);
    assert.ok(Math.abs((domain.max - domain.min) / domain.step - 5) < 1e-6, `${label}: five steps`);
    const edge = domain.min / domain.step;
    assert.ok(Math.abs(edge - Math.round(edge)) < 1e-6, `${label}: the lower edge is a multiple of the step`);
    assert.ok(domain.min <= 0 && domain.max >= 0, `${label}: zero is inside`);
    assert.equal(arenaNiceStep(domain.step), domain.step, `${label}: the step is a nice step`);
  }
});

test('the heat domain of a maximum of 7 is 0 to 10 in steps of 2, and of all zeros is 0 to 5', () => {
  assert.deepEqual(arenaHeatDomain([series({ values: [7, 3] })]), { min: 0, max: 10, step: 2 });
  assert.deepEqual(arenaHeatDomain([series({ values: [0, 0] })]), { min: 0, max: 5, step: 1 });
  assert.deepEqual(arenaHeatDomain([]), { min: 0, max: 5, step: 1 });
});

test('the heat domain skips a non-finite value and reads every series', () => {
  assert.deepEqual(arenaHeatDomain([series({ values: [Number.NaN, Number.POSITIVE_INFINITY, 3] })]), arenaHeatDomain([series({ values: [3] })]));
  assert.deepEqual(arenaHeatDomain([series({ values: [1] }), series({ values: [7] })]), { min: 0, max: 10, step: 2 });
});

test('the heat table has the heading and one column per label, and one row per series headed by its label', () => {
  const rows = [series({ label: 'Mon', values: [1, 2, 3] }), series({ label: 'Tue', values: [4, 5, 6] })];
  const table = arenaHeatmapTable('Row', rows, ['a', 'b', 'c'], write);
  assert.deepEqual(table.columns, ['Row', 'a', 'b', 'c']);
  assert.deepEqual(table.rows.map((row) => [row.header, ...row.cells]), [['Mon', '1 ms', '2 ms', '3 ms'], ['Tue', '4 ms', '5 ms', '6 ms']]);
});

test('a short heat row and a non-finite value leave empty cells', () => {
  const table = arenaHeatmapTable('Row', [series({ label: 'Mon', values: [1] }), series({ label: 'Tue', values: [Number.NaN, 2, Number.POSITIVE_INFINITY] })], ['a', 'b', 'c'], write);
  assert.deepEqual(table.rows[0]?.cells, ['1 ms', '', '']);
  assert.deepEqual(table.rows[1]?.cells, ['', '2 ms', '']);
  assert.ok(table.rows.every((row) => row.cells.length === 3), 'every row is as wide as the columns');
});

test('a series longer than the labels adds a blank-headed column, and a label with no value stays a column', () => {
  const longer = arenaHeatmapTable('Row', [series({ label: 'Mon', values: [1, 2, 3] })], ['a'], write);
  assert.deepEqual(longer.columns, ['Row', 'a', '', '']);
  assert.deepEqual(longer.rows[0]?.cells, ['1 ms', '2 ms', '3 ms']);
  const wider = arenaHeatmapTable('Row', [series({ label: 'Mon', values: [1] })], ['a', 'b'], write);
  assert.deepEqual(wider.columns, ['Row', 'a', 'b']);
  assert.deepEqual(arenaHeatmapTable('Row', [], ['a'], write).rows, [], 'no series, no rows');
});

test('the heat table is the transpose of the chart table over the same data', () => {
  const rows = [series({ label: 'Mon', values: [1, 2] }), series({ label: 'Tue', values: [3, 4] })];
  const heat = arenaHeatmapTable('Row', rows, ['a', 'b'], write);
  const flat = arenaChartTable('Row', rows, ['a', 'b'], write);
  for (const [r, row] of heat.rows.entries()) {
    for (const [c, cell] of row.cells.entries()) assert.equal(flat.rows[c]?.cells[r], cell);
  }
});

test('the heat domain of decimal data has round edges', () => {
  assert.deepEqual(arenaHeatDomain([series({ values: [-0.7] })]), { min: -0.8, max: 0.2, step: 0.2 });
  assert.deepEqual(arenaHeatDomain([series({ values: [0.7, 0.1] })]), { min: 0, max: 1, step: 0.2 });
  assert.deepEqual(arenaHeatDomain([series({ values: [0.3] })]), { min: 0, max: 0.5, step: 0.1 });
});
