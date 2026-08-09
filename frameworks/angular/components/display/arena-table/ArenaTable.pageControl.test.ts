/* `page` is what the table KNOWS about a longer list and `pageControl` is what it DRAWS about it.
 * The two were one member, so a consumer who wanted the control somewhere else had to withhold
 * `page` and leave the table knowing nothing about paging at all. Both assertions matter: that
 * 'none' draws no pager, and that the table still holds the paging it was given. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { assertNoNode } from '../../../test/NodeAssert';
import type { ArenaTableColumn, ArenaTablePage, ArenaTablePageControl } from '../../../Api.generated';
import { ArenaTable } from './ArenaTable';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell';

const COLUMNS: ArenaTableColumn[] = [{ header: 'Service' }];
const PAGE: ArenaTablePage = { index: 2, size: 10, total: 45 };

@Component({
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table label="Recent deployments" [columns]="columns" [responsive]="false"
                 [page]="page" [pageControl]="pageControl" (pageChange)="chose = $event">
      <arena-table-row><arena-table-cell>checkout-api</arena-table-cell></arena-table-row>
    </arena-table>
  `,
})
class PagedHost {
  columns: ArenaTableColumn[] = COLUMNS;
  page: ArenaTablePage = PAGE;
  pageControl: ArenaTablePageControl = 'auto';
  chose = 0;
}

function render(pageControl: ArenaTablePageControl): ComponentFixture<PagedHost> {
  const fixture = TestBed.createComponent(PagedHost);
  fixture.componentInstance.pageControl = pageControl;
  fixture.detectChanges();
  return fixture;
}

test('auto draws the pager, which is what a table showing one list of its own wants', () => {
  const fixture = render('auto');
  try {
    assert.ok(fixture.nativeElement.querySelector('arena-pagination'), 'auto drew no pager');
  } finally {
    fixture.destroy();
  }
});

test('none draws no pager and the table still knows the page it was given', () => {
  const fixture = render('none');
  try {
    const host = fixture.nativeElement as HTMLElement;
    assertNoNode(host.querySelector('arena-pagination'), 'none drew a pager anyway');
    assert.ok(host.querySelector('[role="grid"]'), 'the grid went with the pager');
    assert.equal(fixture.componentInstance.chose, 0, 'nothing was chosen, so nothing should have fired');
  } finally {
    fixture.destroy();
  }
});

test('a page past the end still resets, because that is knowledge rather than drawing', () => {
  const fixture = TestBed.createComponent(PagedHost);
  try {
    fixture.componentInstance.pageControl = 'none';
    fixture.componentInstance.page = { index: 9, size: 10, total: 45 };
    fixture.detectChanges();
    assert.equal(fixture.componentInstance.chose, 1,
      'the one reset ArenaTable performs went away with the control it no longer draws');
  } finally {
    fixture.destroy();
  }
});
