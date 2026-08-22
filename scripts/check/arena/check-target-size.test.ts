import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INTERACTIVE, PHONE, SCOPES, UNSIZED, measureExpression, staleUnsizedProblems, undersized,
  zeroMeasuredProblems, ARGUED, arguedProblems, dimensionAt,
} from './check-target-size.ts';

const at = (over: Partial<Parameters<typeof undersized>[0][number]> = {}) => ({
  layer: 'react', scope: 'comfortable', part: 'x.y', tag: 'button', role: '',
  width: 44, height: 44, exempt: '', ...over,
});

test('a target past its floor passes and one under it fails, on either axis', () => {
  assert.deepEqual(undersized([at()]), []);
  assert.equal(undersized([at({ height: 43.9 })]).length, 1);
  assert.equal(undersized([at({ width: 43.9 })]).length, 1);
  assert.match(undersized([at({ width: 16, height: 16 })])[0] ?? '', /16x16 activation target/);
});

test('each scope is measured against its own floor', () => {
  assert.deepEqual(undersized([at({ scope: 'base', width: 30, height: 30 })]), [],
    'the base density owes the minimum level and not the enhanced one');
  assert.equal(undersized([at({ scope: 'comfortable', width: 30, height: 30 })]).length, 1);
  assert.deepEqual(SCOPES.map((s) => s.floor), [24, 44]);
});

test('one line per part per scope, naming the smallest instance and how many there were', () => {
  const problems = undersized([
    at({ width: 20, height: 20 }), at({ width: 16, height: 16 }), at({ width: 30, height: 30 }),
  ]);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /16x16/);
  assert.match(problems[0] ?? '', /3 instance\(s\), the smallest shown/);
});

test('a recorded exception is not a failure, and one nothing matched is', () => {
  const recorded = new Map([['x.y', 'on the record']]);
  assert.deepEqual(undersized([at({ width: 10, height: 10 })], SCOPES, recorded), []);
  assert.deepEqual(staleUnsizedProblems([at({ part: 'x.y' })], recorded), []);
  const stale = staleUnsizedProblems([at({ part: 'other' })], recorded);
  assert.equal(stale.length, 1);
  assert.match(stale[0] ?? '', /outlived what it excused/);
});

test('a sweep measuring nothing, or rendering one scope, is a failure rather than a clean pass', () => {
  assert.deepEqual(zeroMeasuredProblems(1, 2), []);
  assert.match(zeroMeasuredProblems(0, 2)[0] ?? '', /failure rather than a clean pass/);
  assert.match(zeroMeasuredProblems(1, 1)[0] ?? '', /the second is the whole point/);
});

test('the sweep is phone-shaped and touch-emulating, because that is who the floor is for', () => {
  assert.equal(PHONE.mobile, true);
  assert.ok(PHONE.width <= 430, 'a viewport wider than a phone measures a layout no thumb meets');
});

test('the page script measures only what carries an Arena part, and unions a pseudo hit area', () => {
  const expression = measureExpression(INTERACTIVE, 'arena-comfortable');
  assert.match(expression, /data-arena-part/);
  assert.match(expression, /if \(!named\) continue;/);
  assert.match(expression, /'::before', '::after'/);
  assert.match(expression, /classList\.add\("arena-comfortable"\)/);
  assert.match(expression, /classList\.remove/);
});

test('the one exception on the record is a geometry rather than a control that was left small', () => {
  assert.equal(UNSIZED.size, 1);
  const why = UNSIZED.get('calendar.cell') ?? '';
  assert.match(why, /seventh of the width/);
  assert.match(why, /308px/, 'the reason carries the measurement that produced it');
});

const tied = (over = {}) => new Map(
  [...ARGUED].map(([name, one]) => [name, { ...one, ...over }] as const),
);

test('the tie to a token file holds on this tree, so the floor and the density say one thing', () => {
  assert.equal(ARGUED.size, 1);
  const one = ARGUED.get('comfortable');
  assert.ok(one, 'the enhanced floor is the one a token file argues about');
  assert.equal(one?.floor, SCOPES.find((s) => s.name === 'comfortable')?.floor,
    'the entry records the floor it was written against, or it cannot report that one moved');
  assert.deepEqual(arguedProblems(), [], 'and the tree holds to it today');
});

test('a token below the floor fails, which is the whole reason the tie is written down', () => {
  const low = () => ({ dz: { 'ctl-h-sm': { $value: { value: 40, unit: 'px' } } } });
  const problems = arguedProblems(SCOPES, ARGUED, low);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /sets dz\.ctl-h-sm to 40px and comfortable's floor is 44px/);
});

test('a floor that moves out from under the entry fails it', () => {
  const moved = SCOPES.map((s) => (s.name === 'comfortable' ? { ...s, floor: 48 } : s));
  const problems = arguedProblems(moved);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /records comfortable's floor as 44px and SCOPES now draws it at 48px/);
});

test('an entry naming a scope, a file or a token that is gone fails rather than passing quietly', () => {
  assert.match(arguedProblems(SCOPES, new Map([['cosy', ARGUED.get('comfortable')!]]))[0] ?? '',
    /SCOPES holds none/);
  assert.match(arguedProblems(SCOPES, ARGUED, () => null)[0] ?? '', /that file is not there/);
  assert.match(arguedProblems(SCOPES, tied({ token: 'dz.nope' }))[0] ?? '', /not a px dimension/);
});

test('dimensionAt reads a px dimension and refuses anything else', () => {
  const json = { dz: { a: { $value: { value: 44, unit: 'px' } }, b: { $value: { value: 2, unit: 'rem' } } } };
  assert.equal(dimensionAt(json, 'dz.a'), 44);
  assert.equal(dimensionAt(json, 'dz.b'), null, 'a rem is not the unit the floor is compared in');
  assert.equal(dimensionAt(json, 'dz.missing'), null);
  assert.equal(dimensionAt(json, 'nope.a'), null);
});
