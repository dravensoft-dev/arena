/* No DOM and no TestBed: assertions about the recipe alone, plus the two derivations beside it.
 * `resize` is the inverse of `autoResize` and `state` has only two arms here -- there is no valid
 * state, because an ArenaTextarea has no validator to earn one. The near-limit counter is a second slot
 * rather than a variant, so which slot the component picks is the thing worth pinning. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_COUNTER_WARNING_SHARE, arenaBorderBoxSlack, arenaCounterIsNear, arenaTextareaIdFor } from './ArenaTextarea';
import { arenaTextareaStyles } from './ArenaTextarea.variants';

test('the default is a neutral, vertically resizable, enabled, editable field', () => {
  assert.equal(
    arenaTextareaStyles().field(),
    arenaTextareaStyles({ state: 'neutral', resize: 'vertical', disabled: false, readOnly: false }).field(),
  );
});

test('arenaCounterIsNear turns over at nine tenths of the cap, exclusive', () => {
  assert.equal(ARENA_COUNTER_WARNING_SHARE, 0.9);
  assert.equal(arenaCounterIsNear(89, 100), false);
  assert.equal(arenaCounterIsNear(90, 100), false, 'exactly at the share is not yet near -- ArenaTextarea.json contracts STRICTLY past nine tenths');
  assert.equal(arenaCounterIsNear(91, 100), true);
  assert.equal(arenaCounterIsNear(100, 100), true);
});

test('arenaTextareaIdFor derives the contracted ta- slug, which is a different prefix from ArenaInput\'s', () => {
  assert.equal(arenaTextareaIdFor('release-notes', 'Release notes'), 'release-notes');
  assert.equal(arenaTextareaIdFor(undefined, 'Release notes'), 'ta-release-notes');
  assert.equal(arenaTextareaIdFor(undefined, undefined), null);
});

test('arenaBorderBoxSlack is the border, which scrollHeight leaves out and a border-box height needs', () => {
  assert.equal(arenaBorderBoxSlack({ offsetHeight: 82, clientHeight: 80 } as HTMLElement), 2,
    'the Tailwind layer is border-box, so height must cover the border; scrollHeight covers only '
    + 'content plus padding, and the two-pixel shortfall is exactly one hairline top and bottom');
  assert.equal(arenaBorderBoxSlack({ offsetHeight: 80, clientHeight: 80 } as HTMLElement), 0);
});

test('readOnly and near are groups, near on the one counter slot', () => {
  assert.notEqual(arenaTextareaStyles({ readOnly: true }).field(), arenaTextareaStyles({ readOnly: false }).field());
  assert.notEqual(arenaTextareaStyles({ near: true }).counter(), arenaTextareaStyles({ near: false }).counter());
});
