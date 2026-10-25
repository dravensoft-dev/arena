/* The recipe is the manifest's, so what is asserted is that the two groups this component drives
 * reach the slots they name: the state reaches the glyph, and disabled reaches the root. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaFieldsetStyles } from './ArenaFieldset.variants';

test('an error marks the glyph with its state and disabled marks the root', () => {
  const styles = arenaFieldsetStyles({ state: 'error', disabled: true });
  assert.equal(styles.$data.statusIcon()['data-arena-state'], 'error');
  assert.ok('data-arena-disabled' in styles.$data.root());
});
