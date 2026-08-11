/* No DOM and no TestBed: assertions about the recipe alone. The check glyph's own geometry is
 * not in the manifest -- it is the two camelCase style objects the component exports, the same
 * shape and the same reason as a chart drawing geometry, and they are asserted here beside it. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_CHECK_GLYPH_STYLE, ARENA_CHECK_STROKE_STYLE } from './ArenaCheckbox';
import { arenaCheckboxStyles } from './ArenaCheckbox.variants';

test('the default is an unchecked, enabled box', () => {
  assert.equal(
    arenaCheckboxStyles().root(),
    arenaCheckboxStyles({ checked: false, disabled: false }).root(),
  );
});

test('the check glyph reads its box and its stroke from tokens, never from a literal', () => {
  assert.deepEqual(ARENA_CHECK_GLYPH_STYLE, { width: 'var(--sp-3)', height: 'var(--sp-3)' });
  assert.deepEqual(ARENA_CHECK_STROKE_STYLE, { strokeWidth: 'var(--bw-strong)' });
});
