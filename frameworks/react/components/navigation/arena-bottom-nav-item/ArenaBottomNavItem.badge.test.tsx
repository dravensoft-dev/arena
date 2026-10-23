/* The badge is a count drawn from a number. A value of another type draws nothing and says so
 * once, rather than printing text the count rules never saw. */

import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArenaBottomNav } from '../arena-bottom-nav/ArenaBottomNav.tsx';
import { ArenaBottomNavItem } from './ArenaBottomNavItem.tsx';
import { forgetArenaWarnings } from '../../../WarnOnce.ts';

function drawn(badge: number | undefined): string {
  return renderToStaticMarkup(
    <ArenaBottomNav ariaLabel="Primary" active="orders">
      <ArenaBottomNavItem id="orders" label="Orders" icon="ph-bold ph-package" badge={badge} />
    </ArenaBottomNav>,
  );
}

test('a number badge draws its count', () => {
  assert.match(drawn(12), /bottom-nav\.badge/);
});

test('a badge that is not a number draws nothing and warns once', () => {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (message: string) => { warnings.push(message); };
  try {
    forgetArenaWarnings();
    const first = drawn('120' as unknown as number);
    const second = drawn('120' as unknown as number);
    for (const html of [first, second]) assert.doesNotMatch(html, /bottom-nav\.badge/);
    const mine = warnings.filter((w) => w.includes('takes a number'));
    assert.equal(mine.length, 1);
  } finally {
    console.warn = original;
  }
});
