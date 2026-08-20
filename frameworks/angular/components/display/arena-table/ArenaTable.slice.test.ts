/* A grid whose DOM holds part of a list reports the whole of it, or a reader is told the size of
 * what happens to be rendered. The source page counts the header row, which is why every number
 * here is one more than the rows the consumer counted, and why the header carries index 1. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { ArenaTableColumn, ArenaTablePage, ArenaTableSlice } from '../../../Api.generated';
import { ArenaTable } from './ArenaTable';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell';

const LABEL = 'Recent deployments';
const COLUMNS: ArenaTableColumn[] = [{ header: 'Service' }, { header: 'Status' }];

@Component({
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table [label]="label" [columns]="columns" [responsive]="false"
                 [page]="page()" [slice]="slice()">
      @for (row of rows(); track row) {
        <tr arena-table-row>
          <td arena-table-cell>{{ row }}</td>
          <td arena-table-cell>Healthy</td>
        </tr>
      }
    </arena-table>
  `,
})
class SliceHost {
  label = LABEL;
  columns = COLUMNS;
  readonly rows = signal<readonly string[]>(['checkout', 'billing']);
  readonly page = signal<ArenaTablePage | undefined>(undefined);
  readonly slice = signal<ArenaTableSlice | undefined>(undefined);
}

function render(
  slice?: ArenaTableSlice, page?: ArenaTablePage, rows: readonly string[] = ['checkout', 'billing'],
): ComponentFixture<SliceHost> {
  const fixture = TestBed.createComponent(SliceHost);
  fixture.componentInstance.rows.set(rows);
  fixture.componentInstance.page.set(page);
  fixture.componentInstance.slice.set(slice);
  fixture.detectChanges();
  return fixture;
}

const grid = (fixture: ComponentFixture<SliceHost>) =>
  (fixture.nativeElement as Element).querySelector('table');

const dataRows = (fixture: ComponentFixture<SliceHost>) =>
  [...(fixture.nativeElement as Element).querySelectorAll('tbody tr')];

test('a table holding every row it has writes neither attribute, because the reader already counts them', () => {
  const fixture = render();
  assert.equal(grid(fixture)?.getAttribute('aria-rowcount'), null);
  assert.deepEqual(dataRows(fixture).map((r) => r.getAttribute('aria-rowindex')), [null, null]);
});

test('a paged table reports the whole list without the consumer stating it twice', () => {
  const fixture = render(undefined, { index: 3, size: 20, total: 500 });
  assert.equal(grid(fixture)?.getAttribute('aria-rowcount'), '501',
    '500 rows and the header row the source page counts');
  assert.equal(
    (fixture.nativeElement as Element).querySelector('thead tr')?.getAttribute('aria-rowindex'), '1');
  assert.deepEqual(dataRows(fixture).map((r) => r.getAttribute('aria-rowindex')), ['42', '43'],
    'page 3 of 20 starts at row 41 of the list, which is index 42 once the header has taken 1');
});

test('a window states where it sits, which is the case no page can express', () => {
  const fixture = render({ total: 20_000, offset: 4_998 });
  assert.equal(grid(fixture)?.getAttribute('aria-rowcount'), '20001');
  assert.deepEqual(dataRows(fixture).map((r) => r.getAttribute('aria-rowindex')), ['5000', '5001']);
});

test('a slice answers the attributes whole, so a page bound beside it never contradicts it', () => {
  const fixture = render({ total: 500, offset: 44 }, { index: 3, size: 20, total: 500 });
  assert.equal(dataRows(fixture)[0]?.getAttribute('aria-rowindex'), '46',
    'the rows in the DOM sit where the slice says, not where the pager would have put them');
});

test('a list of unknown length passes the sentinel through rather than inventing a number', () => {
  const fixture = render({ total: -1, offset: 0 });
  assert.equal(grid(fixture)?.getAttribute('aria-rowcount'), '-1',
    'a feed that loads as it scrolls says -1 rather than a total it would have to correct');
  assert.deepEqual(dataRows(fixture).map((r) => r.getAttribute('aria-rowindex')), ['2', '3']);
});

test('the empty shape carries neither, because it draws no grid for them to describe', () => {
  const fixture = render({ total: 500, offset: 40 }, undefined, []);
  assert.equal(grid(fixture)?.getAttribute('aria-rowcount'), null,
    'the empty shape strips the grid role, and an attribute describing a grid that is not there '
    + 'is a size claim over nothing');
});
