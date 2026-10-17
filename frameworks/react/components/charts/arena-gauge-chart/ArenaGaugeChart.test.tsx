import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { forgetArenaWarnings } from '../../../WarnOnce.ts';
import { chartGaugeHeight } from '../../../Tokens.generated.js';
import { arenaGaugePoint, arenaGaugeRadii } from '../ChartPolar.ts';
import type { ArenaGaugeBand } from '../../../Api.generated';
import { ArenaGaugeChart } from './ArenaGaugeChart.tsx';

const BANDS: ArenaGaugeBand[] = [
  { from: 0, tone: 'success', label: 'Healthy' },
  { from: 60, tone: 'warning', label: 'Elevated' },
  { from: 85, tone: 'danger', label: 'Critical' },
];

const draw = (props: Partial<React.ComponentProps<typeof ArenaGaugeChart>> = {}) => renderToStaticMarkup(
  <ArenaGaugeChart label="CPU load" value={72} bands={BANDS} {...props} />,
);

function captureWarnings(body: () => void): string[] {
  const captured: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => { captured.push(args.map(String).join(' ')); };
  try { body(); } finally { console.warn = original; }
  return captured;
}

const tall = (html: string) => {
  const [, property, px] = /style="(\w+):(\d+)px"/.exec(html) ?? [];
  assert.equal(property, 'height', 'the frame\'s only inline property is its height');
  return Number(px);
};

const paths = (html: string) => [...html.matchAll(/<path d="([^"]*)" fill="([^"]*)"/g)].map((m) => ({ d: m[1] as string, fill: m[2] as string }));
const texts = (html: string) => [...html.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1] as string);
const rows = (html: string) => [...html.matchAll(/<tr><th scope="row">([^<]*)<\/th><td>([^<]*)<\/td><\/tr>/g)].map((m) => [m[1], m[2]]);
const reading = (html: string) => [...html.matchAll(/<text[^>]*>[^<]*<\/text>/g)].map((m) => m[0]).find((t) => /var\(--ink-heading\)/.test(t)) as string;
const track = (html: string) => paths(html).find((p) => p.fill === 'var(--fill-track)')!;
const arc = (html: string, fill: string) => paths(html).find((p) => p.fill === fill);

test('ArenaGaugeChart is a named figure whose table is the whole scale, the reading, both ends and every band', () => {
  const html = draw({ valueSuffix: ' %' });
  assert.match(html, /<svg [^>]*role="img" aria-label="CPU load — gauge"/);
  assert.match(html, /<caption>CPU load — gauge<\/caption>/);
  assert.deepEqual(rows(html), [
    ['Value', '72 %'], ['Minimum', '0 %'], ['Maximum', '100 %'],
    ['Healthy', '0 % – 60 %'], ['Elevated', '60 % – 85 %'], ['Critical', '85 % – 100 %'],
  ]);
});

test('ArenaGaugeChart is the gauge height token tall by default, and the height member overrides it', () => {
  assert.equal(chartGaugeHeight, 200);
  assert.equal(tall(draw()), chartGaugeHeight);
  assert.equal(tall(renderToStaticMarkup(<ArenaGaugeChart label="CPU load" value={72} height={140} />)), 140);
  assert.equal(tall(renderToStaticMarkup(<ArenaGaugeChart label="CPU load" value={72} height={undefined} />)), chartGaugeHeight, 'an explicit undefined falls back to the token');
});

test('ArenaGaugeChart writes the reading in the centre and the word of its band under it', () => {
  const written = texts(draw({ valueSuffix: ' %' }));
  assert.ok(written.includes('72 %'));
  assert.ok(written.includes('Elevated'));
  assert.equal(written.filter((t) => t === 'Healthy' || t === 'Critical').length, 0, 'only the band the value is in is named');
  assert.doesNotMatch(reading(draw({ valueSuffix: ' %' })), /dominant-baseline/, 'with a word under it the number is not centred on the middle');
});

