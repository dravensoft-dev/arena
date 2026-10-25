/* The edits a pin input's cells make to one code, authored once per layer and compared by
 * check:shared-arithmetic. The code never holds a gap: an emptied cell closes up, so the string a
 * host reads and the cells a person sees are always the same thing. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  arenaPinBackspace, arenaPinCode, arenaPinCompletes, arenaPinDelete, arenaPinInputMode, arenaPinInsert, arenaPinKey,
  arenaPinLength, arenaPinMoveTo, arenaPinPattern, arenaPinTabStop, arenaPinTyped,
} from './PinRules';

test('a length that is not a whole number of at least one reads as six', () => {
  assert.deepEqual([4, 1, 0, -2, 2.5, Number.NaN, undefined].map((n) => arenaPinLength(n)), [4, 1, 6, 6, 6, 6, 6]);
});

test('numeric keeps digits and alphanumeric keeps Latin letters and digits as typed', () => {
  assert.equal(arenaPinCode('4a8-2 9', 6, 'numeric'), '4829');
  assert.equal(arenaPinCode('Ab-9z!x', 6, 'alphanumeric'), 'Ab9zx');
  assert.equal(arenaPinCode('1234567', 4, 'numeric'), '1234');
  assert.equal(arenaPinCode(undefined, 4, 'numeric'), '');
});

test('the keypad and the pattern follow the characters', () => {
  assert.deepEqual([arenaPinInputMode('numeric'), arenaPinPattern('numeric')], ['numeric', '[0-9]*']);
  assert.deepEqual([arenaPinInputMode('alphanumeric'), arenaPinPattern('alphanumeric')], ['text', undefined]);
});

test('the tab stop is the first empty cell, or the last when the code is full', () => {
  assert.deepEqual([arenaPinTabStop('', 6), arenaPinTabStop('48', 6), arenaPinTabStop('482913', 6)], [0, 2, 5]);
});

test('a typed character fills its cell and moves on, and one typed past the end lands at the end', () => {
  assert.deepEqual(arenaPinInsert('48', 2, '2', 6, 'numeric'), { code: '482', cell: 3 });
  assert.deepEqual(arenaPinInsert('48', 5, '2', 6, 'numeric'), { code: '482', cell: 3 });
  assert.deepEqual(arenaPinInsert('482913', 1, '0', 6, 'numeric'), { code: '402913', cell: 2 });
  assert.deepEqual(arenaPinInsert('48291', 5, '3', 6, 'numeric'), { code: '482913', cell: 5 });
});

test('a refused character changes nothing and leaves focus where it was', () => {
  assert.deepEqual(arenaPinInsert('48', 2, 'x', 6, 'numeric'), { code: '48', cell: 2 });
});

test('a paste as long as the code fills from the first cell wherever it lands, a shorter one from the focused cell', () => {
  assert.deepEqual(arenaPinInsert('48', 4, '12-34-56', 6, 'numeric'), { code: '123456', cell: 5 });
  assert.deepEqual(arenaPinInsert('', 0, '1234567', 6, 'numeric'), { code: '123456', cell: 5 });
  assert.deepEqual(arenaPinInsert('482913', 2, '07', 6, 'numeric'), { code: '480713', cell: 4 });
  assert.deepEqual(arenaPinInsert('4829', 4, '7777', 6, 'numeric'), { code: '482977', cell: 5 });
});

test('a cell holding a character reads only the new one a keystroke adds beside it', () => {
  assert.deepEqual([arenaPinTyped('4', '47'), arenaPinTyped('4', '74'), arenaPinTyped('4', '44'), arenaPinTyped('', '7'), arenaPinTyped('4', '123456')],
    ['7', '7', '4', '7', '123456']);
});

test('Backspace empties a filled cell and stays, and on an empty cell empties the one before and steps back', () => {
  assert.deepEqual(arenaPinBackspace('482913', 5), { code: '48291', cell: 5 });
  assert.deepEqual(arenaPinBackspace('482', 3), { code: '48', cell: 2 });
  assert.deepEqual(arenaPinBackspace('482', 1), { code: '42', cell: 1 });
  assert.deepEqual(arenaPinBackspace('', 0), { code: '', cell: 0 });
});

test('Delete empties the cell and stays, and the later characters close up', () => {
  assert.deepEqual(arenaPinDelete('482913', 2), { code: '48913', cell: 2 });
  assert.deepEqual(arenaPinDelete('48', 4), { code: '48', cell: 4 });
});

test('the arrows, Home and End move without wrapping, and right to left swaps Left and Right', () => {
  assert.deepEqual(['ArrowLeft', 'ArrowRight', 'Home', 'End', 'a'].map((key) => arenaPinKey(key, false)), ['previous', 'next', 'first', 'last', null]);
  assert.deepEqual(['ArrowLeft', 'ArrowRight'].map((key) => arenaPinKey(key, true)), ['next', 'previous']);
  assert.deepEqual([arenaPinMoveTo(0, 'previous', 6), arenaPinMoveTo(5, 'next', 6), arenaPinMoveTo(3, 'first', 6), arenaPinMoveTo(1, 'last', 6)], [0, 5, 0, 5]);
});

test('a code completes only on the edit that fills its last cell', () => {
  assert.deepEqual([arenaPinCompletes('48291', '482913', 6), arenaPinCompletes('482913', '402913', 6), arenaPinCompletes('4829', '48291', 6)], [true, false, false]);
});

test('a paste that replaces a full code completes again, and a typed character over a full code does not', () => {
  assert.deepEqual([arenaPinCompletes('482913', '111111', 6, 6), arenaPinCompletes('482913', '482917', 6, 1), arenaPinCompletes('482913', '4829', 6, 2)], [true, false, false]);
});
