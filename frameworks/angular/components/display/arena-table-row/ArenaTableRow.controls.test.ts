/* The canonical data table puts a selection control in the first cell and a row action in the
 * last, and an interactive row is a click target under both of them. `activated` counts what a
 * CONSUMER hears, which for a native event name is the sum of the output and the bubbled DOM
 * event, so one is the only passing number and two is the defect. The controls here are plain
 * elements rather than Arena components: what is being asserted is the predicate over the DOM,
 * and a real ArenaCheckbox would test its own render at the same time. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { ArenaTableColumn } from '../../../Api.generated';
import { ArenaTable } from '../arena-table/ArenaTable';
import { ArenaTableRow } from './ArenaTableRow';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell';

const COLUMNS: ArenaTableColumn[] = [{ header: 'Pick' }, { header: 'Service' }, { header: 'Act' }];

@Component({
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table label="Recent deployments" [columns]="columns" [responsive]="false">
      <arena-table-row [interactive]="interactive" (click)="activated = activated + 1">
        <arena-table-cell>
          <input type="checkbox" (change)="ticked = ticked + 1" />
        </arena-table-cell>
        <arena-table-cell>checkout-api</arena-table-cell>
        <arena-table-cell>
          <button type="button" (click)="ran = ran + 1">Retry</button>
        </arena-table-cell>
      </arena-table-row>
    </arena-table>
  `,
})
class ControlsHost {
  columns: ArenaTableColumn[] = COLUMNS;
  interactive = true;
  activated = 0;
  ticked = 0;
  ran = 0;
}

function render(patch: Partial<ControlsHost> = {}): ComponentFixture<ControlsHost> {
  const fixture = TestBed.createComponent(ControlsHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  return fixture;
}

function click(el: Element): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

test('a control inside a cell keeps its own activation, and the row takes none of it', () => {
  const fixture = render();
  try {
    const host = fixture.nativeElement as HTMLElement;
    click(host.querySelector('button') as Element);
    fixture.detectChanges();
    assert.equal(fixture.componentInstance.ran, 1, 'the action did not fire, or fired twice');
    assert.equal(fixture.componentInstance.activated, 0, 'the row activated under its own action');
  } finally {
    fixture.destroy();
  }
});

test('a checkbox in the first column ticks without navigating the reader away', () => {
  const fixture = render();
  try {
    const box = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    box.click();
    fixture.detectChanges();
    assert.equal(fixture.componentInstance.ticked, 1);
    assert.equal(fixture.componentInstance.activated, 0, 'ticking a box activated the row');
  } finally {
    fixture.destroy();
  }
});

test('the row still activates from a cell that holds no control', () => {
  const fixture = render();
  try {
    const cells = (fixture.nativeElement as HTMLElement).querySelectorAll('arena-table-cell');
    click(cells[1] as Element);
    fixture.detectChanges();
    assert.equal(fixture.componentInstance.activated, 1, 'a plain cell no longer activates its row');
  } finally {
    fixture.destroy();
  }
});

test('a row that was never marked interactive activates from nothing at all', () => {
  const fixture = render({ interactive: false });
  try {
    const cells = (fixture.nativeElement as HTMLElement).querySelectorAll('arena-table-cell');
    click(cells[1] as Element);
    fixture.detectChanges();
    assert.equal(fixture.componentInstance.activated, 0,
      'a row with no interactive flag activated on a pointer, which is the shape the flag exists to decide');
  } finally {
    fixture.destroy();
  }
});
