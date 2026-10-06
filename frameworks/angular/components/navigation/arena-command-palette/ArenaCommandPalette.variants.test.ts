import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaCommandPaletteStyles } from './ArenaCommandPalette.variants';

function tokens(classString: string): string[] {
  return classString.split(/\s+/).filter(Boolean);
}

test('a resting row carries no danger classes -- an active command row is a selection state, not a risk indicator', () => {
  const row = tokens(arenaCommandPaletteStyles().row());
  assert.ok(!row.some((cls) => cls.includes('error') || cls.includes('danger')));
});

test('active is a group on the row and its label', () => {
  const on = arenaCommandPaletteStyles({ active: true });
  const off = arenaCommandPaletteStyles({ active: false });
  assert.notEqual(on.row(), off.row());
  assert.notEqual(on.rowLabel(), off.rowLabel());
});
