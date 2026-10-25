/* A windowed grid with `slice.view` answers the page keys against the whole list. A target inside
 * the window moves the cursor, a target outside is asked of the consumer once and held until a
 * later render projects it, and without `view` the page keeps its own keys. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Component, computed, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { assertNotSameNode, assertSameNode } from '../../../test/NodeAssert';
import type { ArenaTableColumn } from '../../../Api.generated';
import { ArenaTable } from './ArenaTable';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell';

const LABEL = 'Recent deployments';
const COLUMNS: ArenaTableColumn[] = [{ header: 'Service' }, { header: 'Status' }];
const TOTAL = 20_000;
const FIRST_OFFSET = 100;
const PAGE_ROWS = 10;
const FEW_ROWS = 8;
const MANY_ROWS = 20;

const warnings: string[] = [];
const savedWarn = console.warn;

beforeEach(() => {
  warnings.length = 0;
  console.warn = (message: string) => { warnings.push(message); };
});
afterEach(() => { console.warn = savedWarn; });

@Component({
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table [label]="label" [columns]="columns" [responsive]="false" [slice]="slice()"
                 (rowRequest)="requests.push($event)">
      @for (record of records(); track record) {
        <tr arena-table-row>
          <td arena-table-cell>rec-{{ record }}</td>
          <td arena-table-cell>Healthy</td>
        </tr>
      }
    </arena-table>
  `,
})
class RequestHost {
  label = LABEL;
  columns = COLUMNS;
  readonly requests: number[] = [];
  readonly offset = signal(FIRST_OFFSET);
  readonly count = signal(FEW_ROWS);
  readonly view = signal<number | undefined>(PAGE_ROWS);
  readonly slice = computed(() => {
    const view = this.view();
    return view === undefined ? { total: TOTAL, offset: this.offset() } : { total: TOTAL, offset: this.offset(), view };
  });
  readonly records = computed(() => Array.from({ length: this.count() }, (_, i) => this.offset() + i));
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
}

async function windowed(count: number, view: number | null = PAGE_ROWS): Promise<ComponentFixture<RequestHost>> {
  const fixture = TestBed.createComponent(RequestHost);
  fixture.componentInstance.count.set(count);
  fixture.componentInstance.view.set(view ?? undefined);
  await settle(fixture);
  (fixture.nativeElement as Element).querySelector<HTMLElement>('th[tabindex="0"]')!.focus();
  await settle(fixture);
  await press(fixture, 'ArrowDown');
  return fixture;
}

async function press(
  fixture: ComponentFixture<unknown>, key: string, init: KeyboardEventInit = {},
): Promise<KeyboardEvent> {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  (document.activeElement as HTMLElement).dispatchEvent(event);
  await settle(fixture);
  return event;
}

async function scrollTo(fixture: ComponentFixture<RequestHost>, offset: number): Promise<void> {
  fixture.componentInstance.offset.set(offset);
  await settle(fixture);
}

function theStop(root: Element): HTMLElement {
  const all = [...root.querySelectorAll<HTMLElement>('[tabindex="0"]')];
  assert.equal(all.length, 1, 'a grid is ONE tab stop');
  return all[0]!;
}

const recordText = (cell: HTMLElement) => cell.closest('tr')?.firstElementChild?.textContent ?? '';

test('PageDown with a view emits once for a target outside the window and not again on a re-render', async () => {
  const fixture = await windowed(FEW_ROWS);
  try {
    const event = await press(fixture, 'PageDown');
    assert.deepEqual(fixture.componentInstance.requests, [FIRST_OFFSET + PAGE_ROWS]);
    assert.equal(event.defaultPrevented, true);
    fixture.componentInstance.count.set(FEW_ROWS + 1);
    await settle(fixture);
    fixture.componentInstance.count.set(FEW_ROWS);
    await settle(fixture);
    assert.deepEqual(fixture.componentInstance.requests, [FIRST_OFFSET + PAGE_ROWS], 'a re-render asked for the same row again');
    const stop = theStop(fixture.nativeElement as Element);
    assert.equal(recordText(stop), `rec-${FIRST_OFFSET}`, 'the cursor moved before the row arrived');
  } finally {
    fixture.destroy();
  }
});

test('PageDown with a view moves the cursor to a target inside the window and emits nothing', async () => {
  const fixture = await windowed(MANY_ROWS);
  try {
    const root = fixture.nativeElement as Element;
    await press(fixture, 'PageDown');
    assert.deepEqual(fixture.componentInstance.requests, []);
    const stop = theStop(root);
    assert.equal(recordText(stop), `rec-${FIRST_OFFSET + PAGE_ROWS}`);
    assertSameNode(document.activeElement, stop);
    await press(fixture, 'PageUp');
    assert.equal(recordText(theStop(root)), `rec-${FIRST_OFFSET}`);
    assert.deepEqual(fixture.componentInstance.requests, []);
  } finally {
    fixture.destroy();
  }
});

test('without a view PageUp and PageDown are left to the page, the Control keys act as Home and End, and nothing is emitted', async () => {
  const fixture = await windowed(FEW_ROWS, null);
  try {
    const keys: Array<[string, KeyboardEventInit]> = [
      ['PageDown', {}], ['PageUp', {}], ['Home', { ctrlKey: true }], ['End', { ctrlKey: true }],
    ];
    for (const [key, init] of keys) {
      const event = await press(fixture, key, init);
      const shipped = key === 'Home' || key === 'End';
      assert.equal(event.defaultPrevented, shipped, `${key} was handled without a view`);
    }
    assert.deepEqual(fixture.componentInstance.requests, []);
    const stop = theStop(fixture.nativeElement as Element);
    assert.equal(recordText(stop), `rec-${FIRST_OFFSET}`);
  } finally {
    fixture.destroy();
  }
});

test('the pending target takes focus on its cell when a later render projects it', async () => {
  const fixture = await windowed(FEW_ROWS);
  try {
    await press(fixture, 'PageDown');
    assert.deepEqual(fixture.componentInstance.requests, [FIRST_OFFSET + PAGE_ROWS]);
    await scrollTo(fixture, FIRST_OFFSET + 6);
    const stop = theStop(fixture.nativeElement as Element);
    assert.equal(recordText(stop), `rec-${FIRST_OFFSET + PAGE_ROWS}`, 'the arrived row does not hold the stop');
    assertSameNode(document.activeElement, stop, 'the arrived cell did not take focus');
    assert.deepEqual(fixture.componentInstance.requests, [FIRST_OFFSET + PAGE_ROWS]);
  } finally {
    fixture.destroy();
  }
});

test('ArrowDown cancels the pending target', async () => {
  const fixture = await windowed(FEW_ROWS);
  try {
    await press(fixture, 'PageDown');
    await press(fixture, 'ArrowDown');
    await scrollTo(fixture, FIRST_OFFSET + 4);
    assert.deepEqual(fixture.componentInstance.requests, [FIRST_OFFSET + PAGE_ROWS]);
    const stop = theStop(fixture.nativeElement as Element);
    assert.notEqual(recordText(stop), `rec-${FIRST_OFFSET + PAGE_ROWS}`, 'a cancelled request still moved the cursor');
    assertNotSameNode(document.activeElement, stop);
  } finally {
    fixture.destroy();
  }
});

test('Control End emits the last row and Control Home the first from far away', async () => {
  const fixture = await windowed(FEW_ROWS);
  try {
    const end = await press(fixture, 'End', { ctrlKey: true });
    assert.equal(end.defaultPrevented, true);
    assert.deepEqual(fixture.componentInstance.requests, [TOTAL - 1]);
    await scrollTo(fixture, FIRST_OFFSET);
    const home = await press(fixture, 'Home', { ctrlKey: true });
    assert.equal(home.defaultPrevented, true);
    assert.deepEqual(fixture.componentInstance.requests, [TOTAL - 1, 0]);
  } finally {
    fixture.destroy();
  }
});

test('a requested row that leaves the window and returns takes focus again until the reader acts', async () => {
  const fixture = await windowed(FEW_ROWS);
  try {
    const root = fixture.nativeElement as Element;
    await press(fixture, 'PageDown');
    await scrollTo(fixture, FIRST_OFFSET + 6);
    assertSameNode(document.activeElement, theStop(root));
    await scrollTo(fixture, 5000);
    assert.notEqual(recordText(theStop(root)), `rec-${FIRST_OFFSET + PAGE_ROWS}`);
    await scrollTo(fixture, FIRST_OFFSET + 8);
    const stop = theStop(root);
    assert.equal(recordText(stop), `rec-${FIRST_OFFSET + PAGE_ROWS}`);
    assertSameNode(document.activeElement, stop, 'the returning row did not take focus');
    await press(fixture, 'ArrowRight');
    await scrollTo(fixture, 5000);
    await scrollTo(fixture, FIRST_OFFSET + 8);
    assertNotSameNode(document.activeElement, theStop(root), 'a reader who acted had focus taken back');
    assert.ok(warnings.every((line) => line.startsWith('NG0956')), 'a far jump may only warn about recreating the window');
  } finally {
    fixture.destroy();
  }
});
