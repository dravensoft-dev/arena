/* The group has no manifest of its own: it draws the `group` slot of ArenaCheckbox's, which is a
 * column and carries the display utility the host binding needs. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaCheckboxGroupStyles } from './ArenaCheckboxGroup.variants';
import manifest from '../arena-checkbox/ArenaCheckbox.classes.generated';

test('the group draws ArenaCheckbox\'s group slot and no slot of its own', () => {
  assert.equal(manifest.component, 'ArenaCheckbox');
  assert.equal(arenaCheckboxGroupStyles().group(), manifest.slots.group);
  assert.equal(manifest.parts.group, 'checkbox.group');
});
