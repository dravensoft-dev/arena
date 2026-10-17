import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_CHART_HEIGHT, ARENA_PAD } from '../../DataVisuals';
import { chartBarGap, chartSeriesGap } from '../../Tokens.generated';
import {
  arenaLinearScale, arenaScaleValue, arenaScaleInvert, arenaScaleZero,
  arenaNiceStep, arenaNiceDomain, arenaDomainTicks, arenaRadiusScale, arenaRadiusAt,
  arenaBandScale, arenaBandStart, arenaBandMark, arenaBandCenter, arenaBandSubBand,
  arenaPointScale, arenaPointAt, arenaNearestPointIndex, arenaDoughnutSlices,
  arenaGaugeFraction, arenaFunnelBands, arenaFunnelWidth, arenaHeatEdge, arenaHeatStep,
} from './ChartScales';
import { arenaPlotBox } from './ChartAxis';
import { arenaHeatDomain } from './ChartSeries';

const IH = 244;
const BASELINE = ARENA_PAD.t + IH;
const IW = 600 - ARENA_PAD.l - ARENA_PAD.r;
const Y = arenaLinearScale(0, 100, BASELINE, ARENA_PAD.t);
const TWO_PI = Math.PI * 2;
const TWELVE_OCLOCK = -Math.PI / 2;

test('arenaScaleValue lands zero on the baseline and the axis top on the plot ceiling', () => {
  assert.equal(arenaScaleValue(Y, 0), BASELINE);
  assert.equal(arenaScaleValue(Y, 100), ARENA_PAD.t);
});

test('arenaScaleValue is linear between the two ends', () => {
  assert.equal(arenaScaleValue(Y, 50), ARENA_PAD.t + IH / 2);
  assert.equal(arenaScaleValue(Y, 25), ARENA_PAD.t + IH * 0.75);
});

test('arenaScaleValue grows upward monotonically, so a bigger value is never a shorter mark', () => {
  const ys = [0, 1, 10, 42, 99, 100].map((v) => arenaScaleValue(Y, v));
  for (let i = 1; i < ys.length; i++) assert.ok(ys[i] < ys[i - 1], `y[${i}] should sit above y[${i - 1}]`);
});

test('arenaScaleValue never leaves the plot for a value inside the axis', () => {
  for (const v of [0, 3, 17, 60, 100]) {
    const y = arenaScaleValue(Y, v);
    assert.ok(y >= ARENA_PAD.t && y <= BASELINE, `y=${y} for value ${v}`);
  }
});

test('a series spans the plot edge to edge, first point on the left pad and last on the right', () => {

  assert.equal(arenaPointAt(arenaPointScale(5, ARENA_PAD.l, IW), 0), ARENA_PAD.l);
  assert.equal(arenaPointAt(arenaPointScale(5, ARENA_PAD.l, IW), 4), ARENA_PAD.l + IW);
});

test('the points are evenly spaced, with count - 1 intervals rather than count', () => {
  const xs = [0, 1, 2, 3, 4].map((i) => arenaPointAt(arenaPointScale(5, ARENA_PAD.l, IW), i));
  const step = xs[1] - xs[0];
  for (let i = 1; i < xs.length; i++)
    assert.equal(xs[i] - xs[i - 1], step, `interval between point ${i - 1} and ${i}`);
  assert.equal(step, IW / 4);
});

test('a lone point centres in the plot instead of pinning to the left edge', () => {

  assert.equal(arenaPointAt(arenaPointScale(1, ARENA_PAD.l, IW), 0), ARENA_PAD.l + IW / 2);
});

test('a count of zero never divides by zero -- the coordinate stays finite', () => {
  const x = arenaPointAt(arenaPointScale(0, ARENA_PAD.l, IW), 0);
  assert.ok(Number.isFinite(x), `arenaPointAt returned ${x}`);
  assert.equal(x, ARENA_PAD.l + IW / 2);
});

