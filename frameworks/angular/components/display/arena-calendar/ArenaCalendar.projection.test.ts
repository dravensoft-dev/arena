/* A calendar gates its own actions cell on a query for the actions marker, and an event inside it
 * carries an actions marker of its own. The query reads direct content only, so a marker imported
 * and written inside an event fills the event's panel and leaves the calendar's cell undrawn. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { assertNoNode } from '../../../test/NodeAssert';
import { ArenaActions } from '../../../ProjectionMarkers';
import { ArenaCalendar } from './ArenaCalendar';
import { ArenaCalendarEvent } from '../arena-calendar-event/ArenaCalendarEvent';

const root = document.documentElement;
before(() => {
  root.style.setProperty('--bp-md', '768px');
});
after(() => {
  root.style.removeProperty('--bp-md');
});

@Component({
  standalone: true,
  imports: [ArenaCalendar, ArenaCalendarEvent, ArenaActions],
  template: `
    <arena-calendar timeZone="UTC" anchorDate="2027-03-15" view="day" dayStart="09:00" dayEnd="11:00">
      <arena-calendar-event id="a" title="Standup" start="2027-03-15T09:00:00Z"
                            end="2027-03-15T10:00:00Z" [actionsEnabled]="true">
        <button actions type="button">Delete</button>
      </arena-calendar-event>
    </arena-calendar>
  `,
})
class Host {}

test('an imported actions marker inside an event fills the event, and the calendar draws no actions cell', () => {
  const fixture = TestBed.createComponent(Host);
  try {
    fixture.detectChanges();
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    assertNoNode(host.querySelector('[data-arena-part="calendar.actions"]'),
      'the calendar drew its actions cell for a marker that sits inside an event');

    const kebab = host.querySelector<HTMLElement>('[id^="arena-calendar-event-"] arena-icon-button button');
    assert.ok(kebab, 'the event did not draw its kebab');
    kebab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    const button = host.querySelector<HTMLElement>('button[actions]');
    assert.ok(button, 'the event did not project its actions marker');
    assert.ok(button.closest('[data-arena-part="calendar.panel"]'),
      'the button is not inside the event\'s actions panel');
  } finally {
    fixture.destroy();
  }
});
