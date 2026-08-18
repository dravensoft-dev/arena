/* Sorting existed only above --bp-md, and nothing said so: card mode draws no header row, and a
 * `sortable` column's whole affordance IS the header row, so the feature was silently missing on
 * the device that needs it most, where the reader cannot see the list at all. Reaching card mode
 * needs the same two levers ArenaTable.cases.test.ts uses and undoes: happy-dom's ResizeObserver never
 * fires, and --bp-md reads empty. 768 is the only value cached here, because
 * ArenaPageHead.variants.test.ts asserts that number on a cache hit and the cache is shared. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { ArenaTableColumn, ArenaTableSort, ArenaTableSortControl } from '../../../Api.generated';
import { ArenaTable, arenaParseSortOption, arenaSortOptionValue } from './ArenaTable';
import { forgetArenaWarnings } from '../../../WarnOnce';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell';

const LABEL = 'Recent sales';
const BP_MD = '768px';
const NARROW_WIDTH = 390;

const COLUMNS: ArenaTableColumn[] = [
  { header: 'Customer', sortable: true },
  { header: 'Status' },
  { header: 'Total', sortable: true },
];

@Component({
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table [label]="label" [columns]="columns" [sort]="sort()" [sortControl]="control"
                 (sortChange)="seen.push($event)">
      <tr arena-table-row>
        <td arena-table-cell>Andina</td>
        <td arena-table-cell>Paid</td>
        <td arena-table-cell>1042</td>
      </tr>
    </arena-table>
  `,
})
class SortControlHost {
  label = LABEL;
  columns = COLUMNS;
  control: ArenaTableSortControl = 'auto';
  readonly sort = signal<ArenaTableSort | undefined>({ column: 2, direction: 'desc' });
  seen: ArenaTableSort[] = [];
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

async function render(patch: Partial<SortControlHost> = {}): Promise<ComponentFixture<SortControlHost>> {
  const fixture = TestBed.createComponent(SortControlHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

function select(fixture: ComponentFixture<SortControlHost>): HTMLSelectElement | null {
  return (fixture.nativeElement as Element).querySelector('select');
}

test('the option value round-trips, so the control edits the same ArenaTableSort the header does', () => {
  assert.equal(arenaSortOptionValue(2, 'desc'), '2:desc');
  assert.deepEqual(arenaParseSortOption('2:desc'), { column: 2, direction: 'desc' });
  assert.deepEqual(arenaParseSortOption('0:asc'), { column: 0, direction: 'asc' });
  assert.equal(arenaParseSortOption('2:sideways'), null);
  assert.equal(arenaParseSortOption('nope:asc'), null);
});

test('card mode draws a sort control, and picking one emits the same sortChange a header would', async () => {
  document.documentElement.style.setProperty('--bp-md', BP_MD);
  const restore = stubResize(NARROW_WIDTH);
  let fixture: ComponentFixture<SortControlHost> | null = null;
  try {
    fixture = await render();
    const host = fixture.nativeElement as Element;

    assert.equal(host.querySelectorAll('th').length, 0,
      'card mode must not bring the header row back: it exists because a grid does not fit');

    const control = select(fixture);
    assert.ok(control, 'a sortable column below --bp-md had no control at all, which is the gap');
    assert.deepEqual(
      [...control.options].map((option) => option.value),
      ['0:asc', '0:desc', '2:asc', '2:desc'],
      'every sortable column in both directions, and no column that is not sortable',
    );
    assert.equal(control.value, '2:desc', 'the control shows the order that is in effect');

    control.value = '0:asc';
    control.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    assert.deepEqual(fixture.componentInstance.seen, [{ column: 0, direction: 'asc' }],
      'the control reports through sortChange, so there is one channel and not two');
  } finally {
    fixture?.destroy();
    restore();
    document.documentElement.style.removeProperty('--bp-md');
  }
});

test('sortControl="none" draws nothing, and neither does a table with no sort at all', async () => {
  document.documentElement.style.setProperty('--bp-md', BP_MD);
  const restore = stubResize(NARROW_WIDTH);
  let off: ComponentFixture<SortControlHost> | null = null;
  let unsorted: ComponentFixture<SortControlHost> | null = null;
  try {
    off = await render({ control: 'none' });
    assert.equal(select(off), null, 'none leaves card mode unsorted by hand, which is a real choice');

    unsorted = TestBed.createComponent(SortControlHost);
    unsorted.componentInstance.sort.set(undefined);
    unsorted.detectChanges();
    await unsorted.whenStable();
    unsorted.detectChanges();
    assert.equal(select(unsorted), null,
      'without `sort` no header is a target either, so a control that edits nothing must not draw');
  } finally {
    off?.destroy();
    unsorted?.destroy();
    restore();
    document.documentElement.style.removeProperty('--bp-md');
  }
});

test('the wide shape draws no control, because there the header row IS the control', async () => {
  let fixture: ComponentFixture<SortControlHost> | null = null;
  try {
    fixture = await render();
    assert.equal(select(fixture), null, 'a second affordance for one state is one too many');
    assert.ok((fixture.nativeElement as Element).querySelectorAll('th').length > 0);
  } finally { fixture?.destroy(); }
});

test('a sort aimed at a column that is not sortable warns once, instead of drawing nothing quietly', async () => {
  const messages: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => { messages.push(args.map(String).join(' ')); };
  let fixture: ComponentFixture<SortControlHost> | null = null;
  try {
    forgetArenaWarnings();
    fixture = TestBed.createComponent(SortControlHost);
    fixture.componentInstance.sort.set({ column: 1, direction: 'asc' });
    fixture.detectChanges();
    await fixture.whenStable();

    assert.equal(messages.length, 1,
      'no caret, no target and no message is the silent way to be misconfigured');
    assert.match(messages[0], /"Status"/, 'the message must name the column it landed on');
    assert.match(messages[0], /sortable/);

    fixture.detectChanges();
    assert.equal(messages.length, 1, 'once per message, not once per change detection pass');
  } finally {
    console.warn = original;
    fixture?.destroy();
    forgetArenaWarnings();
  }
});