test('every point of a series stays inside the plot horizontally', () => {
  for (let i = 0; i < 7; i++) {
    const x = arenaPointAt(arenaPointScale(7, ARENA_PAD.l, IW), i);
    assert.ok(x >= ARENA_PAD.l && x <= ARENA_PAD.l + IW, `x=${x} for point ${i}`);
  }
});

function bandsAcross(count: number, width: number) {
  const box = arenaPlotBox(width, ARENA_CHART_HEIGHT);
  return arenaBandScale(count, box.x, box.w, chartBarGap);
}

test('the bands tile the plot edge to edge, with the pitch as the only spacing', () => {
  const bands = bandsAcross(4, 600);
  assert.equal(bands.count, 4);
  assert.equal(arenaBandStart(bands, 0), ARENA_PAD.l);
  for (let i = 1; i < bands.count; i++)
    assert.equal(arenaBandStart(bands, i) - arenaBandStart(bands, i - 1), bands.step, `pitch between band ${i - 1} and ${i}`);

  assert.equal(arenaBandStart(bands, bands.count - 1) + bands.step, 600 - ARENA_PAD.r);
});

test('the hit target is a whole band, always wider than the mark drawn in it', () => {

  const bands = bandsAcross(4, 600);
  assert.ok(bands.step > bands.band, `band ${bands.step} should exceed mark ${bands.band}`);
  assert.equal(bands.step - bands.band, 2);
});

test('the 2px between bars is surface showing through, split evenly either side', () => {

  const bands = bandsAcross(3, 600);
  for (let i = 0; i < bands.count; i++) {
    assert.equal(arenaBandMark(bands, i) - arenaBandStart(bands, i), 1, 'left inset');
    assert.equal(arenaBandStart(bands, i) + bands.step - (arenaBandMark(bands, i) + bands.band), 1, 'right inset');
  }
});

test('arenaBandCenter is the band centre, which the label and the tooltip both align to', () => {
  const bands = bandsAcross(5, 600);
  for (let i = 0; i < bands.count; i++)
    assert.equal(arenaBandCenter(bands, i), arenaBandStart(bands, i) + bands.step / 2);
});

test('a mark never collapses below 1px, however many bars are crowded in', () => {

  const bands = bandsAcross(400, 600);
  assert.ok(bands.band >= 1, `band was ${bands.band}`);
  assert.equal(bands.band, 1);
});

test('the plot width floors at 1px, so a zero-width or unmeasured container still lays out', () => {
  for (const width of [0, ARENA_PAD.l + ARENA_PAD.r, -100]) {
    const bands = bandsAcross(2, width);
    assert.ok(Number.isFinite(bands.step) && bands.step > 0, `step was ${bands.step} at width ${width}`);
    for (let i = 0; i < bands.count; i++)
      assert.ok(Number.isFinite(arenaBandMark(bands, i)) && Number.isFinite(arenaBandCenter(bands, i)),
        'every coordinate stays finite');
  }
});

test('no bars means no bands, and no division by zero in the pitch', () => {
  const bands = bandsAcross(0, 600);
  assert.equal(bands.count, 0);
  assert.ok(Number.isFinite(bands.step) && bands.step > 0, `step was ${bands.step}`);
});

test('one bar takes the whole plot width', () => {
  const bands = bandsAcross(1, 600);
  assert.equal(bands.step, 600 - ARENA_PAD.l - ARENA_PAD.r);
  assert.equal(arenaBandCenter(bands, 0), ARENA_PAD.l + bands.step / 2);
});

test('a linear scale maps its domain onto its range, ends included', () => {
  const scale = arenaLinearScale(0, 100, 252, 8);
  assert.equal(arenaScaleValue(scale, 0), 252);
  assert.equal(arenaScaleValue(scale, 100), 8);
  assert.equal(arenaScaleValue(scale, 50), 130);
});

