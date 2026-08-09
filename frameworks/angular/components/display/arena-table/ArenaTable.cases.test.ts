/* Reaching the card case needs two levers: happy-dom ships no ResizeObserver that ever fires,
 * so the width stays null and every render is wide; and arenaReadBreakpoint reads --bp-md through
 * getComputedStyle, which is empty here and returns NaN. Both are undone in a finally -- the
 * document and the breakpoint CACHE are shared by the whole run, which is why this file caches
 * 768 and no other number: ArenaPageHead.variants.test.ts asserts that value on a cache hit. No key
 * event sets keyCode: nothing here goes through a CDK key manager, and the grid's cursor is
 * Arena's own and switches on event.key. The walk is one press per step against 3 rows by 2
 * columns, because the bill is the press count. Angular installs BOTH a DOM listener and an
 * output subscription for a native event name, so `activated` counts the sum and one is the
 * only passing number, while emissionsOf() counts the output alone -- assert both or be blind. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { assertNoNode, assertSameNode } from '../../../test/NodeAssert';
import type { ArenaTableColumn } from '../../../Api.generated';
import { ArenaTable } from './ArenaTable';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell';
import { assertPattern, assertPatternCases, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'display/arena-table/ArenaTable.behaviour.json');
const CELL_BINDING = join(ANGULAR_COMPONENTS, 'display/arena-table-cell/ArenaTableCell.behaviour.json');

const LABEL = 'Recent deployments';
const COLUMNS: ArenaTableColumn[] = [{ header: 'Service' }, { header: 'Status' }];
const BP_MD = '768px';
const NARROW_WIDTH = 400;

@Component({
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table [label]="label" [columns]="columns" [responsive]="responsive">
      <arena-table-row [interactive]="interactive" (click)="activated = activated + 1">
        <arena-table-cell>checkout-api</arena-table-cell>
        <arena-table-cell>Healthy</arena-table-cell>
      </arena-table-row>
      <arena-table-row [interactive]="interactive" [disabled]="disabled" (click)="activated = activated + 1">
        <arena-table-cell>billing-worker</arena-table-cell>
        <arena-table-cell>Degraded</arena-table-cell>
      </arena-table-row>
    </arena-table>
  `,
})
class TableHost {
  label = LABEL;
  columns: ArenaTableColumn[] = COLUMNS;
  responsive = false;
  interactive = false;
  disabled = false;
  activated = 0;
}

@Component({
  standalone: true,
  imports: [ArenaTable],
  template: `
    <arena-table [label]="label" [columns]="columns" [responsive]="false">
      <span empty>No deployments in this range.</span>
    </arena-table>
  `,
})
class EmptyTableHost {
  label = LABEL;
  columns: ArenaTableColumn[] = COLUMNS;
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

async function render(patch: Partial<TableHost> = {}): Promise<ComponentFixture<TableHost>> {
  const fixture = TestBed.createComponent(TableHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

function emissionsOf(fixture: ComponentFixture<TableHost>): { count: number } {
  const seen = { count: 0 };
  for (const found of fixture.debugElement.queryAll(By.directive(ArenaTableRow))) {
    (found.componentInstance as ArenaTableRow).click.subscribe(() => { seen.count += 1; });
  }
  return seen;
}

function tableOf(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement.querySelector('arena-table') as HTMLElement;
}

function cellsOf(row: Element): HTMLElement[] {
  return [...row.querySelectorAll<HTMLElement>('[role="gridcell"], [role="columnheader"]')];
}

async function press(fixture: ComponentFixture<unknown>, key: string): Promise<void> {
  const active = document.activeElement as HTMLElement;
  active.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  fixture.detectChanges();
  await fixture.whenStable();
}

async function focusCell(fixture: ComponentFixture<unknown>, cell: HTMLElement): Promise<void> {
  cell.focus();
  fixture.detectChanges();
  await fixture.whenStable();
}

function assertOneStop(root: Element): void {
  const stops = root.querySelectorAll('[tabindex="0"]');
  assert.equal(stops.length, 1, 'the roving stop did not rove -- a grid is ONE tab stop');
  assertSameNode(stops[0], document.activeElement, 'the tab stop is not the focused cell');
}

test('arena-table meets both of its declared shapes', async () => {
  document.documentElement.style.setProperty('--bp-md', BP_MD);
  const restore = stubResize(NARROW_WIDTH);
  let wide: ComponentFixture<TableHost> | null = null;
  let card: ComponentFixture<TableHost> | null = null;
  let bare: ComponentFixture<EmptyTableHost> | null = null;

  try {
    wide = await render({ responsive: false });
    const wideTable = tableOf(wide);
    const grid = wideTable.querySelector('[role="grid"]') as HTMLElement;
    assert.ok(grid, 'the wide shape must render a real grid');
    assert.equal(grid.getAttribute('aria-label'), LABEL, 'the grid name is not the `label` member');

    const rows = [...grid.querySelectorAll<HTMLElement>('[role="row"]')];
    assert.equal(rows.length, 3, 'one header row plus one row per record');
    const cells = rows.map(cellsOf);
    for (const [index, row] of cells.entries()) {
      assert.equal(row.length, COLUMNS.length, `row ${index} rendered ${row.length} cells`);
    }

    await focusCell(wide, cells[0][0]);
    assertOneStop(wideTable);

    await press(wide, 'ArrowLeft');
    assertSameNode(document.activeElement, cells[0][0], 'ArrowLeft did not clamp on the first column');
    await press(wide, 'ArrowUp');
    assertSameNode(document.activeElement, cells[0][0], 'ArrowUp did not clamp on the header row');

    let visited = 1;
    for (let r = 0; r < cells.length; r += 1) {
      const rightward = r % 2 === 0;
      const step = rightward ? 'ArrowRight' : 'ArrowLeft';
      for (let i = 1; i < COLUMNS.length; i += 1) {
        const c = rightward ? i : COLUMNS.length - 1 - i;
        await press(wide, step);
        assertSameNode(document.activeElement, cells[r][c], `${step} did not land on row ${r} column ${c}`);
        assertOneStop(wideTable);
        visited += 1;
      }
      if (r === cells.length - 1) break;
      const col = rightward ? COLUMNS.length - 1 : 0;
      await press(wide, 'ArrowDown');
      assertSameNode(document.activeElement, cells[r + 1][col], `ArrowDown did not reach row ${r + 1}`);
      visited += 1;
    }
    assert.equal(visited, cells.length * COLUMNS.length, 'the walk did not visit every cell exactly once');

    const last = cells.length - 1;
    await press(wide, 'Home');
    assertSameNode(document.activeElement, cells[last][0], 'Home did not reach the first cell of the row');
    await press(wide, 'End');
    assertSameNode(document.activeElement, cells[last][COLUMNS.length - 1],
      'End did not reach the last cell of the row');
    await press(wide, 'ArrowDown');
    assertSameNode(document.activeElement, cells[last][COLUMNS.length - 1],
      'ArrowDown did not clamp on the last row');

    card = await render({ responsive: true });
    const cardTable = tableOf(card);

    bare = TestBed.createComponent(EmptyTableHost);
    bare.detectChanges();
    await bare.whenStable();

    assertPatternCases({
      bindingPath: BINDING,
      cases: {
        wide: () => ({
          root: wideTable,
          subjects: {
            default: grid,
            'roles.row': rows[0],
            'roles.cell': grid.querySelector('[role="gridcell"]'),
          },
          behavioural: {
            'focus.roving': true,
            'keyboard.ArrowKeys': true,
            'keyboard.Home': true,
            'keyboard.End': true,
          },
        }),
        card: () => {
          assertNoNode(cardTable.querySelector('[role="grid"]'),
            'below --bp-md there is no grid at all, which is why this case binds `none`');
          assertNoNode(cardTable.querySelector('[role="row"]'), 'the card shape renders no row role');
          assert.equal(cardTable.querySelectorAll('[role="gridcell"]').length, 0,
            'no cells means no roving tab stop to claim -- the requirement does not apply rather than going unmet');
          assert.equal(cardTable.querySelectorAll('[tabindex]').length, 0,
            'a card row that is not `interactive` claims no tab stop -- which is what keeps a dead stop off '
            + 'every row of every table that is not clickable');
          return { root: cardTable, subjects: { default: cardTable } };
        },
        empty: () => {
          const emptyTable = tableOf(bare!);
          assertNoNode(emptyTable.querySelector('[role="grid"]'),
            'with no rows there is no grid at all, which is why this case binds `none`');
          assertNoNode(emptyTable.querySelector('[role="columnheader"]'),
            'and no orphan header standing over the sentence that says there is nothing');
          assert.equal(emptyTable.querySelectorAll('[tabindex]').length, 0,
            'nothing to rove over means no tab stop to claim');
          return { root: emptyTable, subjects: { default: emptyTable } };
        },
      },
    });
  } finally {
    wide?.destroy();
    card?.destroy();
    bare?.destroy();
    restore();
    document.documentElement.style.removeProperty('--bp-md');
  }
});

test('arena-table-cell owns none of the grid it sits in -- the row has its own cases suite', async () => {
  const fixture = await render();
  try {
    const table = tableOf(fixture);
    const cell = table.querySelector('[role="gridcell"]') as HTMLElement;

    assertPattern({ root: table, bindingPath: CELL_BINDING, subjects: { default: cell } });
  } finally {
    fixture.destroy();
  }
});

test('a pointer click on a row reaches the consumer exactly once -- twice would mean the native event got through too', async () => {
  const fixture = await render({ interactive: true });
  try {
    const table = tableOf(fixture);
    const row = table.querySelectorAll('[role="row"]')[1] as HTMLElement;

    const emitted = emissionsOf(fixture);
    row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    assert.equal(emitted.count, 1, 'the click OUTPUT did not emit exactly once');
    assert.equal(fixture.componentInstance.activated, 1,
      'the consumer heard the click a number of times other than one');
  } finally {
    fixture.destroy();
  }
});

test('Enter on a cell activates the row it belongs to, and no other', async () => {
  const fixture = await render({ interactive: true });
  try {
    const table = tableOf(fixture);
    const rows = [...table.querySelectorAll<HTMLElement>('[role="row"]')];

    const emitted = emissionsOf(fixture);
    await focusCell(fixture, cellsOf(rows[2])[0]);
    await press(fixture, 'Enter');
    assert.equal(emitted.count, 1, 'Enter on a data cell did not reach the click OUTPUT');
    assert.equal(fixture.componentInstance.activated, 1, 'Enter on a data cell did not activate its row');

    await focusCell(fixture, cellsOf(rows[0])[0]);
    await press(fixture, 'Enter');
    assert.equal(emitted.count, 1, 'Enter on a COLUMN HEADER reached a row output');
    assert.equal(fixture.componentInstance.activated, 1,
      'Enter on a COLUMN HEADER activated a row -- the header is row 0 and belongs to no record');
  } finally {
    fixture.destroy();
  }
});

test('a disabled row announces itself and refuses both routes -- the pointer and the grid Enter', async () => {
  const fixture = await render({ disabled: true });
  try {
    const table = tableOf(fixture);
    const rows = [...table.querySelectorAll<HTMLElement>('[role="row"]')];
    const locked = rows[2];

    assert.equal(locked.getAttribute('aria-disabled'), 'true',
      'a locked row must announce itself rather than look identical to an available one');
    assert.equal(locked.hasAttribute('disabled'), false,
      'the row reflects through aria-disabled, never the native attribute');

    const emitted = emissionsOf(fixture);
    locked.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    assert.equal(emitted.count, 0, 'a disabled row emitted click');
    assert.equal(fixture.componentInstance.activated, 0,
      'and nothing reached the consumer, so the native event did not escape either');

    await focusCell(fixture, cellsOf(locked)[0]);
    await press(fixture, 'Enter');
    assert.equal(emitted.count, 0, 'Enter activated a disabled row');
    assert.equal(fixture.componentInstance.activated, 0, 'Enter reached the consumer through a disabled row');
  } finally {
    fixture.destroy();
  }
});

test('the cursor is clamped against the cells that are really there, not against the column count', async () => {
  const fixture = await render({ columns: [{ header: 'Service' }, { header: 'Status' }, { header: 'Owner' }] });
  try {
    const table = tableOf(fixture);
    const rows = [...table.querySelectorAll<HTMLElement>('[role="row"]')];
    const header = cellsOf(rows[0]);
    assert.equal(header.length, 3, 'the header draws one cell per column');
    assert.equal(cellsOf(rows[1]).length, 2, 'the fixture rows carry fewer cells than there are columns');

    await focusCell(fixture, header[2]);
    await press(fixture, 'ArrowDown');
    assertSameNode(document.activeElement, cellsOf(rows[1])[1],
      'the cursor did not clamp onto the last cell the row really has');
  } finally {
    fixture.destroy();
  }
});

test('an empty table draws its [empty] slot and NO grid at all', async () => {
  const fixture = TestBed.createComponent(EmptyTableHost);
  fixture.detectChanges();
  await fixture.whenStable();
  try {
    const table = fixture.nativeElement.querySelector('arena-table') as HTMLElement;
    assertNoNode(table.querySelector('[role="grid"]'),
      'a grid holding neither a header row nor a data row is a degenerate render, the same '
      + 'judgement ArenaTabs makes when it draws no panel for a tab that does not exist');
    assertNoNode(table.querySelector('[role="columnheader"]'),
      'a column head over a "no results" sentence describes a table that is not there, which is '
      + 'why 16 tables in a real consumer replaced the slot with an @if that removed the table');
    assert.equal(table.querySelectorAll('[role="gridcell"]').length, 0, 'an empty table renders no data cell');
    assert.equal(table.querySelectorAll('[role="row"]').length, 0, 'and no row either');
    assert.match(table.textContent ?? '', /No deployments in this range\./,
      'the [empty] slot did not project');
  } finally {
    fixture.destroy();
  }
});

test('`label` is guarded at runtime, because input.required proves only that something was bound', async () => {
  const fixture = TestBed.createComponent(TableHost);
  fixture.componentInstance.label = '   ';
  assert.throws(() => fixture.detectChanges(), /label. is required/,
    'a whitespace label left the grid unnamed and nothing complained');
  fixture.destroy();
});
