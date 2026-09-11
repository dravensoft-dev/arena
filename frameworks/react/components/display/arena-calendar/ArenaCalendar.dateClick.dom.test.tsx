/* The head strip is indexed STRUCTURALLY -- it is the section's second child and
 * carries no role of its own -- because a day head is a <div> when the days are
 * inert and a <button> when they are not, and no one selector spans both. A guard
 * asserts that shape before every read, so a moved strip fails here rather than
 * selecting nothing and passing. Native Enter/Space activation of the header
 * button is the BROWSER's and is not asserted: happy-dom does not have it, and a
 * test for it would pass against a <div> just as well. ArenaCalendar.prompt.md carries
 * it as a by-hand check instead. */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { ArenaCalendar } from './ArenaCalendar.tsx';
import { ArenaCalendarEvent } from '../arena-calendar-event/ArenaCalendarEvent.tsx';
import { arenaFormatDate } from './CalendarInternals.ts';

after(cleanup);

const DAYS = ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24', '2026-07-25'];

const cal = (extra: Record<string, unknown> = {}) => (
  <ArenaCalendar timeZone="UTC" anchorDate="2026-07-20" view="week" dayStart="09:00" dayEnd="11:00" {...extra} />
);

function headStrip(root: ParentNode) {
  const section = root.querySelector('section');
  const strip = section && section.children[1];
  assert.ok(
    strip && !strip.querySelector('[role="grid"]') && strip.children.length === DAYS.length,
    'the head strip is no longer the section\'s second child holding one element per day -- this suite indexes it structurally',
  );
  return strip;
}

const dayHeads = (root: ParentNode) => [...headStrip(root).children];
const columns = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>('[role="row"]')];
const click = (el: Element) => { act(() => { (el as HTMLElement).click(); }); };

test('with dayInteractive, a day header is a button that reports its own date', () => {
  const seen: unknown[] = [];
  const root = mount(cal({ dayInteractive: true, onDateClick: (iso: string) => seen.push(iso) }));

  dayHeads(root).forEach((head, i) => {
    assert.equal(head.tagName, 'BUTTON', `day head ${i} is not a button -- the keyboard has no route to the date`);
    assert.equal(head.getAttribute('type'), 'button', `day head ${i} would submit a surrounding form`);
    assert.equal(
      head.getAttribute('aria-label'),
      arenaFormatDate(DAYS[i]!, 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
      `day head ${i} announces its two text nodes rather than the date it stands for`,
    );
  });

  const heads = dayHeads(root);
  click(heads[0]!);
  click(heads[3]!);
  assert.deepEqual(seen, [DAYS[0], DAYS[3]], 'a day header did not report its own ISO date');
});

test('with dayInteractive, the column background reports its day as well', () => {
  const seen: unknown[] = [];
  const root = mount(cal({ dayInteractive: true, onDateClick: (iso: string) => seen.push(iso) }));

  const cols = columns(root);
  assert.equal(cols.length, DAYS.length, 'the fixture is not the six-day week this suite indexes');
  click(cols[1]!);
  assert.deepEqual(seen, [DAYS[1]], 'the column background did not report its day');
});

test('dateClick bound with dayInteractive off activates nothing -- R6', () => {
  const seen: unknown[] = [];
  const root = mount(cal({ onDateClick: (iso: string) => seen.push(iso) }));

  for (const [i, head] of dayHeads(root).entries()) {
    assert.equal(head.tagName, 'DIV', `inert day head ${i} is a button -- the strip took a tab stop nobody declared`);
  }

  click(dayHeads(root)[0]!);
  click(columns(root)[0]!);
  assert.deepEqual(
    seen, [],
    'binding the listener alone activated the days -- the render is derived from the listener again',
  );
});

test('dayInteractive with no listener draws the affordance and activates without throwing', () => {
  const root = mount(cal({ dayInteractive: true }));
  click(dayHeads(root)[0]!);
  click(columns(root)[0]!);
});

test('a chip is not inside its day, so activating one reports no date', () => {
  const seen: unknown[] = [];
  const root = mount(
    <ArenaCalendar timeZone="UTC" anchorDate="2026-07-20" view="week" dayStart="09:00" dayEnd="11:00"
      dayInteractive onDateClick={(iso: string) => seen.push(iso)}>
      <ArenaCalendarEvent id="a" title="Standup" start="2026-07-20T09:00:00Z" end="2026-07-20T09:30:00Z" />
    </ArenaCalendar>,
  );

  const grid = root.querySelector('[role="grid"]')!;
  const owned = (columns(root)[0]!.getAttribute('aria-owns') ?? '').split(/\s+/).filter(Boolean);
  assert.equal(owned.length, 1, 'the first day owns no chip, so nothing re-attached it to its row');
  const chip = grid.ownerDocument.getElementById(owned[0]!);
  assert.ok(chip, 'the day names an id that resolves to nothing -- a dangling reference');
  assert.ok(!columns(root)[0]!.contains(chip),
    'sanity: the chip IS a DOM child of its row again, which is the shape the other layer cannot have');

  click(chip as HTMLElement);
  assert.deepEqual(seen, [],
    'the chip reported its day: it is outside the row now, so a click on it must not activate the date, '
    + 'which is what the other layer has always done');
});
