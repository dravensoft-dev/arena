/* The badge is drawn from a number rather than a string so Arena can hold the two rules the
 * contract states: zero draws nothing, and above 99 reads "99+". A caller who formats the
 * value first has taken both away, which is what this suite pins. */

import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArenaSideNav } from '../arena-side-nav/ArenaSideNav.tsx';
import { ArenaSideNavItem } from './ArenaSideNavItem.tsx';
import { forgetArenaWarnings } from '../../../WarnOnce.ts';

function drawn(badge: number | undefined): string {
  return renderToStaticMarkup(
    <ArenaSideNav ariaLabel="Workspace navigation" active="orders">
      <ArenaSideNavItem id="orders" label="Orders" badge={badge} />
    </ArenaSideNav>,
  );
}

const counts = (html: string) => [...html.matchAll(/>([\d+]+)<\/span>/g)].map((m) => m[1]);

test('a count draws, and reads exactly what it was given up to 99', () => {
  assert.deepEqual(counts(drawn(1)), ['1']);
  assert.deepEqual(counts(drawn(12)), ['12']);
  assert.deepEqual(counts(drawn(99)), ['99']);
});

test('zero draws no badge at all, because a mark reading 0 says there is nothing to mark', () => {
  assert.deepEqual(counts(drawn(0)), []);
  assert.deepEqual(counts(drawn(undefined)), [], 'and an absent count is not a zero one');
});

test('above 99 the badge reads 99+, so a four-digit count cannot widen the column', () => {
  assert.deepEqual(counts(drawn(100)), ['99+']);
  assert.deepEqual(counts(drawn(4821)), ['99+']);
});

test('the count is not hidden from assistive technology -- the row announces it', () => {
  const html = drawn(12);
  assert.match(html, /Orders/);
  assert.match(html, /12/, 'a count a screen-reader user cannot hear is a count that is not there');
  assert.doesNotMatch(html, /aria-hidden="true"[^>]*>12/);
});

test('a badge that is not a number draws nothing and warns once', () => {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (message: string) => { warnings.push(message); };
  try {
    forgetArenaWarnings();
    const first = drawn('120' as unknown as number);
    const second = drawn('120' as unknown as number);
    for (const html of [first, second]) assert.doesNotMatch(html, /side-nav\.badge/);
    assert.deepEqual(counts(first), []);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0]!, /takes a number/);
  } finally {
    console.warn = original;
  }
});
