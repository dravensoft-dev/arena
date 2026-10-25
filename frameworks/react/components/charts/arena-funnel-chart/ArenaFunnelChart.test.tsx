import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { forgetArenaWarnings } from '../../../WarnOnce.ts';
import { arenaTextGutter } from '../ChartAxis.ts';
import { ArenaFunnelChart } from './ArenaFunnelChart.tsx';

const STAGES = ['Visits', 'Sign-ups', 'Activated', 'Subscribed', 'Retained'];
const COUNTS = [12480, 3120, 1904, 702, 518];

const draw = (props: Partial<React.ComponentProps<typeof ArenaFunnelChart>> = {}) => renderToStaticMarkup(
  <ArenaFunnelChart label="Trial conversion" labels={STAGES}
    series={[{ label: 'Accounts', values: COUNTS }]} valueFormat={{ grouping: true }} {...props} />,
);

const drawValues = (values: number[], props: Partial<React.ComponentProps<typeof ArenaFunnelChart>> = {}) => draw({
  labels: values.map((_, i) => `S${i + 1}`), series: [{ label: 'Accounts', values }], valueFormat: undefined, ...props,
});

function captureWarnings(body: () => void): string[] {
  const captured: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => { captured.push(args.map(String).join(' ')); };
  try { body(); } finally { console.warn = original; }
  return captured;
}

const num = (tag: string, name: string) => Number(new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1]);
const marks = (html: string) => [...html.matchAll(/<rect [^>]*rx="[^"]*"[^>]*>/g)].map((m) => m[0]).map((tag) => ({
  x: num(tag, 'x'), y: num(tag, 'y'), width: num(tag, 'width'), height: num(tag, 'height'),
  fill: /fill="([^"]*)"/.exec(tag)?.[1] as string, opacity: num(tag, 'opacity'),
}));
const connectors = (html: string) => [...html.matchAll(/<path d="([^"]*)" fill="([^"]*)" stroke="none"/g)].map((m) => ({ d: m[1] as string, fill: m[2] as string }));
const texts = (html: string) => [...html.matchAll(/<text ([^>]*)>([^<]*)<\/text>/g)].map((m) => ({
  x: num(m[1] as string, 'x'), anchor: /text-anchor="(\w+)"/.exec(m[1] as string)?.[1] as string, text: m[2] as string,
}));
const gutterTexts = (html: string) => texts(html).filter((t) => t.anchor !== 'end').map((t) => t.text).sort();
const tableCells = (html: string) => table(html).rows.flatMap((row) => [row[1], row[2]]).filter((cell) => cell !== '').sort();
const table = (html: string) => ({
  head: [...html.matchAll(/<th>([^<]*)<\/th>/g)].map((m) => m[1]),
  rows: [...html.matchAll(/<tr><th scope="row">([^<]*)<\/th>((?:<td>[^<]*<\/td>)+)<\/tr>/g)]
    .map((m) => [m[1], ...[...(m[2] as string).matchAll(/<td>([^<]*)<\/td>/g)].map((c) => c[1])]),
});

test('ArenaFunnelChart is a named figure whose table holds the counts and both conversions', () => {
  const html = draw();
  assert.match(html, /<svg [^>]*role="img" aria-label="Trial conversion — funnel chart"/);
  assert.match(html, /<caption>Trial conversion — funnel chart<\/caption>/);
  const { head, rows } = table(html);
  assert.deepEqual(head, ['Category', 'Accounts', 'Of previous stage', 'Of first stage']);
  assert.equal(rows.length, 5);
  assert.equal(rows[0]![2], '', 'the first stage has no stage before it, so its step cell is empty');
  assert.deepEqual(rows[0], ['Visits', '12,480', '', '100%']);
  assert.equal(rows[1]![3], '25%');
});

test('ArenaFunnelChart without the conversion is two columns and draws no connector', () => {
  const html = draw({ showConversion: false });
  const { head, rows } = table(html);
  assert.deepEqual(head, ['Category', 'Accounts']);
  assert.ok(rows.every((row) => row.length === 2));
  assert.equal(connectors(html).length, 0, 'no connector is drawn');
  assert.ok(!texts(html).some((t) => t.text.endsWith('%')), 'no conversion is written');
});