test('ArenaGaugeChart clamps the drawing above the scale and never the words', () => {
  const html = draw({ value: 130, valueSuffix: ' %' });
  assert.equal(arc(html, 'var(--danger)')?.d, track(html).d, 'the arc ends where the track ends');
  assert.ok(texts(html).includes('130 %'));
  assert.deepEqual(rows(html)[0], ['Value', '130 %']);
});

test('ArenaGaugeChart draws no arc below the scale, and still says the number it was given', () => {
  const html = draw({ value: -20, valueSuffix: ' %' });
  assert.equal(paths(html).length, BANDS.length + 1, 'the band ring and the track only');
  assert.ok(texts(html).includes('-20 %'));
  assert.ok(!texts(html).includes('Healthy'), 'a value below the first band is in no band');
});

test('ArenaGaugeChart draws the empty track for a value that is not a number, with no reading and an empty cell', () => {
  const html = draw({ value: Number.NaN });
  assert.equal(paths(html).length, BANDS.length + 1);
  assert.deepEqual(texts(html), ['0', '60', '85', '100'], 'the scale is written and the reading is not');
  assert.deepEqual(rows(html)[0], ['Value', '']);
});

test('ArenaGaugeChart warns once for a scale with no length and draws only the track, with no tick', () => {
  forgetArenaWarnings();
  let html = '';
  const warnings = captureWarnings(() => { html = draw({ value: 5, min: 0, max: 0 }); });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0] as string, /ArenaGaugeChart: `max` \(0\) is not greater than `min` \(0\)/);
  assert.equal(paths(html).length, 1);
  assert.equal(paths(html)[0]?.fill, 'var(--fill-track)');
  assert.doesNotMatch(html, /<line/);
  assert.deepEqual(texts(html), ['5', 'Healthy'], 'no tick text, only the reading and the band the lookup finds');
  forgetArenaWarnings();
});

test('ArenaGaugeChart reads bands given out of order as sorted, and warns', () => {
  forgetArenaWarnings();
  let html = '';
  const warnings = captureWarnings(() => { html = draw({ bands: [BANDS[2]!, BANDS[0]!, BANDS[1]!] }); });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0] as string, /ArenaGaugeChart: reads its bands in ascending order of `from`/);
  assert.deepEqual(rows(html).slice(3).map((r) => r[0]), ['Healthy', 'Elevated', 'Critical']);
  assert.ok(texts(html).includes('Elevated'));
  forgetArenaWarnings();
});

test('ArenaGaugeChart without bands draws one arc in an identity colour, no band and no word', () => {
  const plain = draw({ bands: undefined });
  assert.equal(paths(plain).length, 2, 'the track and the arc');
  assert.ok(arc(plain, 'var(--color-cat-1)'));
  assert.deepEqual(texts(plain), ['0', '100', '72']);
  assert.match(reading(plain), /dominant-baseline="middle"/, 'the number alone sits on the middle of the dial');
  assert.ok(arc(draw({ bands: undefined, colorId: 3 }), 'var(--color-cat-3)'));
});

test('ArenaGaugeChart a band wholly outside the scale draws no segment of the ring', () => {
  const html = draw({ bands: [{ from: 0, tone: 'success', label: 'Healthy' }, { from: 140, tone: 'danger', label: 'Critical' }], value: 50 });
  assert.equal(paths(html).filter((p) => p.fill === 'var(--fill-track)').length, 1);
  assert.equal(paths(html).length, 3, 'one ring segment, the track and the arc');
  assert.deepEqual(rows(html).slice(3).map((r) => r[0]), ['Healthy', 'Critical'], 'the table still lists both bands');
});

test('ArenaGaugeChart ignores colorId beside bands, with a warning', () => {
  forgetArenaWarnings();
  let html = '';
  const warnings = captureWarnings(() => { html = draw({ colorId: 3 }); });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0] as string, /ArenaGaugeChart: `colorId` is ignored while `bands` is given/);
  assert.ok(arc(html, 'var(--warning)'));
  assert.equal(arc(html, 'var(--color-cat-3)'), undefined);
  forgetArenaWarnings();
});

