/* The nearest-name helpers behind unknown-property and unknown-part: a typo lands on the name it
 * missed, a stranger on nothing, and a state written into a part name lands on its part and hook. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { nearestName, unknownPart } from './names.ts';

const parts = {
  ArenaMenu: { menu: [], 'menu.item': ['data-arena-destructive', 'data-arena-active'], 'menu.label': [] },
  ArenaButton: { button: [] },
};

test('a name one slip away lands on the known name, and a stranger on none', () => {
  assert.equal(nearestName('--spacing-rwo', ['--spacing-row', '--radius-md']), '--spacing-row');
  assert.equal(nearestName('--arena-nothing', ['--spacing-row']), null);
});

test('a tie between two known names goes to the alphabetically first', () => {
  assert.equal(nearestName('ab', ['ac', 'aa']), 'aa');
});

test('a state written onto a part name lands on the part and the hook that marks it', () => {
  assert.deepEqual(unknownPart('menu.item-destructive', parts), { near: 'menu.item', hook: 'data-arena-destructive' });
});

test('a part with a suffix that is no hook names the part and no hook', () => {
  assert.deepEqual(unknownPart('menu.item-nope', parts), { near: 'menu.item', hook: null });
  assert.equal(unknownPart('menu.nope', parts).hook, null);
});

test('a misspelt part lands on the part it missed', () => {
  assert.deepEqual(unknownPart('menu.itm', parts), { near: 'menu.item', hook: null });
});
