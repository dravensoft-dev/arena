/* A recipe resolves to the component's OWN class names, never to the utilities a manifest was
 * written in, so what this suite can see is that the two behaviours are two answers and that
 * the row has one slot. Where a scroll settles, and that nothing animates, are asserted once
 * beside the manifest instead, where both layers reach the same claim. */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { ArenaScrollerBehaviour } from '../../../Api.generated';
import { arenaScrollerStyles } from './ArenaScroller.variants';

const BEHAVIOURS: ArenaScrollerBehaviour[] = ['snap', 'flow'];

test('the two behaviours are two distinct roots', () => {
  const seen = new Set(BEHAVIOURS.map((behaviour) => arenaScrollerStyles({ behaviour }).root()));
  assert.equal(seen.size, BEHAVIOURS.length, 'the two behaviours compiled to the same root');
});

test('the row is one slot, and the recipe resolves it under every behaviour', () => {
  for (const behaviour of BEHAVIOURS) {
    const root = arenaScrollerStyles({ behaviour }).root();
    assert.ok(root.trim().length > 0, `${behaviour} resolves to nothing, so the row is unstyled`);
  }
});

test('the row sizes no child of its own, because a cell is what has a box in both layers', () => {
  for (const behaviour of BEHAVIOURS) {
    const root = arenaScrollerStyles({ behaviour }).root().split(/\s+/).filter(Boolean);
    assert.ok(!root.some((cls) => /width|basis/.test(cls)),
      `${behaviour}: a width in the recipe is a width no member can answer`);
  }
});
