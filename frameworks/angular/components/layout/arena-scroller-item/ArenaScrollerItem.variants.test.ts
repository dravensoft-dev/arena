/* The cell has one slot and no variant, so what the recipe can be held to is that it resolves
 * to something and that it resolves to the same thing every time. What the class MEANS is
 * asserted once beside the manifest, where both layers reach the same claim. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaScrollerItemStyles } from './ArenaScrollerItem.variants';

test('the cell resolves to one stable root, because it takes no variant to move it', () => {
  const root = arenaScrollerItemStyles().root();
  assert.ok(root.trim().length > 0, 'the cell resolves to nothing, so it is a box with no width');
  assert.equal(root, arenaScrollerItemStyles().root());
});
