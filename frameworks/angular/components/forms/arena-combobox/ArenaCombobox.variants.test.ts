import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaComboboxStyles } from './ArenaCombobox.variants';

test('only the root and the input vary with disabled; the field keeps its box', () => {
  const enabled = arenaComboboxStyles({ disabled: false });
  const off = arenaComboboxStyles({ disabled: true });
  for (const slot of ['label', 'field', 'caret', 'panel', 'option'] as const) {
    assert.equal(JSON.stringify(enabled.$data[slot]()), JSON.stringify(off.$data[slot]()), `${slot} must not vary with disabled`);
  }
  assert.equal(JSON.stringify(off.$data.root()), JSON.stringify({ 'data-arena-disabled': '' }));
  assert.equal(JSON.stringify(off.$data.input()), JSON.stringify({ 'data-arena-disabled': '' }));
});

test('the cursor row and the chosen row are two groups, each on its own slot', () => {
  const plain = arenaComboboxStyles({ active: false, selected: false });
  const active = arenaComboboxStyles({ active: true, selected: false });
  const chosen = arenaComboboxStyles({ active: false, selected: true });
  assert.equal(JSON.stringify(active.$data.option()), JSON.stringify({ 'data-arena-active': '' }));
  assert.equal(JSON.stringify(plain.$data.option()), JSON.stringify({}));
  assert.equal(JSON.stringify(chosen.$data.optionLabel()), JSON.stringify({ 'data-arena-selected': '' }));
  assert.equal(JSON.stringify(chosen.$data.option()), JSON.stringify({}));
});
