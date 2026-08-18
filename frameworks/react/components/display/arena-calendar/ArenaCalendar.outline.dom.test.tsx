/* The toolbar's range is a LABEL, and this suite is what keeps it one. It is rewritten on
 * every step, so a heading element there puts a date range into the document outline where
 * the name of a region belongs, and nothing on screen moves when it does. The region is
 * named by the grid's own accessible name instead, composed from the same range, which is
 * what a reader arriving by name lands on. */

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { ArenaCalendar } from './ArenaCalendar.tsx';

after(cleanup);

const cal = () => (
  <ArenaCalendar timeZone="UTC" anchorDate="2027-03-15" view="week" dayStart="09:00" dayEnd="11:00" />
);

test('the range in the toolbar is drawn without opening a heading', () => {
  const root = mount(cal());

  const range = root.querySelector('[data-arena-part="calendar.heading"]');
  assert.ok(range, 'the toolbar must still draw the range it navigates by');
  assert.ok((range?.textContent ?? '').trim() !== '', 'and the range must carry text');

  assert.equal(
    root.querySelector('h1, h2, h3, h4, h5, h6'),
    null,
    'a calendar opens no heading of its own: the range it would carry names a span of days '
    + 'rather than a region, and it is rewritten every time the reader steps',
  );
});

test('the grid carries the same range as its accessible name', () => {
  const root = mount(cal());

  const range = (root.querySelector('[data-arena-part="calendar.heading"]')?.textContent ?? '').trim();
  const named = root.querySelector('section[aria-label]');
  assert.ok(named, 'the schedule must name itself, since no heading does it');
  assert.ok(
    (named?.getAttribute('aria-label') ?? '').includes(range),
    'the accessible name is the only route to the range once the heading is gone',
  );
});
