import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { laidOut } from '../../../test/LaidOut';
import { ArenaTable } from './ArenaTable';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell';

@Component({
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table label="Recent deployments" [columns]="[{ header: 'Service' }, { header: 'Status' }]">
      <tr arena-table-row><td arena-table-cell>checkout-api</td><td arena-table-cell>Healthy</td></tr>
    </arena-table>
  `,
})
class TableHost {}

const BP_MD = '768px';

function grid(box: number): Element | null {
  const style = document.documentElement.style;
  const saved = style.getPropertyValue('--bp-md');
  style.setProperty('--bp-md', BP_MD);
  try {
    return laidOut(box, () => {
      const fixture = TestBed.createComponent(TableHost);
      try {
        fixture.autoDetectChanges();
        TestBed.tick();
        return (fixture.nativeElement as Element).querySelector('[role="grid"]');
      } finally {
        fixture.destroy();
      }
    });
  } finally {
    if (saved) style.setProperty('--bp-md', saved);
    else style.removeProperty('--bp-md');
  }
}

test('below --bp-md the table is cards within the first tick, without any observer report', () => {
  assert.equal(grid(390), null, 'the table drew its grid first, which a phone paints before it narrows');
});

test('at --bp-md it is the grid', () => {
  assert.ok(grid(768));
});
