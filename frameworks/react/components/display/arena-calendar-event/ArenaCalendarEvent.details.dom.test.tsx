import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { ArenaCalendar } from '../arena-calendar/ArenaCalendar.tsx';
import { ArenaCalendarEvent } from './ArenaCalendarEvent.tsx';
import { arenaVisibleDetails } from '../arena-calendar/CalendarInternals.ts';
import { calendarHourH } from '../../../Tokens.generated.js';

afterEach(() => cleanup());

function chipFor(minutes: number, props: Partial<React.ComponentProps<typeof ArenaCalendarEvent>>) {
  const end = `2026-03-16T${String(9 + Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  return mount(
    <ArenaCalendar anchorDate="2026-03-16" view="week" timeZone="UTC" dayStart="08:00" dayEnd="18:00">
      <ArenaCalendarEvent id="e" title="Review" start="2026-03-16T09:00" end={end} details={['Ada, Grace', '8 of 12 seats', 'Room 4']} {...props} />
    </ArenaCalendar>,
  );
}

test('a chip draws as many details as its height allows and hides the rest', () => {
  const host = chipFor(120, {});
  const drawn = [...host.querySelectorAll('[data-arena-part="calendar.detail"]')].map((el) => el.textContent);
  const expected = arenaVisibleDetails((120 / 60) * calendarHourH, null, 3);
  assert.deepEqual(drawn, ['Ada, Grace', '8 of 12 seats', 'Room 4'].slice(0, expected));
});

test('an activatable chip names the title, the date, the time and every detail, drawn or shed', () => {
  const host = chipFor(30, { interactive: true });
  const name = host.querySelector('[data-arena-part="calendar.chip"]')!.getAttribute('aria-label') ?? '';
  assert.match(name, /^Review, .+, .+, Ada, Grace, 8 of 12 seats, Room 4$/);
});

test('a chip with actions names its inner button the same way', () => {
  const host = chipFor(30, { interactive: true, actionsEnabled: true });
  const body = host.querySelector('[data-arena-part="calendar.chip-body"]')!;
  assert.match(body.getAttribute('aria-label') ?? '', /Ada, Grace, 8 of 12 seats, Room 4$/);
});

test('an inert chip keeps its shed details in its text, visually hidden', () => {
  const host = chipFor(30, {});
  const chip = host.querySelector('[data-arena-part="calendar.chip"]')!;
  const shed = [...chip.querySelectorAll('[data-arena-part="calendar.detail-shed"]')].map((el) => el.textContent);
  assert.deepEqual(shed, ['Ada, Grace', '8 of 12 seats', 'Room 4']);
  assert.equal(chip.getAttribute('aria-label'), null);
});
