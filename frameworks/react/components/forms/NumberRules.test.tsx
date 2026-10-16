/* The arithmetic both a number field and a slider commit through, read through the paired module both
 * layers import. A layer that disagreed here would commit a different number from the same key press,
 * so every case names the boundary it pins: the decimals of a step, a clamp, the parse a locale writes,
 * an inverted range, a step that does not divide it and two thumbs that never cross. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaValueWriter } from '../../DataVisuals.ts';
import {
  arenaCanonicalNumber, arenaClampNumber, arenaDecimalsOf, arenaDraftText, arenaFieldFormat, arenaFractionAt,
  arenaNearestThumb, arenaNumberBaseline, arenaNumberFieldIds, arenaNumberKey, arenaNumberSeparators, arenaParseNumber,
  arenaSliderBounds, arenaSliderFraction, arenaSliderKey, arenaSliderMove, arenaSliderPair, arenaSnapToStep,
  arenaStepNumber, arenaValueAtFraction,
} from './NumberRules.ts';

const range = (min: number, max: number, step = 1) => arenaSliderBounds(min, max, step);

test('a step lands on the decimals of the step and the minimum, so 0.1 and 0.2 never sum to a long tail', () => {
  assert.equal(arenaStepNumber(0.1, 1, 0.1, undefined, undefined), 0.2);
  assert.equal(arenaStepNumber(0.2, 1, 0.1, undefined, undefined), 0.3);
  assert.equal(arenaStepNumber(1.05, -1, 0.01, 0, undefined), 1.04);
  assert.equal(arenaStepNumber(0, 10, 0.5, 0.25, undefined), 5);
  assert.equal(arenaDecimalsOf(1e-7), 7);
  assert.equal(arenaDecimalsOf(undefined), 0);
});

test('a step that is not a positive number reads as one, and a commit is clamped to the bounds', () => {
  assert.equal(arenaStepNumber(3, 1, -2, undefined, undefined), 4);
  assert.equal(arenaStepNumber(3, 1, 0, undefined, undefined), 4);
  assert.equal(arenaStepNumber(99, 10, 1, 1, 100), 100);
  assert.equal(arenaStepNumber(2, -10, 1, 1, 100), 1);
  assert.equal(arenaClampNumber(500, 1, 100), 100);
  assert.equal(arenaClampNumber(-5, 1, undefined), 1);
});

test('an empty field starts from the minimum, or from zero held inside the bounds', () => {
  assert.equal(arenaNumberBaseline(5, 10), 5);
  assert.equal(arenaNumberBaseline(undefined, undefined), 0);
  assert.equal(arenaNumberBaseline(undefined, -3), -3);
});

test('the keys a field answers map to one step, ten steps or a bound, and the rest to nothing', () => {
  assert.deepEqual(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', 'Enter'].map(arenaNumberKey),
    [1, -1, 10, -10, 'home', 'end', null]);
});

test('the control id is nf- and the slugged label unless one is given, with its label and note beside it', () => {
  assert.deepEqual(arenaNumberFieldIds(undefined, 'Max  Replicas'), { control: 'nf-max-replicas', label: 'nf-max-replicas-label', note: 'nf-max-replicas-note' });
  assert.equal(arenaNumberFieldIds('own', 'Replicas').control, 'own');
});

test('a field writes in the locale it is given unless the format names one, and never compactly', () => {
  assert.deepEqual(arenaFieldFormat(undefined, 'en-GB'), { locale: 'en-GB', compact: false });
  assert.deepEqual(arenaFieldFormat({ locale: 'de-DE', compact: true, fractionDigits: 2 }, 'en-GB'),
    { locale: 'de-DE', compact: false, fractionDigits: 2 });
});

test('a de-DE and an en-GB number survive the round trip from the written text back to the number', () => {
  for (const locale of ['de-DE', 'en-GB']) {
    const separators = arenaNumberSeparators(locale);
    const write = arenaValueWriter({ format: arenaFieldFormat({ fractionDigits: 2 }, locale) });
    for (const value of [1234.5, -0.25, 1000000]) {
      assert.equal(arenaParseNumber(write(value), separators), value, `${locale} ${write(value)}`);
      assert.equal(arenaParseNumber(arenaDraftText(value, separators), separators), value);
    }
  }
  assert.equal(arenaDraftText(1234.5, arenaNumberSeparators('de-DE')), '1234,5');
});

test('an empty draft is no number, and a draft that is not a number is NaN', () => {
  const separators = arenaNumberSeparators('en-GB');
  assert.equal(arenaParseNumber('  ', separators), undefined);
  assert.ok(Number.isNaN(arenaParseNumber('-', separators) as number));
  assert.ok(Number.isNaN(arenaParseNumber('12abc', separators) as number));
  assert.equal(arenaParseNumber('1.', separators), 1);
  assert.deepEqual(arenaNumberSeparators('not a tag!'), { decimal: '.', group: '', minus: '-', digits: [...'0123456789'] });
});

test('a locale that writes its own digits is read back from the digits it writes', () => {
  const separators = arenaNumberSeparators('ar-EG');
  const write = arenaValueWriter({ format: arenaFieldFormat({ fractionDigits: 1 }, 'ar-EG') });
  assert.equal(arenaParseNumber(write(1234.5), separators), 1234.5);
  assert.equal(arenaParseNumber('\u0661\u0662\u0663', separators), 123);
  assert.equal(arenaParseNumber('123', separators), 123);
});

test('a step from a number off the step grid keeps that number\'s decimals, so a step and its reverse return', () => {
  assert.equal(arenaStepNumber(1.55, 1, 1, undefined, undefined), 2.55);
  assert.equal(arenaStepNumber(2.55, -1, 1, undefined, undefined), 1.55);
});

test('the submitted value is the plain decimal string, and empty when the field is empty', () => {
  assert.equal(arenaCanonicalNumber(1234.5), '1234.5');
  assert.equal(arenaCanonicalNumber(undefined), '');
});

test('an inverted range reads as 0 to 100, and a step that does not divide the range tops out below the maximum', () => {
  assert.deepEqual(range(10, 10), { min: 0, max: 100, step: 1, last: 100 });
  assert.deepEqual(range(0, 10, 3), { min: 0, max: 10, step: 3, last: 9 });
  assert.equal(arenaSnapToStep(10, range(0, 10, 3)), 9);
  assert.equal(arenaSnapToStep(4.4, range(0, 10, 3)), 3);
  assert.equal(arenaSnapToStep(0.35, range(0, 1, 0.1)), 0.4);
});

test('a value outside the bounds is drawn at the nearest bound, and the fraction never leaves 0 to 1', () => {
  assert.equal(arenaSnapToStep(-40, range(0, 100)), 0);
  assert.equal(arenaSnapToStep(400, range(0, 100)), 100);
  assert.equal(arenaSliderFraction(400, range(0, 100)), 1);
  assert.equal(arenaSliderFraction(25, range(0, 100)), 0.25);
  assert.equal(arenaValueAtFraction(0.333, range(0, 100, 5)), 35);
});

test('two thumbs never cross: the start gives way to the end, and a move stops against the other thumb', () => {
  assert.deepEqual(arenaSliderPair(80, 20, range(0, 100)), { start: 20, end: 20 });
  assert.equal(arenaSliderMove(20, 10, range(0, 100), 0, 25), 25);
  assert.equal(arenaSliderMove(60, -1, range(0, 100), 60, 100), 60);
  assert.equal(arenaNearestThumb(10, { start: 30, end: 30 }), 'start');
  assert.equal(arenaNearestThumb(50, { start: 30, end: 30 }), 'end');
  assert.equal(arenaNearestThumb(35, { start: 30, end: 80 }), 'start');
});

test('a position along the track reads from the start edge, or from the far edge when the axis runs backwards', () => {
  assert.equal(arenaFractionAt(150, 100, 200, false), 0.25);
  assert.equal(arenaFractionAt(150, 100, 200, true), 0.75);
  assert.equal(arenaFractionAt(-10, 0, 200, false), 0);
});

test('Right and Left swap only on a mirrored axis, and Up, Down and the page keys never do', () => {
  assert.deepEqual(['ArrowRight', 'ArrowLeft', 'ArrowUp', 'PageDown'].map((key) => arenaSliderKey(key, false)), [1, -1, 1, -10]);
  assert.deepEqual(['ArrowRight', 'ArrowLeft', 'ArrowUp', 'PageDown'].map((key) => arenaSliderKey(key, true)), [-1, 1, 1, -10]);
});
