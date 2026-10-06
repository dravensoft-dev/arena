import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaGridStyles } from './ArenaGrid.variants';
import manifest from './ArenaGrid.classes.generated';

test('the recipe resolves the root slot class and takes no choice', () => {
  assert.equal(arenaGridStyles().root(), manifest.slots.root);
  assert.deepEqual(arenaGridStyles().$data.root(), {}, 'no attribute follows from a choice that no longer exists');
});
