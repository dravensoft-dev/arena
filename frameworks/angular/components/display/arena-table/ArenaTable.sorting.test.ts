/* Sorting costs no tab stop, and that is the whole reason it is a header activation rather than
 * a control inside the header: the header row is already row 0 of the grid's roving cursor, so
 * Enter and Space land on the cell the user is already on. `grid.json` asks for no aria-sort,
 * and it is not widened to: `requires` is a flat map, so the key would oblige every component
 * that binds the pattern. It is asserted here instead. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { ArenaTableColumn, ArenaTableSort } from '../../../Api.generated';
import { ArenaTable } from './ArenaTable';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell';

const LABEL = 'Recent deployments';
const COLUMNS: ArenaTableColumn[] = [
  { header: 'Service', sortable: true },
  { header: 'Status' },
  { header: 'p95', sortable: true },
];

@Component({
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table [label]="label" [columns]="columns" [responsive]="false" [sort]="sort()"
                 (sortChange)="seen.push($event)">
      <arena-table-row interactive (click)="activated = activated + 1">
        <arena-table-cell>checkout</arena-table-cell>
        <arena-table-cell>Healthy</arena-table-cell>
        <arena-table-cell>91</arena-table-cell>
      </arena-table-row>
    </arena-table>
  `,
})
class SortHost {
  label = LABEL;
  columns = COLUMNS;
  readonly sort = signal<ArenaTableSort | undefined>(undefined);
  seen: ArenaTableSort[] = [];
  activated = 0;
}

function render(sort?: ArenaTableSort): ComponentFixture<SortHost> {
  const fixture = TestBed.createComponent(SortHost);
  fixture.componentInstance.sort.set(sort);
  fixture.detectChanges();
  return fixture;
}

function headers(fixture: ComponentFixture<SortHost>): HTMLElement[] {
  return [...(fixture.nativeElement as Element).querySelectorAll<HTMLElement>('[role="columnheader"]')];
}

function press(fixture: ComponentFixture<SortHost>, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  (document.activeElement as HTMLElement).dispatchEvent(event);
  fixture.detectChanges();
  return event;
}

test('with no `sort` no header is a target, however many columns declare sortable', () => {
  const fixture = render();
  try {
    for (const th of headers(fixture)) {
      assert.equal(th.hasAttribute('aria-sort'), false,
        'a header that draws a sort state it does not know is worse than one that draws none');
    }
  } finally { fixture.destroy(); }
});

test('aria-sort names the sorted column and says `none` on the other sortable ones', () => {
  const fixture = render({ column: 0, direction: 'asc' });
  try {
    const th = headers(fixture);
    assert.equal(th[0]?.getAttribute('aria-sort'), 'ascending');
    assert.equal(th[1]?.hasAttribute('aria-sort'), false, 'a column that is not sortable claims no sort state');
    assert.equal(th[2]?.getAttribute('aria-sort'), 'none');
  } finally { fixture.destroy(); }
});

test('descending is announced as descending, not as a second ascending', () => {
  const fixture = render({ column: 2, direction: 'desc' });
  try {
    assert.equal(headers(fixture)[2]?.getAttribute('aria-sort'), 'descending');
  } finally { fixture.destroy(); }
});

test('activating the sorted column flips it; a different column starts ascending', () => {
  const fixture = render({ column: 0, direction: 'asc' });
  try {
    const th = headers(fixture);
    th[0]?.click();
    th[2]?.click();
    th[1]?.click();
    fixture.detectChanges();
    assert.deepEqual(fixture.componentInstance.seen, [
      { column: 0, direction: 'desc' },
      { column: 2, direction: 'asc' },
    ], 'a non-sortable header must emit nothing at all');
  } finally { fixture.destroy(); }
});

test('Enter and Space on a header sort it, and neither adds a tab stop', () => {
  const fixture = render({ column: 0, direction: 'asc' });
  try {
    const root = fixture.nativeElement as Element;
    headers(fixture)[0]?.focus();
    fixture.detectChanges();
    assert.equal(root.querySelectorAll('[tabindex="0"]').length, 1,
      'a sortable header must not add a stop of its own -- the grid is ONE tab stop');

    const enter = press(fixture, 'Enter');
    assert.equal(enter.defaultPrevented, true, 'Enter was not claimed by the header');
    const space = press(fixture, ' ');
    assert.equal(space.defaultPrevented, true,
      'Space must be prevented, or the page scrolls under the header the user just pressed');
    assert.equal(fixture.componentInstance.seen.length, 2, 'both keys must activate the header');
    assert.equal(root.querySelectorAll('[tabindex="0"]').length, 1, 'and neither may add a stop');
  } finally { fixture.destroy(); }
});

test('Enter on a DATA row still activates the row, not a sort', () => {
  const fixture = render({ column: 0, direction: 'asc' });
  try {
    const cell = (fixture.nativeElement as Element).querySelector<HTMLElement>('[role="gridcell"]');
    cell?.focus();
    fixture.detectChanges();
    press(fixture, 'Enter');
    assert.equal(fixture.componentInstance.activated, 1, 'Enter on a data row must reach that row');
    assert.deepEqual(fixture.componentInstance.seen, [], 'and must not be read as a sort');
  } finally { fixture.destroy(); }
});
