/* The standing a meter draws, held as one table both layers run. The regions follow the HTML
 * meter algorithm with one recorded departure: a region holds its lower edge, so a value equal to
 * high is in the high region where HTML reads it as the middle. A high edge on max opens no region,
 * so a full meter stays in the middle as HTML reads it. The optimum's region follows the same rule,
 * so an optimum on an edge belongs to the region above it and a value at the optimum reads good. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  arenaMeterRange, arenaMeterReadout, arenaMeterShare, arenaMeterStanding, arenaMeterValue, arenaMeterValueText, arenaMeterWord,
} from './MeterStanding.ts';

type Row = [label: string, value: number, low: number | undefined, high: number | undefined, optimum: number | undefined, standing: string];

const STANDINGS: Row[] = [
  ['no threshold given', 40, undefined, undefined, undefined, 'none'],
  ['lower is better, value in the low region', 30, 50, 80, 0, 'optimum'],
  ['lower is better, value in the middle', 72, 50, 80, 0, 'fair'],
  ['lower is better, value in the high region', 91, 50, 80, 0, 'poor'],
  ['higher is better, value in the high region', 91, 50, 80, 100, 'optimum'],
  ['higher is better, value in the low region', 10, 50, 80, 100, 'poor'],
  ['middle is best, value in the middle', 60, 50, 80, 65, 'optimum'],
  ['middle is best, value in the low region', 10, 50, 80, 65, 'fair'],
  ['middle is best, value in the high region', 95, 50, 80, 65, 'fair'],
  ['a value equal to low opens the middle', 50, 50, 80, 0, 'fair'],
  ['a value equal to high is in the high region, the recorded departure', 80, 50, 80, 0, 'poor'],
  ['an optimum on the low edge makes the middle good', 60, 50, 80, 50, 'optimum'],
  ['an optimum on the low edge, a value at it', 50, 50, 80, 50, 'optimum'],
  ['an optimum on the high edge makes the high region good', 60, 50, 80, 80, 'fair'],
  ['an optimum on the high edge, a value at it', 80, 50, 80, 80, 'optimum'],
  ['an optimum on the high edge, a value just under it', 79, 50, 80, 80, 'fair'],
  ['low, high, optimum and value on one number', 60, 60, 60, 60, 'optimum'],
  ['only optimum given, on max: the middle is the whole range, so a value in it is good', 30, undefined, undefined, 100, 'optimum'],
  ['a high edge on max opens no region, so a full meter stays in the middle', 100, undefined, undefined, 100, 'optimum'],
  ['a high edge below max opens the high region at that edge', 100, 50, 99, 100, 'optimum'],
  ['only optimum given, at the midpoint', 30, undefined, undefined, 50, 'optimum'],
  ['only low given: the optimum is the midpoint, inside the middle', 70, 50, undefined, undefined, 'optimum'],
  ['high below low reads as low, so the middle is empty', 75, 70, 40, 0, 'poor'],
  ['high below low reads as low, and a value under it is still low', 60, 70, 40, 0, 'optimum'],
  ['a value out of range is clamped before its region is read', 400, 50, 80, 0, 'poor'],
  ['a value that is not a number reads as min', Number.NaN, 50, 80, 0, 'optimum'],
];

for (const [label, value, low, high, optimum, standing] of STANDINGS) {
  test(`standing: ${label}`, () => {
    assert.equal(arenaMeterStanding(value, arenaMeterRange(0, 100, low, high, optimum)), standing);
  });
}

test('the range never inverts, and a threshold outside it is clamped in', () => {
  const inverted = arenaMeterRange(50, 10);
  assert.equal(inverted.min, 50);
  assert.equal(inverted.max, 50, 'max below min reads as min');
  const outside = arenaMeterRange(0, 100, -20, 140, 300);
  assert.deepEqual([outside.low, outside.high, outside.optimum], [0, 100, 100]);
  const loose = arenaMeterRange(Number.NaN, Number.POSITIVE_INFINITY);
  assert.deepEqual([loose.min, loose.max], [0, 100], 'a bound that is not a finite number reads as its default');
  assert.equal(arenaMeterRange(0, 100, Number.NaN).thresholds, false, 'a threshold that is not a number is no threshold');
});

test('the drawing and aria-valuenow clamp, and the readout shows the number as passed', () => {
  const range = arenaMeterRange(0, 100);
  assert.equal(arenaMeterValue(143, range), 100);
  assert.equal(arenaMeterValue(-8, range), 0);
  assert.equal(arenaMeterValue(Number.NaN, range), 0);
  assert.equal(arenaMeterShare(143, range), 100);
  assert.equal(arenaMeterShare(25, arenaMeterRange(0, 200)), 12.5);
  assert.equal(arenaMeterShare(5, arenaMeterRange(5, 5)), 0, 'an empty range draws an empty fill');
  assert.equal(arenaMeterReadout(143, range), '143');
  assert.equal(arenaMeterReadout(Number.NaN, range), '0');
  assert.equal(arenaMeterReadout(72, range, '72 of 100 GB'), '72 of 100 GB');
  assert.equal(arenaMeterReadout(72, range, '  '), '72', 'a blank reading is no reading');
});

test('the standing word comes from the locale, and aria-valuetext is the readout and the word', () => {
  const words = { meterOptimum: 'Good', meterFair: 'Fair', meterPoor: 'Poor' };
  assert.deepEqual((['optimum', 'fair', 'poor', 'none'] as const).map((one) => arenaMeterWord(one, words)), ['Good', 'Fair', 'Poor', undefined]);
  assert.equal(arenaMeterValueText('72 of 100 GB', 'Fair'), '72 of 100 GB, Fair');
  assert.equal(arenaMeterValueText('64', undefined), '64');
});
