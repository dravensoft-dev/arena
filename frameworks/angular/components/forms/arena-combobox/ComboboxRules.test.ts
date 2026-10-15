/* The rules both list controls follow, read through the paired module each layer imports: which rows a
 * typed text keeps, where the cursor opens and stops, what committing an emptied field does, how a set
 * grows and stops at its cap, how many chips are drawn, and where focus goes between chips. The other
 * layer's copy carries the same file, and check:shared-arithmetic keeps the bodies equal. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  arenaActiveOptionId, arenaAtCap, arenaChipAfterRemoval, arenaChipWindow, arenaCommitText, arenaFilterOptions,
  arenaLabelOf, arenaOpeningOption, arenaOptionId, arenaStepChip, arenaStepOption, arenaToggleValue, arenaUniqueValues,
} from './ComboboxRules';

const REGIONS = [
  { value: 'eu-west', label: 'Europe West' },
  { value: 'eu-north', label: 'Europe North' },
  { value: 'us-east', label: 'US East' },
];

test('the filter keeps every row whose label holds the text, whatever its case, in the given order', () => {
  assert.deepEqual(arenaFilterOptions(REGIONS, 'EUROPE').map((row) => row.value), ['eu-west', 'eu-north']);
  assert.deepEqual(arenaFilterOptions(REGIONS, 'st').map((row) => row.value), ['eu-west', 'us-east']);
  assert.deepEqual(arenaFilterOptions(REGIONS, 'mars'), []);
});

test('the filter does not trim: a lone space keeps the labels that hold a space and drops the rest', () => {
  const rows = [...REGIONS, { value: 'mars', label: 'Mars' }];
  assert.deepEqual(arenaFilterOptions(rows, ' ').map((row) => row.value), ['eu-west', 'eu-north', 'us-east']);
  assert.deepEqual(arenaFilterOptions(rows, 'mars '), []);
});

test('the filter reads the label and never the value', () => {
  assert.deepEqual(arenaFilterOptions(REGIONS, 'eu-'), []);
});

test('an empty text keeps every row, as a copy', () => {
  const kept = arenaFilterOptions(REGIONS, '');
  assert.deepEqual(kept, REGIONS);
  assert.notEqual(kept, REGIONS);
});

test('a row id is the control id and the index, and the active id exists only in range', () => {
  assert.equal(arenaOptionId('cb-1', 2), 'cb-1-option-2');
  assert.equal(arenaActiveOptionId('cb-1', 0, 3), 'cb-1-option-0');
  assert.equal(arenaActiveOptionId('cb-1', -1, 3), undefined);
  assert.equal(arenaActiveOptionId('cb-1', 3, 3), undefined);
});

test('the field shows the chosen label, and nothing for a value no option holds', () => {
  assert.equal(arenaLabelOf(REGIONS, 'us-east'), 'US East');
  assert.equal(arenaLabelOf(REGIONS, 'mars'), '');
  assert.equal(arenaLabelOf(REGIONS, undefined), '');
});

test('the list opens on the first chosen row, on the first row when none is chosen, and on nothing when empty', () => {
  assert.equal(arenaOpeningOption(REGIONS, ['eu-north']), 1);
  assert.equal(arenaOpeningOption(REGIONS, ['us-east', 'eu-west']), 0);
  assert.equal(arenaOpeningOption(REGIONS, []), 0);
  assert.equal(arenaOpeningOption([], ['eu-west']), -1);
});

test('the arrows move the cursor and stop at both ends', () => {
  assert.equal(arenaStepOption(0, 'ArrowDown', 3), 1);
  assert.equal(arenaStepOption(2, 'ArrowDown', 3), 2);
  assert.equal(arenaStepOption(1, 'ArrowUp', 3), 0);
  assert.equal(arenaStepOption(0, 'ArrowUp', 3), 0);
});

test('a cursor on no row lands on the first, and an empty list holds no cursor', () => {
  assert.equal(arenaStepOption(-1, 'ArrowDown', 3), 0);
  assert.equal(arenaStepOption(-1, 'ArrowUp', 3), 0);
  assert.equal(arenaStepOption(5, 'ArrowUp', 3), 0);
  assert.equal(arenaStepOption(0, 'ArrowDown', 0), -1);
});

test('an emptied field clears an optional value, restores a required one, and restores any text left in it', () => {
  assert.equal(arenaCommitText('', 'eu-west', false), 'clear');
  assert.equal(arenaCommitText('   ', 'eu-west', false), 'clear');
  assert.equal(arenaCommitText('', 'eu-west', true), 'restore');
  assert.equal(arenaCommitText('Eur', 'eu-west', false), 'restore');
});

test('an emptied field with nothing chosen has nothing to clear', () => {
  assert.equal(arenaCommitText('', '', false), 'restore');
  assert.equal(arenaCommitText('', undefined, false), 'restore');
});

test('choosing appends in the order chosen, choosing again removes, and the cap blocks only an addition', () => {
  assert.deepEqual(arenaToggleValue(['us-east'], 'eu-west', undefined), ['us-east', 'eu-west']);
  assert.deepEqual(arenaToggleValue(['us-east', 'eu-west'], 'us-east', 2), ['eu-west']);
  assert.equal(arenaToggleValue(['us-east', 'eu-west'], 'eu-north', 2), null);
  assert.equal(arenaAtCap(['a', 'b'], 2), true);
  assert.equal(arenaAtCap(['a'], 2), false);
  assert.equal(arenaAtCap(['a', 'b', 'c'], undefined), false);
});

test('choosing never changes the set handed in', () => {
  const values = ['us-east'];
  const next = arenaToggleValue(values, 'eu-west', undefined);
  assert.deepEqual(values, ['us-east'], 'the set handed in is never changed in place');
  assert.deepEqual(next, ['us-east', 'eu-west']);
});

test('a value held twice is held once, at the place it first stood, and the set handed in is left alone', () => {
  const values = ['eu', 'us', 'eu', 'ap', 'us'];
  assert.deepEqual(arenaUniqueValues(values), ['eu', 'us', 'ap']);
  assert.deepEqual(values, ['eu', 'us', 'eu', 'ap', 'us']);
  assert.deepEqual(arenaUniqueValues([]), []);
});

test('chips past maxVisible collapse into a count, and an absent cap draws them all', () => {
  assert.deepEqual(arenaChipWindow(['a', 'b', 'c'], 2), { shown: ['a', 'b'], hidden: 1 });
  assert.deepEqual(arenaChipWindow(['a', 'b'], 2), { shown: ['a', 'b'], hidden: 0 });
  assert.deepEqual(arenaChipWindow(['a', 'b', 'c'], undefined), { shown: ['a', 'b', 'c'], hidden: 0 });
  assert.deepEqual(arenaChipWindow(['a', 'b'], 0), { shown: [], hidden: 2 });
});

test('a negative maxVisible collapses nothing, as an absent one does', () => {
  assert.deepEqual(arenaChipWindow(['a', 'b'], -1), { shown: ['a', 'b'], hidden: 0 });
});

test('the chip arrows stop at the first chip and leave the last one for the field', () => {
  assert.equal(arenaStepChip(1, 'ArrowLeft', 3), 0);
  assert.equal(arenaStepChip(0, 'ArrowLeft', 3), 0);
  assert.equal(arenaStepChip(0, 'ArrowRight', 3), 1);
  assert.equal(arenaStepChip(2, 'ArrowRight', 3), -1);
  assert.equal(arenaStepChip(0, 'ArrowLeft', 0), -1);
});

test('a chip cursor on no chip or past the last one steps from where it stands', () => {
  assert.equal(arenaStepChip(-1, 'ArrowRight', 3), 0);
  assert.equal(arenaStepChip(-1, 'ArrowLeft', 3), 0);
  assert.equal(arenaStepChip(3, 'ArrowRight', 3), -1);
});

test('removing a chip hands focus to the one after it, the one before it at the end, and the field when none is left', () => {
  assert.equal(arenaChipAfterRemoval(0, 3), 0);
  assert.equal(arenaChipAfterRemoval(1, 3), 1);
  assert.equal(arenaChipAfterRemoval(2, 3), 1);
  assert.equal(arenaChipAfterRemoval(0, 1), -1);
});