test('ArenaFunnelChart draws a width proportional to the value from zero', () => {
  const [first, second] = marks(draw());
  assert.ok(Math.abs(second!.width / first!.width - 3120 / 12480) < 1e-6);
});

test('ArenaFunnelChart gives a mark twice the height of the gap between two marks', () => {
  const [first, second] = marks(draw());
  const gap = second!.y - (first!.y + first!.height);
  assert.ok(Math.abs(first!.height - 2 * gap) < 1e-6, `a mark of ${first!.height} over a gap of ${gap}`);
});

test('ArenaFunnelChart centres every mark on one axis', () => {
  const centres = marks(draw()).map((m) => m.x + m.width / 2);
  assert.ok(centres.every((c) => Math.abs(c - centres[0]!) < 1e-6));
});

test('ArenaFunnelChart draws a stage larger than its predecessor as it is and writes its ratio above 100%', () => {
  const html = drawValues([100, 150]);
  const [first, second] = marks(html);
  assert.ok(second!.width > first!.width, 'the second mark is wider and nothing is clamped');
  const [connector] = connectors(html);
  const [, lowerRight, lowerLeft] = [...connector!.d.matchAll(/L([\d.]+),/g)].map((m) => Number(m[1]));
  assert.ok(lowerRight! > first!.x + first!.width, 'the connector widens towards the larger stage');
  assert.ok(lowerLeft! < first!.x, 'both lower corners lie outside the narrower mark');
  assert.equal(table(html).rows[1]![2], '150%');
  assert.ok(texts(html).some((t) => t.text === '150%'), 'the drawing writes what the table writes');
});

test('ArenaFunnelChart draws a zero stage with no width and leaves the next step empty', () => {
  const html = drawValues([100, 0, 50]);
  const drawn = marks(html);
  assert.equal(drawn[1]!.width, 0);
  const rows = table(html).rows;
  assert.equal(rows[1]![2], '0%', 'a zero over a positive count is 0%');
  assert.equal(rows[2]![2], '', 'a ratio over a zero is the empty cell and never 0%');
  assert.deepEqual(gutterTexts(html), ['0', '0%', '100', '50'], 'the drawing writes one 0% and no step under the zero stage');
  assert.deepEqual(gutterTexts(html), tableCells(html), 'the gutter holds exactly the non-empty count and step cells');
});

test('ArenaFunnelChart draws a negative stage with no width and writes it as passed', () => {
  const html = drawValues([100, -5]);
  assert.equal(marks(html)[1]!.width, 0);
  assert.equal(table(html).rows[1]![1], '-5');
  assert.deepEqual(gutterTexts(html), ['-5', '-5%', '100'], 'the drawing writes the count and the step as passed');
  assert.deepEqual(gutterTexts(html), tableCells(html), 'the gutter holds exactly the non-empty count and step cells');
});

test('ArenaFunnelChart draws no mark for a missing stage and no connector touching it', () => {
  const missing = renderToStaticMarkup(
    <ArenaFunnelChart label="Trial conversion" labels={['A', 'B', 'C']} series={[{ label: 'Accounts', values: [100, 50] }]} />,
  );
  assert.equal(marks(missing).length, 2, 'no third mark');
  assert.equal(connectors(missing).length, 1, 'only the connector between the two stages that exist');
  assert.deepEqual(table(missing).rows[2], ['C', '', '', '']);
  assert.deepEqual(gutterTexts(missing), ['100', '50', '50%'], 'no count is written for the missing stage');
  assert.deepEqual(gutterTexts(missing), tableCells(missing), 'the gutter holds exactly the non-empty count and step cells');
  const nan = drawValues([100, Number.NaN, 25]);
  assert.equal(marks(nan).length, 2, 'a NaN draws no mark');
  assert.equal(connectors(nan).length, 0, 'and breaks the connector on either side');
  assert.deepEqual(table(nan).rows[1], ['S2', '', '', '']);
  assert.deepEqual(gutterTexts(nan), ['100', '25'], 'no count and no step is written for the missing stage or beside it');
  assert.deepEqual(gutterTexts(nan), tableCells(nan), 'the gutter holds exactly the non-empty count and step cells');
});

