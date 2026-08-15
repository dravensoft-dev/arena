/* A recipe resolves to the component's OWN class names, never to the utilities a manifest was
 * written in, so what this suite can see is which slot a variant moves and how many distinct
 * answers it has. What each utility MEANS is asserted once beside the manifest instead, where
 * both layers reach the same claim rather than two copies of it. */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { ArenaSectionRhythm } from '../../../Api.generated';
import { arenaSectionStyles } from './ArenaSection.variants';

const RHYTHMS: ArenaSectionRhythm[] = ['none', 'sm', 'md', 'lg'];
const SLOTS = ['head', 'titles', 'eyebrow', 'title', 'description', 'action', 'body'] as const;

test('the four named steps are four distinct roots', () => {
  const seen = new Set(RHYTHMS.map((rhythm) => arenaSectionStyles({ rhythm }).root()));
  assert.equal(seen.size, RHYTHMS.length, 'two steps compiled to the same root');
});

test('the rhythm moves the root alone, so a step cannot re-register the head', () => {
  const md = arenaSectionStyles({ rhythm: 'md' });
  for (const rhythm of RHYTHMS) {
    const other = arenaSectionStyles({ rhythm });
    for (const slot of SLOTS) assert.equal(other[slot](), md[slot](), `${rhythm} moved the ${slot} slot`);
  }
});

test('every slot the component renders resolves to something', () => {
  const styles = arenaSectionStyles({ rhythm: 'md' });
  for (const slot of ['root', ...SLOTS] as const) {
    assert.ok(styles[slot]().trim().length > 0, `${slot} resolves to nothing, so the element is unstyled`);
  }
});
