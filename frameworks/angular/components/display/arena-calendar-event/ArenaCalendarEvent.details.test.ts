import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaCalendar } from '../arena-calendar/ArenaCalendar';
import { ArenaCalendarEvent } from './ArenaCalendarEvent';
import { arenaVisibleDetails } from '../arena-calendar/CalendarInternals';
import { calendarHourH } from '../../../Tokens.generated';

const DETAILS = ['Ada, Grace', '8 of 12 seats', 'Room 4'];

@Component({
  standalone: true,
  imports: [ArenaCalendar, ArenaCalendarEvent],
  template: `
    <arena-calendar anchorDate="2026-03-16" view="week" timeZone="UTC" dayStart="08:00" dayEnd="18:00">
      @for (event of events(); track event.id) {
        <arena-calendar-event [id]="event.id" title="Review" start="2026-03-16T09:00" [end]="event.end"
                              [details]="details" [interactive]="interactive()" [actionsEnabled]="actions()" />
      }
    </arena-calendar>`,
})
class Host {
  readonly events = signal([{ id: 'e', end: '2026-03-16T11:00' }]);
  readonly interactive = signal(false);
  readonly actions = signal(false);
  details = DETAILS;
}

function render(end: string, interactive = false, actions = false) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.events.set([{ id: 'e', end }]);
  fixture.componentInstance.interactive.set(interactive);
  fixture.componentInstance.actions.set(actions);
  fixture.detectChanges();
  fixture.detectChanges();
  return { fixture, root: fixture.nativeElement as HTMLElement };
}

test('a chip draws as many details as its height allows and hides the rest', () => {
  const { fixture, root } = render('2026-03-16T11:00');
  try {
    const drawn = [...root.querySelectorAll('[data-arena-part="calendar.detail"]')].map((el) => el.textContent?.trim());
    assert.deepEqual(drawn, DETAILS.slice(0, arenaVisibleDetails(2 * calendarHourH, null, 3)));
  } finally { fixture.destroy(); }
});

test('an activatable chip names the title, the date, the time and every detail, drawn or shed', () => {
  const { fixture, root } = render('2026-03-16T09:30', true);
  try {
    const chip = root.querySelector('[data-arena-part="calendar.chip"]') as HTMLElement;
    assert.match(chip.getAttribute('aria-label') ?? '', /^Review, .+, .+, Ada, Grace, 8 of 12 seats, Room 4$/);
  } finally { fixture.destroy(); }
});

test('a chip with actions names its inner button the same way', () => {
  const { fixture, root } = render('2026-03-16T09:30', true, true);
  try {
    const body = root.querySelector('[data-arena-part="calendar.chip-body"]') as HTMLElement;
    assert.match(body.getAttribute('aria-label') ?? '', /Ada, Grace, 8 of 12 seats, Room 4$/);
  } finally { fixture.destroy(); }
});

test('an inert chip keeps its shed details in its text, visually hidden', () => {
  const { fixture, root } = render('2026-03-16T09:30');
  try {
    const chip = root.querySelector('[data-arena-part="calendar.chip"]') as HTMLElement;
    const shed = [...chip.querySelectorAll('[data-arena-part="calendar.detail-shed"]')].map((el) => el.textContent?.trim());
    assert.deepEqual(shed, DETAILS);
    assert.equal(chip.getAttribute('aria-label'), null);
  } finally { fixture.destroy(); }
});