test('a linear scale does not clamp: reading past the domain reads past the range', () => {

  const scale = arenaLinearScale(0, 100, 252, 8);
  assert.equal(arenaScaleValue(scale, -50), 374);
  assert.equal(arenaScaleValue(scale, 150), -114);
});

test('arenaScaleInvert is the inverse of arenaScaleValue over the whole range', () => {
  const scale = arenaLinearScale(0, 100, 252, 8);
  for (const value of [0, 1, 25, 50, 99, 100])
    assert.ok(Math.abs(arenaScaleInvert(scale, arenaScaleValue(scale, value)) - value) < 1e-9, `value ${value}`);
});

test('a scale with no span never divides by zero -- every value lands on the range start', () => {

  const flat = arenaLinearScale(5, 5, 252, 8);
  assert.equal(arenaScaleValue(flat, 5), 252);
  assert.equal(arenaScaleValue(flat, 99), 252);
  assert.equal(arenaScaleInvert(arenaLinearScale(0, 100, 8, 8), 42), 0);
});

test('arenaScaleZero is where the value zero lands, which is the baseline today', () => {
  assert.equal(arenaScaleZero(arenaLinearScale(0, 100, 252, 8)), 252);

  assert.equal(arenaScaleZero(arenaLinearScale(-50, 50, 252, 8)), 130);
});

const POINTS = [0, 1, 2, 3, 4].map((i) => ({ x: arenaPointAt(arenaPointScale(5, ARENA_PAD.l, IW), i), y: 0 }));

test('the crosshair snaps to the point the pointer is actually nearest', () => {
  for (let i = 0; i < POINTS.length; i++)
    assert.equal(arenaNearestPointIndex(POINTS, POINTS[i].x), i, `pointer sitting exactly on point ${i}`);
});

test('a pointer between two points takes the nearer one, not the earlier one', () => {
  const step = POINTS[1].x - POINTS[0].x;
  assert.equal(arenaNearestPointIndex(POINTS, POINTS[0].x + step * 0.4), 0);
  assert.equal(arenaNearestPointIndex(POINTS, POINTS[0].x + step * 0.6), 1);
});

test('an exact tie goes to the earlier point, so the crosshair never flickers between two', () => {
  const midpoint = (POINTS[1].x + POINTS[2].x) / 2;
  assert.equal(arenaNearestPointIndex(POINTS, midpoint), 1);
});

test('a pointer outside the series clamps to the nearest end rather than losing the hover', () => {
  assert.equal(arenaNearestPointIndex(POINTS, -1e6), 0);
  assert.equal(arenaNearestPointIndex(POINTS, 1e6), POINTS.length - 1);
});

test('an empty series reports -1, which the component reads as "do not set a hover"', () => {

  assert.equal(arenaNearestPointIndex([], 100), -1);
});

test('a single point wins every pointer position', () => {
  assert.equal(arenaNearestPointIndex([{ x: 300, y: 0 }], 0), 0);
  assert.equal(arenaNearestPointIndex([{ x: 300, y: 0 }], 1e6), 0);
});

test('the ring starts at 12 o\'clock, not at 3 o\'clock where SVG angles begin', () => {

  assert.equal(arenaDoughnutSlices([1, 2, 3])[0].from, TWELVE_OCLOCK);
});

test('each slice starts exactly where the previous one ended, leaving no seam', () => {
  const slices = arenaDoughnutSlices([5, 3, 2, 7]);
  for (let i = 1; i < slices.length; i++)
    assert.equal(slices[i].from, slices[i - 1].to, `slice ${i} does not begin where slice ${i - 1} ended`);
});

test('the slices close the full circle, so the ring has no missing wedge', () => {
  const slices = arenaDoughnutSlices([5, 3, 2, 7]);
  const swept = slices[slices.length - 1].to - slices[0].from;
  assert.ok(Math.abs(swept - TWO_PI) < 1e-9, `the ring swept ${swept} radians, not 2pi`);
});

