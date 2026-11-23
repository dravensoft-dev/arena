/* A recipe resolves to the component's OWN class names. The hero has no variant: its layout and
 * its alignment are families an adopter writes as classes, so the recipe is one answer. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaHeroStyles } from './ArenaHero.variants';

test('the split threshold is the component\'s, so the recipe writes no track list', () => {
  const root = arenaHeroStyles().root().split(/\s+/).filter(Boolean);
  assert.ok(!root.some((cls) => cls.startsWith('grid-cols-[')),
    'a track list in the recipe is a threshold no role can answer');
});
