/* THE GRID IS TRANSPOSED and every assertion depends on it: a role="row" is a DAY
 * COLUMN and its cells are that day's hour slots, so ArrowLeft/Right cross rows
 * (day -1/+1) while ArrowUp/Down, Home and End move within one row (hour).
 * grid.json prescribes no orientation and both mappings satisfy it.
 * ONE mount serves the walk and it visits every cell with one press each.
 * The fixture is deliberately SMALL -- 6 columns by 2 slots, 17 presses -- because
 * the bill is the press count, not what is asserted, and every invariant here holds
 * at any size from 2x2 up. `view`, `dayStart` and `dayEnd` are all explicit: a
 * fixture whose shape comes from a container width flips every assertion below. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { assertSameNode } from '../../../test/NodeAssert';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';
import { ArenaCalendar } from './ArenaCalendar';
import { ArenaCalendarEvent } from '../arena-calendar-event/ArenaCalendarEvent';

const root = document.documentElement;
before(() => {
  root.style.setProperty('--bp-md', '768px');
});
after(() => {
  root.style.removeProperty('--bp-md');
});

const BINDING = join(ANGULAR_COMPONENTS, 'display/arena-calendar/ArenaCalendar.behaviour.json');

const DAY_COLUMNS = 6;
const HOUR_SLOTS = 2;

@Component({
  standalone: true,
  imports: [ArenaCalendar, ArenaCalendarEvent],
  template: `
    <arena-calendar timeZone="UTC" anchorDate="2027-03-15" view="week"
                    dayStart="09:00" dayEnd="11:00">
      <arena-calendar-event id="a" title="Standup" start="2027-03-15T09:00:00Z"
                            end="2027-03-15T09:30:00Z" [colorId]="1" interactive />
      <arena-calendar-event id="b" title="Review" start="2027-03-16T10:00:00Z"
                            end="2027-03-16T11:00:00Z" [colorId]="2" interactive />
    </arena-calendar>
  `,
})
class GridHost {}

function gridOf(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement.querySelector('[role="grid"]') as HTMLElement;
}

const cellsOf = (row: Element): HTMLElement[] => [...row.querySelectorAll<HTMLElement>('[role="gridcell"]')];

async function press(fixture: ComponentFixture<unknown>, key: string): Promise<void> {
  const active = document.activeElement as HTMLElement;
  active.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  fixture.detectChanges();
  await fixture.whenStable();
}

function assertOneStop(grid: Element): void {
  const stops = grid.querySelectorAll('[tabindex="0"]');
  assert.equal(stops.length, 1, `a grid is ONE tab stop; found ${stops.length}`);
  assertSameNode(stops[0], document.activeElement, 'the tab stop did not follow focus');
}

test('the grid is a named role="grid" of day rows and hour cells, and every cell is reachable by arrow keys', async () => {
  const fixture = TestBed.createComponent(GridHost);
  fixture.detectChanges();
  await fixture.whenStable();

  try {
    const grid = gridOf(fixture);
    assert.ok(grid, 'no role="grid" -- the grid pattern has nothing to attach to');
    assert.match(grid.getAttribute('aria-label') ?? '', /^Schedule grid, /,
      'the grid element carries no name of its own');

    const rows = [...grid.querySelectorAll<HTMLElement>('[role="row"]')];
    assert.equal(rows.length, DAY_COLUMNS, 'one row per day column');
    const cells = rows.map(cellsOf);
    for (const [index, row] of cells.entries()) {
      assert.equal(row.length, HOUR_SLOTS, `day ${index} rendered ${row.length} hour cells`);
    }

    cells[0][0].focus();
    fixture.detectChanges();
    await fixture.whenStable();
    assertSameNode(document.activeElement, cells[0][0], 'the cursor does not start on the first cell');
    assertOneStop(grid);

    await press(fixture, 'ArrowLeft');
    assertSameNode(document.activeElement, cells[0][0], 'ArrowLeft did not clamp on the first day');
    await press(fixture, 'ArrowUp');
    assertSameNode(document.activeElement, cells[0][0], 'ArrowUp did not clamp on the first hour');

    let visited = 1;
    for (let day = 0; day < DAY_COLUMNS; day += 1) {
      const downward = day % 2 === 0;
      const step = downward ? 'ArrowDown' : 'ArrowUp';
      for (let i = 1; i < HOUR_SLOTS; i += 1) {
        const hour = downward ? i : HOUR_SLOTS - 1 - i;
        await press(fixture, step);
        assertSameNode(document.activeElement, cells[day][hour],
          `${step} from day ${day} did not land on hour ${hour}`);
        assertOneStop(grid);
        visited += 1;
      }
      if (day === DAY_COLUMNS - 1) break;
      const hour = downward ? HOUR_SLOTS - 1 : 0;
      await press(fixture, 'ArrowRight');
      assertSameNode(document.activeElement, cells[day + 1][hour],
        `ArrowRight did not cross to day ${day + 1} at the same hour`);
      assertOneStop(grid);
      visited += 1;
    }
    assert.equal(visited, DAY_COLUMNS * HOUR_SLOTS, 'the walk did not visit every cell exactly once');

    const last = DAY_COLUMNS - 1;
    await press(fixture, 'End');
    assertSameNode(document.activeElement, cells[last][HOUR_SLOTS - 1],
      'End did not land on the last hour of the focused day');
    await press(fixture, 'ArrowRight');
    assertSameNode(document.activeElement, cells[last][HOUR_SLOTS - 1],
      'ArrowRight did not clamp on the last day');
    await press(fixture, 'ArrowDown');
    assertSameNode(document.activeElement, cells[last][HOUR_SLOTS - 1],
      'ArrowDown did not clamp on the last hour');
    assert.ok(grid.contains(document.activeElement), 'focus escaped the grid at a corner');

    await press(fixture, 'Home');
    assertSameNode(document.activeElement, cells[last][0],
      'Home did not land on the first hour of the focused day, or moved the day as well');

    assertPattern({
      root: gridOf(fixture),
      bindingPath: BINDING,
      subjects: {
        default: grid,
        'roles.row': grid.querySelector('[role="row"]'),
        'roles.cell': grid.querySelector('[role="gridcell"]'),
      },
      behavioural: {
        'focus.roving': true,
        'keyboard.ArrowKeys': true,
        'keyboard.Home': true,
        'keyboard.End': true,
      },
    });
  } finally {
    fixture.destroy();
  }
});

test('Enter steps into the chip overlapping the focused hour, and Escape steps back out to the cell', async () => {
  const fixture = TestBed.createComponent(GridHost);
  fixture.detectChanges();
  await fixture.whenStable();

  try {
    const grid = gridOf(fixture);
    const cells = cellsOf(grid.querySelector('[role="row"]') as Element);

    cells[0].focus();
    fixture.detectChanges();
    await fixture.whenStable();

    await press(fixture, 'Enter');
    const chip = grid.querySelector('button[aria-label^="Standup"]');
    assertSameNode(document.activeElement, chip, 'Enter did not step into the overlapping chip');

    await press(fixture, 'Escape');
    assertSameNode(document.activeElement, cells[0], 'Escape did not step back out to the cursor cell');

    cells[1].focus();
    fixture.detectChanges();
    await fixture.whenStable();
    await press(fixture, 'Enter');
    assertSameNode(document.activeElement, cells[1],
      'Enter on an hour no chip overlaps moved focus somewhere');
  } finally {
    fixture.destroy();
  }
});

test('every day column owns its own chips through aria-owns, since a chip cannot be its DOM child here', async () => {
  const fixture = TestBed.createComponent(GridHost);
  fixture.detectChanges();
  await fixture.whenStable();

  try {
    const grid = gridOf(fixture);
    const rows = [...grid.querySelectorAll<HTMLElement>('[role="row"]')];

    for (const [index, title] of [[0, 'Standup'], [1, 'Review']] as const) {
      const owned = (rows[index].getAttribute('aria-owns') ?? '').split(/\s+/).filter(Boolean);
      assert.equal(owned.length, 1, `day ${index} owns ${owned.length} chips, expected 1`);
      const chip = grid.ownerDocument.getElementById(owned[0]);
      assert.ok(chip, `day ${index} names an id that resolves to nothing -- a dangling reference`);
      assert.match(chip.textContent ?? '', new RegExp(title),
        `day ${index} owns a chip that is not ${title}`);
      assert.ok(!rows[index].contains(chip),
        'sanity: the chip is NOT a DOM child of its row, which is the whole reason aria-owns is here');
    }

    for (const index of [2, 3, 4, 5]) {
      assert.equal(rows[index].getAttribute('aria-owns'), null,
        `day ${index} has no chips and must claim none`);
    }
  } finally {
    fixture.destroy();
  }
});