test('a slice\'s angle is proportional to its share of the total', () => {

  const slices = arenaDoughnutSlices([25, 50, 25]);
  assert.ok(Math.abs(slices[0].to - slices[0].from - TWO_PI * 0.25) < 1e-9);
  assert.ok(Math.abs(slices[1].to - slices[1].from - TWO_PI * 0.5) < 1e-9);
  assert.ok(Math.abs(slices[2].to - slices[2].from - TWO_PI * 0.25) < 1e-9);
});

test('the shares of a whole ring sum to exactly one', () => {
  const total = arenaDoughnutSlices([3, 1, 4, 1, 5, 9]).reduce((sum, slice) => sum + slice.share, 0);
  assert.ok(Math.abs(total - 1) < 1e-9, `the shares summed to ${total}`);
});

test('a negative value is floored at zero rather than sweeping the ring backwards', () => {

  const slices = arenaDoughnutSlices([-10, 30, 70]);
  assert.equal(slices[0].share, 0);
  assert.equal(slices[0].to, slices[0].from, 'a negative slice must be zero-width, not reversed');
  assert.ok(Math.abs(slices[1].share - 0.3) < 1e-9, 'the negative value must not enlarge the total');
  assert.ok(Math.abs(slices[2].share - 0.7) < 1e-9);
});

test('a negative value never makes the ring over- or under-sweep', () => {
  const slices = arenaDoughnutSlices([-10, 30, 70]);
  const swept = slices[slices.length - 1].to - slices[0].from;
  assert.ok(Math.abs(swept - TWO_PI) < 1e-9, `the ring swept ${swept} radians, not 2pi`);
});

test('no values produce no slices, rather than one empty ring', () => {
  assert.deepEqual(arenaDoughnutSlices([]), []);
});

test('a total of zero never divides by zero -- every share is a real 0', () => {

  for (const slice of arenaDoughnutSlices([0, 0, 0])) {
    assert.equal(slice.share, 0);
    assert.equal(slice.percent, 0);
    assert.ok(Number.isFinite(slice.from) && Number.isFinite(slice.to), `angles were ${slice.from}..${slice.to}`);
    assert.equal(slice.to, slice.from, 'a zero-total slice must be zero-width, so the component draws no path');
  }
});

test('a zero value inside real data is zero-width and does not disturb its neighbours', () => {
  const slices = arenaDoughnutSlices([50, 0, 50]);
  assert.equal(slices[1].to, slices[1].from);
  assert.equal(slices[0].to, slices[2].from, 'the zero-width slice must not open a gap between its neighbours');
});

test('percent is the share rounded to whole numbers, which is what the hole reads', () => {
  const slices = arenaDoughnutSlices([1, 1, 1]);
  for (const slice of slices) assert.equal(slice.percent, 33, 'one third reads as 33%, not 33.333');
});

test('rounding is to nearest, not truncation -- a two-thirds slice reads 67%', () => {
  assert.equal(arenaDoughnutSlices([2, 1])[0].percent, 67);
});

test('the rounded percentages need not sum to 100, and that is honest rather than fudged', () => {

  const total = arenaDoughnutSlices([1, 1, 1]).reduce((sum, slice) => sum + slice.percent, 0);
  assert.equal(total, 99);
});

test('a whole ring in one slice reads 100%', () => {
  assert.equal(arenaDoughnutSlices([42])[0].percent, 100);
});

test('a lone slice sweeps the entire circle', () => {
  const [only] = arenaDoughnutSlices([42]);
  assert.equal(only.share, 1);
  assert.ok(Math.abs(only.to - only.from - TWO_PI) < 1e-9);
});

test('arenaNiceStep returns 1 for every input that is not a positive number', () => {

  for (const bad of [0, -0, -1, -1000, Number.NaN, -Infinity])
    assert.equal(arenaNiceStep(bad), 1, `arenaNiceStep(${bad})`);
});

