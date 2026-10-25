import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaMultiSelectStyles } from './ArenaMultiSelect.variants';
import { arenaComboboxStyles } from '../arena-combobox/ArenaCombobox.variants';

test('the multi-select draws the combobox surface, slot for slot', () => {
  const own = arenaMultiSelectStyles();
  const shared = arenaComboboxStyles();
  for (const slot of ['root', 'field', 'chips', 'more', 'clear', 'panel', 'option'] as const) assert.equal(own[slot](), shared[slot]());
});

test('a blocked row is its own group on the row, apart from the cursor and the chosen state', () => {
  assert.equal(JSON.stringify(arenaMultiSelectStyles({ blocked: true }).$data.option()), JSON.stringify({ 'data-arena-blocked': '' }));
  assert.equal(JSON.stringify(arenaMultiSelectStyles({ blocked: false }).$data.option()), JSON.stringify({}));
});
