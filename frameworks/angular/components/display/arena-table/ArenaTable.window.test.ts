/* A windowed grid mounts a few rows of a long list, and the reader's place in it is a record, not
 * a position in the DOM. The window moves under the cursor as the consumer follows the scroll, so
 * the cursor is held against the whole list, and the Tab stop is the row the reader left whenever
 * that row is mounted and the nearest mounted row when it is not. Rows are tracked by record, as a
 * windowed list tracks them, so a cell that holds focus survives the shift of the window. No
 * breakpoint is set: every table here is not responsive, and none may read one. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Component, computed, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { assertSameNode } from '../../../test/NodeAssert';
import type { ArenaTableColumn } from '../../../Api.generated';
import { forgetArenaBreakpoints } from '../../../ContainerSize';
import { forgetArenaWarnings } from '../../../WarnOnce';
import { ArenaTable } from './ArenaTable';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell';

const LABEL = 'Recent deployments';
const COLUMNS: ArenaTableColumn[] = [{ header: 'Service' }, { header: 'Status' }];
const TOTAL = 20_000;
const WINDOW_ROWS = 20;
const FIRST_OFFSET = 100;
const EDGE_ROWS = 3;
const STEP = 5;
const KEY_PRESSES = 25;

const warnings: string[] = [];
const savedWarn = console.warn;

beforeEach(() => {
  forgetArenaWarnings();
  forgetArenaBreakpoints();
  document.documentElement.style.removeProperty('--bp-md');
  warnings.length = 0;
  console.warn = (message: string) => { warnings.push(message); };
});
afterEach(() => { console.warn = savedWarn; });

@Component({
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table [label]="label" [columns]="columns" [responsive]="false" [slice]="slice()">
      @for (record of records(); track record) {
        <tr arena-table-row>
          <td arena-table-cell>rec-{{ record }}</td>
          <td arena-table-cell>Healthy</td>
        </tr>
      }
    </arena-table>
  `,
})
class WindowHost {
  label = LABEL;
  columns = COLUMNS;
  readonly offset = signal(FIRST_OFFSET);
  readonly count = signal(WINDOW_ROWS);
  readonly slice = computed(() => ({ total: TOTAL, offset: this.offset() }));
  readonly records = computed(() => Array.from({ length: this.count() }, (_, i) => this.offset() + i));
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
}

async function windowed(count = WINDOW_ROWS): Promise<ComponentFixture<WindowHost>> {
  const fixture = TestBed.createComponent(WindowHost);
  fixture.componentInstance.count.set(count);
  await settle(fixture);
  return fixture;
}

async function scrollTo(fixture: ComponentFixture<WindowHost>, offset: number): Promise<void> {
  fixture.componentInstance.offset.set(offset);
  await settle(fixture);
}

async function press(fixture: ComponentFixture<unknown>, key: string): Promise<void> {
  const active = document.activeElement as HTMLElement;
  active.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  await settle(fixture);
}

async function focusHeader(fixture: ComponentFixture<unknown>): Promise<void> {
  (fixture.nativeElement as Element).querySelector<HTMLElement>('th[tabindex="0"]')!.focus();
  await settle(fixture);
}

function theStop(root: Element): HTMLElement {
  const all = [...root.querySelectorAll<HTMLElement>('[tabindex="0"]')];
  assert.equal(all.length, 1, 'a grid is ONE tab stop');
  return all[0]!;
}

function recordOf(cell: HTMLElement): { index: string | null; text: string } {
  const row = cell.closest('tr');
  return { index: row?.getAttribute('aria-rowindex') ?? null, text: row?.firstElementChild?.textContent ?? '' };
}

function expectedStop(record: number) {
  return { index: String(record + 2), text: `rec-${record}` };
}

const cellIndexOf = (cell: HTMLElement) => [...(cell.parentElement?.children ?? [])].indexOf(cell);

test('the cursor keeps its record while the window shifts under 25 ArrowDown presses', async () => {
  const fixture = await windowed();
  try {
    const root = fixture.nativeElement as Element;
    await focusHeader(fixture);
    let offset = FIRST_OFFSET;
    for (let count = 1; count <= KEY_PRESSES; count += 1) {
      await press(fixture, 'ArrowDown');
      const record = FIRST_OFFSET + count - 1;
      const stop = theStop(root);
      assert.deepEqual(recordOf(stop), expectedStop(record), `press ${count} left the stop on another record`);
      assertSameNode(document.activeElement, stop, `press ${count} left focus away from the stop`);
      if (record - offset + 1 > WINDOW_ROWS - EDGE_ROWS) {
        offset += STEP;
        await scrollTo(fixture, offset);
        const after = theStop(root);
        assert.deepEqual(recordOf(after), expectedStop(record), `shifting to ${offset} moved the cursor off its record`);
        assertSameNode(document.activeElement, after, `shifting to ${offset} dropped focus`);
      }
    }
  } finally {
    fixture.destroy();
  }
});

test('the cursor resumes where it was after the window leaves and returns', async () => {
  const fixture = await windowed();
  try {
    const root = fixture.nativeElement as Element;
    await focusHeader(fixture);
    for (let i = 0; i < 5; i += 1) await press(fixture, 'ArrowDown');
    await press(fixture, 'ArrowRight');
    const before = theStop(root);
    assert.deepEqual(recordOf(before), expectedStop(FIRST_OFFSET + 4));
    assert.equal(cellIndexOf(before), 1);

    await scrollTo(fixture, 5000);
    const away = theStop(root);
    assert.deepEqual(recordOf(away), expectedStop(5000), 'above the window, the first mounted row carries the stop');
    assert.equal(cellIndexOf(away), 1, 'the column of the cursor is kept on the stand-in row');

    await scrollTo(fixture, FIRST_OFFSET);
    assert.deepEqual(recordOf(theStop(root)), expectedStop(FIRST_OFFSET + 4), 'the cursor did not resume on its record');

    await scrollTo(fixture, 0);
    const below = theStop(root);
    assert.deepEqual(recordOf(below), expectedStop(WINDOW_ROWS - 1), 'below the window, the last mounted row carries the stop');
    assert.equal(cellIndexOf(below), 1);

    await scrollTo(fixture, FIRST_OFFSET);
    assert.deepEqual(recordOf(theStop(root)), expectedStop(FIRST_OFFSET + 4), 'the cursor did not resume after the second absence');
  } finally {
    fixture.destroy();
  }
});

test('the header is projected at every offset and holds the stop while the cursor rests on it', async () => {
  const fixture = await windowed();
  try {
    const root = fixture.nativeElement as Element;
    for (const offset of [FIRST_OFFSET, 5000, 0, 19_980]) {
      await scrollTo(fixture, offset);
      const stop = theStop(root);
      assert.equal(stop.tagName, 'TH', `at offset ${offset} the cursor on the header lost its stop`);
      assert.equal(root.querySelectorAll('thead th').length, COLUMNS.length);
    }
  } finally {
    fixture.destroy();
  }
});

test('ArrowUp at the first mounted row clamps there, because the row above is not mounted', async () => {
  const fixture = await windowed();
  try {
    await focusHeader(fixture);
    await press(fixture, 'ArrowDown');
    await press(fixture, 'ArrowUp');
    const stop = theStop(fixture.nativeElement as Element);
    assert.deepEqual(recordOf(stop), expectedStop(FIRST_OFFSET));
    assertSameNode(document.activeElement, stop);
  } finally {
    fixture.destroy();
  }
});

@Component({
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table [label]="label" [columns]="columns" [responsive]="false">
      @for (record of records(); track record) {
        <tr arena-table-row>
          <td arena-table-cell>rec-{{ record }}</td>
          <td arena-table-cell>Healthy</td>
        </tr>
      }
    </arena-table>
  `,
})
class PlainHost {
  label = LABEL;
  columns = COLUMNS;
  readonly count = signal(5);
  readonly records = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}

test('without a slice the cursor is projected, so fewer rows clamp it onto the last one', async () => {
  const fixture = TestBed.createComponent(PlainHost);
  await settle(fixture);
  try {
    const root = fixture.nativeElement as Element;
    await focusHeader(fixture);
    for (let i = 0; i < 5; i += 1) await press(fixture, 'ArrowDown');
    assert.equal(recordOf(theStop(root)).text, 'rec-4');
    fixture.componentInstance.count.set(3);
    await settle(fixture);
    assert.equal(recordOf(theStop(root)).text, 'rec-2', 'the shipped clamp onto the last projected row changed');
  } finally {
    fixture.destroy();
  }
});

test('a table that is not responsive reads no breakpoint and prints no warning', async () => {
  const fixture = TestBed.createComponent(PlainHost);
  await settle(fixture);
  try {
    assert.ok((fixture.nativeElement as Element).querySelector('table'));
    assert.deepEqual(warnings, []);
  } finally {
    fixture.destroy();
  }
});