test('ArenaFunnelChart draws a stage a hundredth of the first wider than nothing', () => {
  const [, small] = marks(drawValues([10000, 100]));
  assert.ok(small!.width > 0);
});

test('ArenaFunnelChart puts no text inside a mark, whatever its anchor', () => {
  const html = draw();
  const drawn = marks(html);
  const left = Math.min(...drawn.map((m) => m.x));
  const right = Math.max(...drawn.map((m) => m.x + m.width));
  for (const { x, anchor, text } of texts(html)) {
    if (anchor === 'end') assert.ok(x <= left, `the name ${text} ends at ${x}, left of the marks at ${left}`);
    else assert.ok(x >= right, `${text} starts at ${x}, right of the marks at ${right}`);
  }
});

test('ArenaFunnelChart widens its right gutter with the widest text and never draws a mark into it', () => {
  const narrow = draw({ series: [{ label: 'Accounts', values: [9, 8, 7, 6, 5] }], valueFormat: undefined });
  const wide = draw({ series: [{ label: 'Accounts', values: [9000000, 8, 7, 6, 5] }], valueFormat: undefined });
  const edge = (html: string) => { const m = marks(html)[0]!; return m.x + m.width; };
  assert.ok(edge(wide) < edge(narrow), 'a wider text takes room from the plot');
  const start = (html: string) => texts(html).find((t) => t.anchor === 'start')!.x;
  assert.ok(edge(wide) <= start(wide), 'the marks stop before the gutter');
  assert.equal(arenaTextGutter(['9000000']) > arenaTextGutter(['9']), true);
});

test('ArenaFunnelChart writes a conversion with one fraction digit whatever the counts keep', () => {
  const html = drawValues([1000, 624], { valueFormat: { locale: 'en-US', fractionDigits: 0 } });
  assert.equal(table(html).rows[1]![2], '62.4%');
  assert.ok(texts(html).some((t) => t.text === '62.4%'));
});

test('ArenaFunnelChart paints every mark one hue by default, and tone paints the whole series', () => {
  assert.ok(marks(draw()).every((m) => m.fill === 'var(--color-cat-1)'));
  assert.ok(marks(draw({ series: [{ label: 'Accounts', values: COUNTS, tone: 'danger' }] })).every((m) => m.fill === 'var(--danger)'));
});

test('ArenaFunnelChart paints a stage by its colour id when colorIds is given', () => {
  const fills = marks(draw({ series: [{ label: 'Accounts', values: COUNTS, colorIds: [3, 4, 5, 6, 7] }] })).map((m) => m.fill);
  assert.deepEqual(fills, [3, 4, 5, 6, 7].map((id) => `var(--color-cat-${id})`));
});

test('ArenaFunnelChart tints each connector with the colour of the stage above it', () => {
  const fills = connectors(draw({ series: [{ label: 'Accounts', values: COUNTS, colorIds: [3, 4, 5, 6, 7] }] })).map((c) => c.fill);
  assert.equal(fills.length, 4);
  assert.match(fills[0] as string, /var\(--color-cat-3\)/);
  assert.match(fills[3] as string, /var\(--color-cat-6\)/);
});

test('ArenaFunnelChart warns once of a second series and ignores it', () => {
  forgetArenaWarnings();
  const warnings = captureWarnings(() => {
    const html = draw({ series: [{ label: 'A', values: COUNTS }, { label: 'B', values: [1, 2, 3, 4, 5] }] });
    draw({ series: [{ label: 'A', values: COUNTS }, { label: 'B', values: [1, 2, 3, 4, 5] }] });
    assert.deepEqual(table(html).head, ['Category', 'A', 'Of previous stage', 'Of first stage']);
  });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0] as string, /ArenaFunnelChart: reads one series and was given 2/);
});

test('ArenaFunnelChart throws on a missing label, labels or series', () => {
  assert.throws(() => draw({ label: '' }), /`label` is required/);
  assert.throws(() => draw({ labels: undefined as never }), /`labels` is required/);
  assert.throws(() => draw({ series: undefined as never }), /`series` is required/);
});
