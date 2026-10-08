/* A recipe resolves to the component's OWN class names, never to the utilities a manifest was
 * written in. The rhythm is an option class on the host, answered by the manifest, so the
 * recipe takes no choice and every slot resolves to its generated class. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaSectionStyles } from './ArenaSection.variants';
import manifest from './ArenaSection.classes.generated';

const SLOTS = ['root', 'head', 'titles', 'eyebrow', 'title', 'description', 'action', 'body'] as const;

test('every slot the component renders resolves to its generated class', () => {
  const styles = arenaSectionStyles();
  for (const slot of SLOTS) {
    assert.equal(styles[slot](), manifest.slots[slot], `${slot} does not resolve to its slot class`);
  }
});

test('the root carries no attribute, because no member chooses its rhythm any more', () => {
  assert.deepEqual(arenaSectionStyles().$data.root(), {});
});