test('arenaNiceStep lands on each of the five steps at its own boundary', () => {
  assert.equal(arenaNiceStep(1), 1);
  assert.equal(arenaNiceStep(2), 2);
  assert.equal(arenaNiceStep(2.5), 2.5);
  assert.equal(arenaNiceStep(5), 5);
  assert.equal(arenaNiceStep(10), 10);
});

test('arenaNiceStep steps up the moment a boundary is crossed', () => {
  assert.equal(arenaNiceStep(1.01), 2);
  assert.equal(arenaNiceStep(2.01), 2.5);
  assert.equal(arenaNiceStep(2.51), 5);
  assert.equal(arenaNiceStep(5.01), 10);
});

test('arenaNiceStep scales the same five steps across powers of ten', () => {
  assert.equal(arenaNiceStep(0.4), 0.5);
  assert.equal(arenaNiceStep(23), 25);
  assert.equal(arenaNiceStep(230), 250);
  assert.equal(arenaNiceStep(2300), 2500);
  assert.equal(arenaNiceStep(7), 10);
  assert.equal(arenaNiceStep(70), 100);
  assert.equal(arenaNiceStep(7000), 10000);
});

test('arenaNiceStep never returns an axis top below the value it must hold', () => {

  for (let v = 0.01; v < 100000; v *= 1.37)
    assert.ok(arenaNiceStep(v) >= v, `arenaNiceStep(${v}) = ${arenaNiceStep(v)} is below ${v}`);
});

test('the ticks span the domain inclusive, at the count the domain asks for or near it', () => {

  assert.deepEqual(arenaDomainTicks(arenaNiceDomain(0, 100)), [0, 25, 50, 75, 100]);
  assert.deepEqual(arenaDomainTicks(arenaNiceDomain(0, 10, 2)), [0, 5, 10]);
  for (const [max, count] of [[100, 4], [7, 7], [510, 4], [42, 4]] as const) {
    const ticks = arenaDomainTicks(arenaNiceDomain(0, max, count));
    assert.ok(Math.abs(ticks.length - (count + 1)) <= 2,
      `${ticks.length} ticks for a count of ${count}: the step is nice, so the count gives rather than the labels`);
  }
});

test('an axis reaches its data and stops within one step of it, rather than at a nice round ceiling', () => {

  for (const max of [1, 7, 23, 42, 128, 510, 2300]) {
    const domain = arenaNiceDomain(0, max);
    assert.equal(domain.min, 0);
    assert.ok(domain.max >= max, `an axis of ${domain.max} does not hold ${max}`);
    assert.ok(domain.max - max < domain.step,
      `${domain.max - max} of dead space above ${max} is more than the one step ${domain.step} that rounding can cost`);
  }
});

test('no axis spends more than a third of itself on nothing', () => {

  let worst = 0;
  for (let max = 1; max <= 2000; max += 1) {
    const domain = arenaNiceDomain(0, max);
    worst = Math.max(worst, (domain.max - max) / domain.max);
  }
  assert.ok(worst <= 1 / 3 + 1e-9, `the worst axis in the sweep was ${(worst * 100).toFixed(0)}% empty`);
});

test('a whole-number series gets a whole-number step, near enough always', () => {

  let fractional = 0;
  for (let max = 1; max <= 2000; max += 1) {
    if (!Number.isInteger(arenaNiceDomain(0, max).step)) fractional += 1;
  }
  assert.ok(fractional <= 5, `${fractional} of 2000 whole-number maxima drew a fractional step`);
});

test('a domain with a negative end puts zero exactly on a tick', () => {
  for (const [min, max] of [[-20, 60], [-30, 0], [-100, 100], [-1, 1], [-0.5, 3]]) {
    const ticks = arenaDomainTicks(arenaNiceDomain(min, max));
    assert.ok(ticks.some((tick) => Math.abs(tick) < 1e-9), `no tick at zero for [${min}, ${max}]: ${ticks}`);
  }
});

