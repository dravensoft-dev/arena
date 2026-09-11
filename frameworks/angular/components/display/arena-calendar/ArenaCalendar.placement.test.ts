/* Zero key presses: everything here is one render and a read, which is what keeps it
 * off the grid suite's bill. A chip's horizontal placement is a percentage of the WHOLE
 * grid rather than of its own column, because the chip is not a DOM child of its column
 * -- so the day tracks must be equal, and only a real browser can confirm they are.
 * check:dimensions cannot read Angular's [style.x] binding form; the last test here
 * closes that blind spot by running the gate's own scanValue over the rendered values. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { assertNoNode } from '../../../test/NodeAssert';
import { CHECKS } from '../../../test/Compliance';
import { calendarDetailLineH, calendarHourH, calendarTimeMinH, calendarTimeMinW } from '../../../Tokens.generated';
import { ArenaCalendar } from './ArenaCalendar';
import { ARENA_DATE_OPTIONS, arenaFormatDate, arenaRangeTitle, arenaVisibleDetails } from './CalendarInternals';
import { ArenaCalendarEvent } from '../arena-calendar-event/ArenaCalendarEvent';

const { scanValue } = await import(
  pathToFileURL(join(CHECKS, 'arena', 'check-dimension-literals.ts')).href
) as { scanValue: (prop: string, value: string) => { reason: string } | null };

const PROJECTED = new Map([
  ['top', 'a chip\'s top is its start minute projected onto the visible hour range through '
    + 'calendarHourH, and it must agree TO THE PIXEL with the hour cell it sits over, which JS '
    + 'computes from the same constant. A calc() against var(--calendar-hour-h) here would slide '
    + 'the chip off its cell under an override with nothing failing.'],
  ['height', 'the other end of the same projection: an event\'s duration in minutes mapped to '
    + 'pixels. The floor is min-h-6.5 on the chip slot, which '
    + 'stays governed by the manifest.'],
]);

const WEEK_COLUMNS = 6;
const WEDNESDAY = 2;

@Component({
  standalone: true,
  imports: [ArenaCalendar, ArenaCalendarEvent],
  template: `
    <arena-calendar timeZone="UTC" anchorDate="2027-03-15" view="week"
                    dayStart="09:00" dayEnd="12:00">
      <arena-calendar-event id="long" title="Design review" start="2027-03-17T09:00:00Z"
                            end="2027-03-17T11:00:00Z" [colorId]="1" />
      <arena-calendar-event id="over" title="Vendor sync" start="2027-03-17T09:30:00Z"
                            end="2027-03-17T10:30:00Z" [colorId]="2" />
      <arena-calendar-event id="short" title="Standup" start="2027-03-18T09:00:00Z"
                            end="2027-03-18T09:30:00Z" [colorId]="3" />
      <arena-calendar-event id="elsewhere" title="Next month" start="2027-04-01T09:00:00Z"
                            end="2027-04-01T10:00:00Z" [colorId]="4" />
      @if (paneled()) {
        <arena-calendar-event id="paneled" title="Long with actions" start="2027-03-19T09:00:00Z"
                              end="2027-03-19T11:00:00Z" [colorId]="5" actionsEnabled />
      }
    </arena-calendar>
  `,
})
class PlacementHost {
  readonly paneled = signal(false);
}

function stubResize(width: number): () => void {
  const globals = globalThis as { ResizeObserver?: unknown };
  const saved = globals.ResizeObserver;
  globals.ResizeObserver = class {
    private readonly callback: (entries: Array<{ target: Element; contentRect: { width: number } }>) => void;

    constructor(callback: (entries: Array<{ target: Element; contentRect: { width: number } }>) => void) {
      this.callback = callback;
    }

    observe(target: Element): void {
      this.callback([{ target, contentRect: { width } }]);
    }

    disconnect(): void {}
  };
  return () => { globals.ResizeObserver = saved; };
}

async function render(): Promise<ComponentFixture<PlacementHost>> {
  const fixture = TestBed.createComponent(PlacementHost);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

function chipOf(fixture: ComponentFixture<unknown>, title: string): HTMLElement | null {
  const root = fixture.nativeElement as HTMLElement;
  const drawn = [...root.querySelectorAll<HTMLElement>('[id^="arena-calendar-event-"]')];
  return drawn.find((chip) => (chip.textContent ?? '').startsWith(title)) ?? null;
}

function percentOf(value: string, where: string): number {
  const found = /(-?\d*\.?\d+)%/.exec(value);
  assert.ok(found, `${where} carries no percentage at all: "${value}"`);
  return Number(found[1]);
}

test('a chip is placed across the WHOLE grid, so its share is its column share divided by the day count', async () => {
  const fixture = await render();
  try {
    const long = chipOf(fixture, 'Design review');
    const over = chipOf(fixture, 'Vendor sync');
    assert.ok(long && over, 'the two overlapping chips did not render');

    const share = (1 / (2 * WEEK_COLUMNS)) * 100;
    const firstLeft = ((WEDNESDAY + 0 / 2) / WEEK_COLUMNS) * 100;
    const secondLeft = ((WEDNESDAY + 1 / 2) / WEEK_COLUMNS) * 100;

    assert.equal(percentOf(long.style.left, 'the first chip\'s left'), firstLeft,
      'the first of two overlaps starts at its day\'s own track boundary');
    assert.equal(percentOf(long.style.right, 'the first chip\'s right'), 100 - firstLeft - share,
      'an overlapped chip takes half a day column, expressed against the whole grid');

    assert.equal(percentOf(over.style.left, 'the second chip\'s left'), secondLeft,
      'the second overlap starts half a column further in');
    assert.equal(percentOf(over.style.right, 'the second chip\'s right'), 100 - secondLeft - share);

    const alone = chipOf(fixture, 'Standup');
    assert.ok(alone, 'the unshared chip did not render');
    const aloneLeft = (3 / WEEK_COLUMNS) * 100;
    assert.equal(percentOf(alone.style.left, 'an unshared chip\'s left'), aloneLeft);
    assert.equal(percentOf(alone.style.right, 'an unshared chip\'s right'),
      100 - aloneLeft - (1 / WEEK_COLUMNS) * 100,
      'a chip with the column to itself takes the whole column');

    for (const chip of [long, over, alone]) {
      assert.ok(chip.className.includes('arena-calendar__chip'),
        'the chip gutter is a manifest class, not a number frozen into JS -- inline left/right are '
        + 'pure percentages so that --sp-1 never has to enter the layer as a number');
      assert.equal(chip.style.width, '', 'left and right size the chip; an inline width would fight them');
    }
  } finally {
    fixture.destroy();
  }
});

test('a chip\'s top and height are its minutes projected through calendarHourH', async () => {
  const fixture = await render();
  try {
    const long = chipOf(fixture, 'Design review');
    const over = chipOf(fixture, 'Vendor sync');
    assert.ok(long && over);

    assert.equal(long.style.top, '0px', 'an event starting at dayStart sits at the top of the body');
    assert.equal(long.style.height, `${2 * calendarHourH}px`, 'two hours is two hour heights');

    assert.equal(over.style.top, `${calendarHourH / 2}px`, 'half an hour in is half an hour height down');
    assert.equal(over.style.height, `${calendarHourH}px`);

    const short = chipOf(fixture, 'Standup');
    assert.equal(short?.style.height, `${calendarHourH / 2}px`,
      'the 26px floor is min-height on the recipe, so the projected height reaches the DOM unclamped');
  } finally {
    fixture.destroy();
  }
});

test('a chip outside the visible window renders no element at all -- not a hidden one', async () => {
  const fixture = await render();
  try {
    assertNoNode(chipOf(fixture, 'Next month'),
      'an event on another month must not be in the DOM, or it carries an id nothing owns');
    const grid = fixture.nativeElement.querySelector('[role="grid"]') as HTMLElement;
    assert.equal(grid.querySelectorAll('[id^="arena-calendar-event-"]').length, 3,
      'exactly the three in-window chips are drawn');
  } finally {
    fixture.destroy();
  }
});

test('the time label is dropped when the chip is too short, and kept when it is not', async () => {
  const fixture = await render();
  try {
    const long = chipOf(fixture, 'Design review');
    const short = chipOf(fixture, 'Standup');
    assert.match(long?.textContent ?? '', /09:00 – 11:00/,
      'a chip with room for two lines draws its time range');
    assert.doesNotMatch(short?.textContent ?? '', /09:00/,
      'a 30-minute chip is under the time-label height and must drop it');
  } finally {
    fixture.destroy();
  }
});

test('a narrow container drops the time label on width alone, and that is what lets the kebab stack below the title', async () => {
  const restore = stubResize(400);
  const fixture = TestBed.createComponent(PlacementHost);
  try {
    fixture.componentInstance.paneled.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const long = chipOf(fixture, 'Design review');
    assert.doesNotMatch(long?.textContent ?? '', /09:00 – 11:00/,
      'a chip whose column share is under the time-label width must drop the label however tall it is');

    const paneled = chipOf(fixture, 'Long with actions');
    assert.ok(paneled, 'the chip carrying a kebab did not render');
    const wrap = paneled.querySelector('arena-icon-button')?.parentElement as HTMLElement;
    assert.ok(wrap, 'the kebab wrapper did not render');
    assert.ok(wrap.className.includes('arena-calendar__kebab-wrap--actions-below-true'),
      `a chip at or above the stacking height with no time label puts its kebab below the title: "${wrap.className}"`);
    assert.ok(!paneled.className.includes('pr-['),
      'a chip stacking its kebab must stop reserving the lateral band as well');
  } finally {
    fixture.destroy();
    restore();
  }
});

test('the geometry the gate cannot see holds to the same rule the gate enforces', async () => {
  const fixture = await render();
  try {
    const chip = chipOf(fixture, 'Vendor sync');
    assert.ok(chip, 'the scanned chip must be one whose top is NOT zero -- the gate always allows zero, '
      + 'so a chip at the top of the body would excuse itself and prove nothing');

    for (const prop of ['left', 'right', 'top', 'height'] as const) {
      const value: string = chip.style.getPropertyValue(prop);
      assert.ok(value, `the chip declares no inline ${prop}`);
      const found = scanValue(prop, value);
      const excused = PROJECTED.get(prop);
      if (excused) {
        assert.ok(found, `${prop} is excused as a data-to-pixel projection and no longer looks like `
          + `one ("${value}"). Take it out of PROJECTED -- an exemption that stopped applying is `
          + `the stale entry this map exists to catch. Reason on record: ${excused}`);
        continue;
      }
      assert.equal(found, null,
        `${prop}: ${found?.reason} -- "${value}". check:dimensions is blind to [style.x], which is `
        + 'why this assertion exists; the value still has to hold to its rule.');
    }

    for (const prop of PROJECTED.keys()) {
      assert.ok(['left', 'right', 'top', 'height'].includes(prop),
        `PROJECTED excuses "${prop}", which this suite never reads -- stale entry`);
    }
  } finally {
    fixture.destroy();
  }
});

test('arenaFormatDate formats in the locale it is given, and caches per locale', () => {
  assert.equal(arenaFormatDate('2026-03-16', 'en-GB', ARENA_DATE_OPTIONS.dayName), 'Monday 16 March');
  assert.equal(arenaFormatDate('2026-03-16', 'es-ES', ARENA_DATE_OPTIONS.dayName), 'lunes, 16 de marzo');
  assert.equal(arenaFormatDate('2026-03-16', 'en-GB', ARENA_DATE_OPTIONS.dayName), 'Monday 16 March');
});

test('arenaRangeTitle follows the locale and keeps its en dash', () => {
  const days = ['2026-03-16', '2026-03-17', '2026-03-18', '2026-03-19', '2026-03-20'];
  assert.equal(arenaRangeTitle(days, 'en-GB'), '16 \u2013 20 Mar 2026');
  assert.equal(arenaRangeTitle(days, 'es-ES'), '16 \u2013 20 mar 2026');
});

test('details shed last first, then the time label, and never more than exist', () => {
  const line = calendarDetailLineH;
  assert.equal(arenaVisibleDetails(calendarTimeMinH - 1, null, 3), 0, 'no time label, so no detail');
  assert.equal(arenaVisibleDetails(calendarTimeMinH, null, 3), 0, 'the time label, and not one line more');
  assert.equal(arenaVisibleDetails(calendarTimeMinH + line - 1, null, 3), 0);
  assert.equal(arenaVisibleDetails(calendarTimeMinH + line, null, 3), 1);
  assert.equal(arenaVisibleDetails(calendarTimeMinH + 2 * line, null, 3), 2);
  assert.equal(arenaVisibleDetails(calendarTimeMinH + 10 * line, null, 3), 3);
  assert.equal(arenaVisibleDetails(calendarTimeMinH + 10 * line, calendarTimeMinW - 1, 3), 0, 'too narrow for the time, so too narrow for details');
  assert.equal(arenaVisibleDetails(calendarTimeMinH + 10 * line, null, 0), 0);
});