test('ArenaGaugeChart ignores colorId beside bands with a warning, even when the value draws no arc', () => {
  for (const value of [-20, Number.NaN]) {
    forgetArenaWarnings();
    const warnings = captureWarnings(() => { draw({ colorId: 3, value }); });
    assert.equal(warnings.length, 1, `value ${value}`);
    assert.match(warnings[0] as string, /ArenaGaugeChart: `colorId` is ignored while `bands` is given/);
  }
  forgetArenaWarnings();
});

test('ArenaGaugeChart takes the identity slot and no word for a value below the first band', () => {
  const html = draw({ value: 5, bands: [{ from: 10, tone: 'success', label: 'Healthy' }, ...BANDS.slice(1)] });
  assert.ok(arc(html, 'var(--color-cat-1)'));
  assert.ok(!texts(html).includes('Healthy'));
});

test('ArenaGaugeChart paints the arc in the tone of the band the value is in', () => {
  assert.ok(arc(draw({ value: 72 }), 'var(--warning)'));
  assert.ok(arc(draw({ value: 90 }), 'var(--danger)'));
  assert.ok(arc(draw({ value: 60 }), 'var(--warning)'), 'a band includes its lower edge');
});

test('ArenaGaugeChart sweeps from the 7:30 point to the 4:30 point, whatever the numbers are', () => {
  const html = draw();
  const { d } = track(html);
  const { track: ring } = arenaGaugeRadii(600, chartGaugeHeight);
  const start = arenaGaugePoint(300, arenaGaugeRadii(600, chartGaugeHeight).cy, ring.outer, 0);
  const end = arenaGaugePoint(300, arenaGaugeRadii(600, chartGaugeHeight).cy, ring.outer, 1);
  const [, x0, y0] = /^M([-\d.e]+),([-\d.e]+)/.exec(d) ?? [];
  const [, x1, y1] = /A[^ ]+ 0 \d 1 ([-\d.e]+),([-\d.e]+)/.exec(d) ?? [];
  assert.ok(Math.abs(Number(x0) - start.x) < 1e-9 && Math.abs(Number(y0) - start.y) < 1e-9, 'the arc starts at the lower left');
  assert.ok(Math.abs(Number(x1) - end.x) < 1e-9 && Math.abs(Number(y1) - end.y) < 1e-9, 'the arc ends at the lower right');
  assert.ok(start.x < 300 && start.y > arenaGaugeRadii(600, chartGaugeHeight).cy, 'the start is below the centre and left of it');
  assert.ok(end.x > 300 && end.y > arenaGaugeRadii(600, chartGaugeHeight).cy, 'the end is below the centre and right of it');
  assert.ok(Math.abs(start.y - end.y) < 1e-9 && Math.abs(300 - start.x - (end.x - 300)) < 1e-9, 'the two ends mirror about the vertical');
});

test('ArenaGaugeChart writes both ends and every band edge once, in mono, as text', () => {
  const html = draw();
  const ticks = [...html.matchAll(/<text [^>]*font-family="var\(--font-mono\)"[^>]*style="font-size:var\(--dz-text-2xs\)"[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
  assert.deepEqual(ticks, ['0', '60', '85', '100']);
  assert.equal([...html.matchAll(/<line /g)].length, 4);
  assert.equal(texts(draw({ bands: [{ from: 0, tone: 'success', label: 'Healthy' }, ...BANDS.slice(1)] })).filter((t) => t === '0').length, 1, 'a band that starts at the minimum does not write it twice');
});

test('ArenaGaugeChart throws without a label or with an empty one, and for a band without its word', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaGaugeChart value={1} />), /ArenaGaugeChart: `label` is required/);
  assert.throws(() => renderToStaticMarkup(<ArenaGaugeChart value={1} label="" />), /ArenaGaugeChart: `label` is required/);
  assert.throws(() => draw({ bands: [{ from: 0, tone: 'success', label: '' }] }), /ArenaGaugeChart: every band needs a `label`/);
});

test('ArenaGaugeChart adds no tab stop, no keyboard region and no pointer surface', () => {
  const html = draw();
  assert.doesNotMatch(html, /tabindex/);
  assert.doesNotMatch(html, /role="group"/);
  assert.doesNotMatch(html, /<rect/);
});