test('a domain holds every value it was built from, on both sides of zero', () => {
  for (const [min, max] of [[-20, 60], [-30, 0], [-100, 100], [-7, 3]]) {
    const domain = arenaNiceDomain(min, max);
    assert.ok(domain.min <= min, `${domain.min} does not reach ${min}`);
    assert.ok(domain.max >= max, `${domain.max} does not reach ${max}`);
  }
});

test('the ticks are evenly spaced by the domain\'s own step', () => {
  const domain = arenaNiceDomain(-20, 60);
  const ticks = arenaDomainTicks(domain);
  for (let i = 1; i < ticks.length; i++)
    assert.ok(Math.abs((ticks[i] - ticks[i - 1]) - domain.step) < 1e-9, `interval ${i} was ${ticks[i] - ticks[i - 1]}`);
});

test('an all-negative series puts zero at the top rather than inventing a positive half', () => {

  const domain = arenaNiceDomain(-30, 0);
  assert.equal(domain.max, 0);
  assert.ok(domain.min < 0);
});

test('a domain built from nothing is still a real axis, which is what an empty chart draws', () => {

  const domain = arenaNiceDomain(0, 0);
  assert.equal(domain.min, 0);
  assert.equal(domain.max, 1);
  assert.deepEqual(arenaDomainTicks(domain), [0, 1],
    'an empty chart draws a whole-number axis rather than quartering a unit it has no data for');
});

test('one series takes the whole band, so a single-series chart draws what it always drew', () => {

  const bands = bandsAcross(4, 600);
  const sub = arenaBandSubBand(bands, 0, 1, 0, chartSeriesGap);
  assert.equal(sub.x, arenaBandMark(bands, 0), 'no gap is spent where there is nothing to separate');
  assert.equal(sub.width, bands.band);
});

test('two series split the band and each keeps the series gap out of its own width', () => {
  const bands = bandsAcross(4, 600);
  const first = arenaBandSubBand(bands, 0, 2, 0, chartSeriesGap);
  const second = arenaBandSubBand(bands, 0, 2, 1, chartSeriesGap);
  assert.equal(second.x - first.x, bands.band / 2, 'the lanes are evenly pitched across the band');
  assert.equal(first.width, bands.band / 2 - chartSeriesGap);
  assert.equal(first.width, second.width, 'neither series gets a wider bar than the other');
});

test('a grouped bar never collapses below 1px, however many series share one band', () => {
  const bands = bandsAcross(40, 600);
  for (let s = 0; s < 8; s++)
    assert.ok(arenaBandSubBand(bands, 0, 8, s, chartSeriesGap).width >= 1, `series ${s}`);
});

test('every lane stays inside the band it belongs to', () => {
  const bands = bandsAcross(4, 600);
  for (let s = 0; s < 3; s++) {
    const sub = arenaBandSubBand(bands, 2, 3, s, chartSeriesGap);
    assert.ok(sub.x >= arenaBandStart(bands, 2), `lane ${s} starts before its band`);
    assert.ok(sub.x + sub.width <= arenaBandStart(bands, 2) + bands.step + 1e-9, `lane ${s} runs past its band`);
  }
});

test('a bubble maps by AREA, so four times the value is four times the blot', () => {

  const scale = arenaRadiusScale(0, 100);
  const small = arenaRadiusAt(scale, 25);
  const large = arenaRadiusAt(scale, 100);
  const area = (r: number) => Math.PI * r * r;
  const floor = area(scale.rMin);
  assert.ok(Math.abs((area(large) - floor) / (area(small) - floor) - 4) < 1e-6,
    `four times the value drew ${((area(large) - floor) / (area(small) - floor)).toFixed(2)} times the blot`);
});

test('mapping the radius linearly instead would have exaggerated the large value fourfold', () => {

  const scale = arenaRadiusScale(0, 100);
  const byArea = arenaRadiusAt(scale, 25);
  const byRadius = scale.rMin + 0.25 * (scale.rMax - scale.rMin);
  assert.ok(byArea > byRadius,
    'a quarter of the value is MORE than a quarter of the way up the radius, which is the whole correction');
});

