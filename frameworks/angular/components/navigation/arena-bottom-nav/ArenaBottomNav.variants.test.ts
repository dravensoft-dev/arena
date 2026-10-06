import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaBottomNavStyles } from './ArenaBottomNav.variants';

function tokens(classString: string): string[] {
  return classString.split(/\s+/).filter(Boolean);
}


test('current is a group on the item', () => {
  assert.notEqual(JSON.stringify(arenaBottomNavStyles({ current: true }).$data.item()), JSON.stringify(arenaBottomNavStyles({ current: false }).$data.item()));
});
