/* The head strip is indexed STRUCTURALLY -- it is the section's second child and
 * carries no role of its own -- because a day head is a <div> when the days are
 * inert and a <button> when they are not, and no one selector spans both. A guard
 * asserts that shape before every read. Native Enter/Space activation of the
 * header button is the BROWSER's and is not asserted: happy-dom does not have it,
 * and a test for it would pass against a <div> just as well. ArenaCalendar.prompt.md
 * carries it as a by-hand check instead. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ArenaCalendar } from './ArenaCalendar';
import { arenaFormatDate } from './CalendarInternals';

const DAYS = ['2027-03-15', '2027-03-16', '2027-03-17', '2027-03-18', '2027-03-19', '2027-03-20'];

@Component({
  standalone: true,
  imports: [ArenaCalendar],
  template: `
    <arena-calendar timeZone="UTC" anchorDate="2027-03-15" view="week"
                    dayStart="09:00" dayEnd="11:00"
                    [dayInteractive]="activable()" (dateClick)="seen.push($event)" />
  `,
})
class DateClickHost {
  readonly activable = signal(false);

  readonly seen: string[] = [];
}

const rootOf = (fixture: ComponentFixture<unknown>): HTMLElement => fixture.nativeElement as HTMLElement;

function headsOf(fixture: ComponentFixture<unknown>): HTMLElement[] {
  const section = rootOf(fixture).querySelector('section');
  const strip = section?.children[1];
  assert.ok(
    strip && !strip.querySelector('[role="grid"]') && strip.children.length === DAYS.length,
    'the head strip is no longer the section\'s second child holding one element per day -- this suite indexes it structurally',
  );
  return [...strip.children] as HTMLElement[];
}

const columnsOf = (fixture: ComponentFixture<unknown>): HTMLElement[] =>
  [...rootOf(fixture).querySelectorAll<HTMLElement>('[role="row"]')];

async function mount(activable: boolean): Promise<ComponentFixture<DateClickHost>> {
  const fixture = TestBed.createComponent(DateClickHost);
  fixture.componentInstance.activable.set(activable);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

async function click(fixture: ComponentFixture<unknown>, element: HTMLElement): Promise<void> {
  element.click();
  fixture.detectChanges();
  await fixture.whenStable();
}

test('with dayInteractive, a day header is a button that reports its own date', async () => {
  const fixture = await mount(true);

  try {
    const heads = headsOf(fixture);
    heads.forEach((head, index) => {
      assert.equal(head.tagName, 'BUTTON',
        `day head ${index} is not a button -- the keyboard has no route to the date`);
      assert.equal(head.getAttribute('type'), 'button',
        `day head ${index} would submit a surrounding form`);
      assert.equal(
        head.getAttribute('aria-label'),
        arenaFormatDate(DAYS[index], 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
        `day head ${index} announces its two text nodes rather than the date it stands for`,
      );
    });

    await click(fixture, heads[0]);
    await click(fixture, heads[3]);
    assert.deepEqual(fixture.componentInstance.seen, [DAYS[0], DAYS[3]],
      'a day header did not report its own ISO date');
  } finally {
    fixture.destroy();
  }
});

test('with dayInteractive, the column background reports its day as well', async () => {
  const fixture = await mount(true);

  try {
    const columns = columnsOf(fixture);
    assert.equal(columns.length, DAYS.length, 'the fixture is not the six-day week this suite indexes');
    await click(fixture, columns[1]);
    assert.deepEqual(fixture.componentInstance.seen, [DAYS[1]],
      'the column background did not report its day');
  } finally {
    fixture.destroy();
  }
});

test('dateClick bound with dayInteractive off emits nothing -- R6', async () => {
  const fixture = await mount(false);

  try {
    headsOf(fixture).forEach((head, index) => {
      assert.equal(head.tagName, 'DIV',
        `inert day head ${index} is a button -- the strip took a tab stop nobody declared`);
    });

    await click(fixture, headsOf(fixture)[0]);
    await click(fixture, columnsOf(fixture)[0]);
    assert.deepEqual(fixture.componentInstance.seen, [],
      'binding the listener alone emitted the date -- the layer activates what its contract says is inert');
  } finally {
    fixture.destroy();
  }
});
