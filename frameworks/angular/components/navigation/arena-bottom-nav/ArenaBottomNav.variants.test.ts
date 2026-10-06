import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaBottomNavStyles } from './ArenaBottomNav.variants';

function tokens(classString: string): string[] {
  return classString.split(/\s+/).filter(Boolean);
}


test('current is a group on the item', () => {
  assert.notEqual(arenaBottomNavStyles({ current: true }).item(), arenaBottomNavStyles({ current: false }).item());
});
