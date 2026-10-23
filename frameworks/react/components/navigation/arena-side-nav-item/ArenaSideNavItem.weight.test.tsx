/* The active row is drawn filled, and Arena applies its own convention rather than asking for
 * it: a consumer otherwise concatenates ph-fill against ph-bold per row, which is the icon
 * convention reimplemented once per project. The swap is idempotent, so a caller who already
 * passes ph-fill gets exactly what they passed. */
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderIcons, symbols } from '../../../test/IconsHarness.tsx';
import { ArenaSideNav } from '../arena-side-nav/ArenaSideNav.tsx';
import { ArenaSideNavItem } from './ArenaSideNavItem.tsx';
import { arenaActiveWeight } from '../NavRow.ts';

function markup(active: string): string {
  return renderIcons(
    <ArenaSideNav ariaLabel="Primary" active={active}>
      <ArenaSideNavItem id="home" label="Home" icon="ph-bold ph-house" />
      <ArenaSideNavItem id="sales" label="Sales" icon="ph-bold ph-receipt" />
    </ArenaSideNav>,
  );
}

test('arenaActiveWeight swaps the weight it finds, adds one where there is none, and repeats safely', () => {
  assert.equal(arenaActiveWeight('ph-bold ph-house'), 'ph-fill ph-house');
  assert.equal(arenaActiveWeight('ph-thin ph-house'), 'ph-fill ph-house');
  assert.equal(arenaActiveWeight('ph-house'), 'ph-fill ph-house');
  assert.equal(arenaActiveWeight('ph-fill ph-house'), 'ph-fill ph-house',
    'a caller who already asked for fill gets exactly what they passed');
  assert.equal(arenaActiveWeight(arenaActiveWeight('ph-bold ph-house')), 'ph-fill ph-house');
});

test('the active row is filled and every other row keeps the weight it was given', () => {
  const ids = symbols(markup('home'));
  assert.equal(ids.length, 2);
  assert.equal(ids[0], 'fill-house', 'the active row draws its glyph filled, not bold');
  assert.equal(ids[1], 'bold-receipt', 'an inactive row is untouched');
});

test('moving `active` moves the fill, so nothing is latched at first render', () => {
  const ids = symbols(markup('sales'));
  assert.equal(ids[0], 'bold-house');
  assert.equal(ids[1], 'fill-receipt');
});