test('a bubble never leaves the range its two tokens name, whatever it is handed', () => {

  const scale = arenaRadiusScale(10, 90);
  for (const value of [-1000, 0, 10, 50, 90, 1000]) {
    const r = arenaRadiusAt(scale, value);
    assert.ok(r >= scale.rMin - 1e-9 && r <= scale.rMax + 1e-9, `value ${value} drew a radius of ${r}`);
  }
});

test('one size in the data draws every bubble at the largest, rather than dividing by nothing', () => {

  const scale = arenaRadiusScale(7, 7);
  assert.equal(arenaRadiusAt(scale, 7), scale.rMax);
});

test('the ends of the range land exactly on the two tokens', () => {
  const scale = arenaRadiusScale(2, 40);
  assert.ok(Math.abs(arenaRadiusAt(scale, 2) - scale.rMin) < 1e-9);
  assert.ok(Math.abs(arenaRadiusAt(scale, 40) - scale.rMax) < 1e-9);
});

test('a gauge fraction places a value on its scale and clamps the drawing at both ends', () => {
  assert.equal(arenaGaugeFraction(72, 0, 100), 0.72);
  assert.equal(arenaGaugeFraction(130, 0, 100), 1, 'above max the arc is pinned at the end');
  assert.equal(arenaGaugeFraction(-20, 0, 100), 0, 'below min the arc is pinned at the start');
  assert.equal(arenaGaugeFraction(15, 10, 20), 0.5, 'the scale starts at min, not at zero');
});

test('a gauge fraction of a non-number or of a scale with no length is zero, the empty track', () => {
  for (const value of [Number.NaN, Infinity, -Infinity]) assert.equal(arenaGaugeFraction(value, 0, 100), 0, String(value));
  assert.equal(arenaGaugeFraction(50, 100, 100), 0, 'max equal to min');
  assert.equal(arenaGaugeFraction(50, 100, 0), 0, 'max below min');
});

test('a funnel mark takes two thirds of its step', () => {
  for (const count of [1, 3, 5, 9]) {
    const bands = arenaFunnelBands(count, 8, 300);
    assert.equal(bands.count, count);
    assert.ok(Math.abs(bands.band - (bands.step * 2) / 3) < 1e-9, `at ${count} stages`);
    assert.ok(Math.abs(bands.band - 2 * (bands.step - bands.band)) < 1e-9, 'the mark is twice the gap');
  }
});

test('a funnel width is proportional through zero, so a doubled value doubles it', () => {
  const scale = arenaLinearScale(0, 400, 0, 500);
  assert.equal(arenaFunnelWidth(scale, 0), 0);
  assert.ok(Math.abs(arenaFunnelWidth(scale, 400) - 500) < 1e-9, 'the largest value fills the box');
  assert.ok(Math.abs(arenaFunnelWidth(scale, 200) * 2 - arenaFunnelWidth(scale, 400)) < 1e-9);
  assert.ok(Math.abs(arenaFunnelWidth(scale, 4) - 5) < 1e-9, 'a hundredth is not rounded to nothing');
});

test('a negative or non-finite value has width zero', () => {
  const scale = arenaLinearScale(0, 400, 0, 500);
  assert.equal(arenaFunnelWidth(scale, -30), 0);
  assert.equal(arenaFunnelWidth(scale, Number.NaN), 0);
  assert.equal(arenaFunnelWidth(scale, Number.POSITIVE_INFINITY), 0);
});

test('an all-zero funnel draws every width zero', () => {
  const scale = arenaLinearScale(0, 0, 0, 500);
  assert.equal(arenaFunnelWidth(scale, 0), 0);
  assert.equal(arenaFunnelWidth(scale, 7), 0, 'a zero span has no width to give');
});

