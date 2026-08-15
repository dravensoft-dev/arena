/* A recipe resolves to the component's OWN class names, so what this suite can see is which slot
 * a variant moves and how many distinct answers each has. What each utility MEANS is asserted
 * once beside the manifest, where both layers reach one claim rather than two copies. */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { ArenaHeroAlign, ArenaHeroLayout } from '../../../Api.generated';
import { arenaHeroStyles } from './ArenaHero.variants';

const LAYOUTS: ArenaHeroLayout[] = ['stacked', 'split', 'bleed'];
const ALIGNS: ArenaHeroAlign[] = ['start', 'center'];

test('the three layouts are three distinct roots', () => {
  const seen = new Set(LAYOUTS.map((layout) => arenaHeroStyles({ layout, align: 'start' }).root()));
  assert.equal(seen.size, LAYOUTS.length, 'two layouts compiled to the same root');
});

test('the two alignments move the words and never the root', () => {
  for (const layout of LAYOUTS) {
    const roots = new Set(ALIGNS.map((align) => arenaHeroStyles({ layout, align }).root()));
    const words = new Set(ALIGNS.map((align) => arenaHeroStyles({ layout, align }).words()));
    assert.equal(roots.size, 1, `${layout}: the alignment moved the root, which is the layout's`);
    assert.equal(words.size, ALIGNS.length, `${layout}: the two alignments compiled to the same words block`);
  }
});

test('the layout moves the root, the words and the figure, and leaves the registers alone', () => {
  const base = arenaHeroStyles({ layout: 'split', align: 'start' });
  for (const layout of LAYOUTS) {
    const other = arenaHeroStyles({ layout, align: 'start' });
    for (const slot of ['eyebrow', 'title', 'lede', 'actions'] as const) {
      assert.equal(other[slot](), base[slot](), `${layout} moved the ${slot} slot`);
    }
  }
});

test('the split threshold is the component\'s, so the recipe writes no track list', () => {
  for (const layout of LAYOUTS) {
    const root = arenaHeroStyles({ layout, align: 'start' }).root().split(/\s+/).filter(Boolean);
    assert.ok(!root.some((cls) => cls.startsWith('grid-cols-[')),
      `${layout}: a track list in the recipe is a threshold no role can answer`);
  }
});
