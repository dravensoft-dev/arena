/* A recipe resolves to the component's OWN class names, so what this suite can see is that the
 * sticky branch is one answer and the still one is another, and that nothing but the bar moves.
 * What each utility MEANS is asserted once beside the manifest. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaAppBarStyles } from './ArenaAppBar.variants';

const SLOTS = ['band', 'brand', 'nav', 'actions'] as const;

test('the two sticky branches are two distinct roots', () => {
  assert.notEqual(arenaAppBarStyles({ sticky: true }).root(), arenaAppBarStyles({ sticky: false }).root());
});

test('sticky moves the bar alone, so the band and its slots never follow it', () => {
  const on = arenaAppBarStyles({ sticky: true });
  const off = arenaAppBarStyles({ sticky: false });
  for (const slot of SLOTS) assert.equal(on[slot](), off[slot](), `sticky moved the ${slot} slot`);
});

test('the page width is the component\'s, so the recipe writes none of its own', () => {
  for (const sticky of [true, false]) {
    const band = arenaAppBarStyles({ sticky }).band().split(/\s+/).filter(Boolean);
    assert.ok(!band.some((cls) => cls.startsWith('max-w-')),
      'a component manifest cannot read --container-max: the role shares its name with a Tailwind namespace, so the strip leaves it in the sheet and an adopter declaring that property rescales the bar');
  }
});