const HEAT_DOMAINS = [{ min: 0, max: 5, step: 1 }, { min: 0, max: 10, step: 2 }, { min: -10, max: 15, step: 5 }, { min: 0, max: 2500, step: 500 }];
const DECIMAL_HEAT_DOMAINS = [
  { min: 0, max: 1, step: 0.2 }, { min: 0, max: 0.5, step: 0.1 }, { min: -0.8, max: 0.2, step: 0.2 },
  { min: 0, max: 0.05, step: 0.01 }, { min: 0, max: 17.5, step: 3.5 }, { min: 0, max: 0.7, step: 0.14 },
];

function heatSweep(domain: { min: number; max: number }): number[] {
  const out: number[] = [];
  for (let i = 0; i <= 200; i += 1) out.push(domain.min + ((domain.max - domain.min) * i) / 200);
  return out;
}

test('a heat step never decreases as the value grows', () => {
  for (const domain of HEAT_DOMAINS) {
    let previous = 0;
    for (const value of heatSweep(domain)) {
      const step = arenaHeatStep(domain, value, 5) as number;
      assert.ok(step >= previous, `step ${step} after ${previous} at ${value}`);
      previous = step;
    }
  }
});

test('the five heat bins are equal in width and every step from one to five is used', () => {
  for (const domain of HEAT_DOMAINS) {
    const width = (domain.max - domain.min) / 5;
    const seen = new Set<number>();
    for (let bin = 0; bin < 5; bin += 1) {
      const low = arenaHeatStep(domain, domain.min + bin * width + width * 0.01, 5);
      const high = arenaHeatStep(domain, domain.min + (bin + 1) * width - width * 0.01, 5);
      assert.equal(low, bin + 1, 'the inside of the bin near its lower edge');
      assert.equal(high, bin + 1, 'the inside of the bin near its upper edge');
      seen.add(low as number);
    }
    assert.equal(seen.size, 5);
  }
});

test('a value on a bin edge belongs to the higher bin, the maximum to the top and the minimum to the first', () => {
  for (const domain of HEAT_DOMAINS) {
    const width = (domain.max - domain.min) / 5;
    for (let bin = 1; bin < 5; bin += 1) assert.equal(arenaHeatStep(domain, domain.min + bin * width, 5), bin + 1);
    assert.equal(arenaHeatStep(domain, domain.max, 5), 5);
    assert.equal(arenaHeatStep(domain, domain.min, 5), 1);
  }
});

test('a heat value outside the domain clamps to the end steps, and a non-finite one has no step', () => {
  const domain = { min: 0, max: 10, step: 2 };
  assert.equal(arenaHeatStep(domain, -50, 5), 1);
  assert.equal(arenaHeatStep(domain, 50, 5), 5);
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) assert.equal(arenaHeatStep(domain, value, 5), null);
});

test('a data set of one value puts every cell in one step', () => {
  const domain = arenaHeatDomain([{ label: 'A', values: [7, 7, 7] }]);
  assert.equal(new Set([7, 7, 7].map((value) => arenaHeatStep(domain, value, 5))).size, 1);
});

test('a value on a decimal bin edge lands in the higher step and every edge is a round number', () => {
  for (const domain of DECIMAL_HEAT_DOMAINS) {
    for (let bin = 0; bin <= 5; bin += 1) {
      const edge = arenaHeatEdge(domain, bin);
      assert.equal(edge, Number(edge.toPrecision(10)), `edge ${bin} of ${JSON.stringify(domain)} carries no float noise`);
      assert.equal(arenaHeatStep(domain, edge, 5), Math.min(5, bin + 1), `edge ${bin} of ${JSON.stringify(domain)}`);
    }
    assert.equal(arenaHeatEdge(domain, 5), domain.max);
  }
  const wide = { min: 0, max: 1, step: 0.2 };
  assert.equal(arenaHeatStep(wide, 0.6, 5), 4);
  assert.equal(arenaHeatStep(wide, 0.6 - 1e-9, 5), 3);
  assert.equal(arenaHeatEdge({ min: 0, step: 0.1 }, 3), 0.3);
});
