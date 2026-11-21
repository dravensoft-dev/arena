/* The cell has one slot and no variant. This file asserts that its recipe resolves to a
 * non-empty root class. What the class means is asserted beside the manifest instead. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaScrollerItemStyles } from './ArenaScrollerItem.variants';

test('the cell resolves to a non-empty root', () => {
  const root = arenaScrollerItemStyles().root();
  assert.ok(root.trim().length > 0, 'the cell resolves to nothing, so it is a box with no width');
});
