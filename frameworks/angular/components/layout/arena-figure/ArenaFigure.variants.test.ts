/* A recipe resolves to the component's OWN class names, so what this suite can see is that every
 * slot resolves and that the figure takes no variant to move them. What each utility MEANS is
 * asserted once beside the manifest, where both layers reach one claim rather than two copies. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaFigureStyles } from './ArenaFigure.variants';

const SLOTS = ['root', 'frame', 'media', 'fallback', 'overlay', 'caption'] as const;

test('every slot the component renders resolves to something', () => {
  const styles = arenaFigureStyles();
  for (const slot of SLOTS) {
    assert.ok(styles[slot]().trim().length > 0, `${slot} resolves to nothing, so the element is unstyled`);
  }
});

test('the six slots are six distinct answers, because none of them is a copy of another', () => {
  const styles = arenaFigureStyles();
  const seen = new Set(SLOTS.map((slot) => styles[slot]()));
  assert.equal(seen.size, SLOTS.length);
});

test('the shape is the component\'s, so the recipe writes no ratio of its own', () => {
  const frame = arenaFigureStyles().frame().split(/\s+/).filter(Boolean);
  assert.ok(!frame.some((cls) => cls.startsWith('aspect-')),
    'a ratio in the recipe is a ratio the member could not answer');
});
