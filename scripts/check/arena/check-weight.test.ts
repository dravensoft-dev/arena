// check-weight: the budget table's shape and the one-line patch; the measuring is weight-measure.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BUDGETS, CEILINGS, PAINTED_FACES, assertChanged, assertStartInputs, oneLine } from './check-weight.ts';

test('every budget states the start commit and its multiplier, and each ceiling sits at or over its budget', () => {
  for (const { figure, reason } of BUDGETS) {
    assert.match(reason, /c543cd66/, `${figure} does not name the start commit`);
    assert.match(reason, /start × 1\.05/, `${figure} does not state the multiplier`);
  }
  for (const { figure, kb } of CEILINGS) {
    const budget = BUDGETS.find((b) => b.figure === figure);
    assert.ok(budget, `${figure} has a ceiling and no budget`);
    assert.ok(kb >= budget.kb, `${figure}: the ceiling ${kb} is under its budget ${budget.kb}`);
  }
  assert.equal(new Set(BUDGETS.map((b) => b.figure)).size, BUDGETS.length);
});

test('a one-line patch changes only its file, and says so when its line is not there', () => {
  const one = oneLine('a.js', 'x = 1', 'x = 2');
  assert.equal(one.patch('b.js', 'x = 1'), 'x = 1');
  assert.throws(() => one.applied(), /found nothing to change in a\.js/);
  assert.equal(one.patch('a.js', 'let x = 1;'), 'let x = 2;');
  assert.doesNotThrow(() => one.applied());
});

test('the fixture must reproduce the start\'s sprite and cut weights, or the gate stops', () => {
  const glyphs = [...Array.from({ length: 17 }, (_, i) => `ph-bold-b${i}`), ...Array.from({ length: 6 }, (_, i) => `ph-fill-f${i}`)];
  assert.doesNotThrow(() => assertStartInputs({ glyphs, faces: PAINTED_FACES }));
  assert.throws(() => assertStartInputs({ glyphs: glyphs.slice(1), faces: PAINTED_FACES }), /16 bold and 6 fill/);
  assert.throws(() => assertStartInputs({ glyphs, faces: PAINTED_FACES.slice(1) }), /cut fonts carry/);
});

test('the start\'s sprite and cut weights are lower bounds: a fixture that grows keeps measuring, and the budgets hold the growth', () => {
  const glyphs = [...Array.from({ length: 18 }, (_, i) => `ph-bold-b${i}`), ...Array.from({ length: 7 }, (_, i) => `ph-fill-f${i}`), 'ph-regular-bell'];
  assert.doesNotThrow(() => assertStartInputs({ glyphs, faces: [...PAINTED_FACES, 'Archivo 400'] }));
});

test('a release patch that changed nothing is an error, not a zero', () => {
  assert.doesNotThrow(() => assertChanged(new Uint8Array([1]), new Uint8Array([2]), 'app chunk'));
  assert.throws(() => assertChanged(new Uint8Array([1]), new Uint8Array([1]), 'app chunk'), /release patch left the app chunk unchanged/);
});
