/* ArenaTable does not slice. It does not hold the rows, so `page.total` is what tells it how many
 * pages there are; the projected children are one page and nothing about the whole list can be
 * derived from them. The out-of-range reset is the one thing ArenaTable emits on its own, and it is
 * bounded on purpose: only when the page has actually gone past the end, so a filter that
 * leaves it valid stays silent and no consumer gets a loop. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { assertNoNode } from '../../../test/NodeAssert';
import type { ArenaTableColumn, ArenaTablePage } from '../../../Api.generated';
import { ArenaTable } from './ArenaTable';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell';

const LABEL = 'Recent deployments';
const COLUMNS: ArenaTableColumn[] = [{ header: 'Service' }, { header: 'Status' }];

@Component({
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table [label]="label" [columns]="columns" [responsive]="false" [page]="page()"
                 (pageChange)="asked.push($event)">
      @if (withRows) {
        <tr arena-table-row>
          <td arena-table-cell>checkout</td>
          <td arena-table-cell>Healthy</td>
        </tr>
      }
    </arena-table>
  `,
})
class PageHost {
  label = LABEL;
  columns = COLUMNS;
  withRows = true;
  readonly page = signal<ArenaTablePage | undefined>(undefined);
  asked: number[] = [];
}

function render(page?: ArenaTablePage, withRows = true): ComponentFixture<PageHost> {
  const fixture = TestBed.createComponent(PageHost);
  fixture.componentInstance.withRows = withRows;
  fixture.componentInstance.page.set(page);
  fixture.detectChanges();
  return fixture;
}

const navOf = (fixture: ComponentFixture<PageHost>) => (fixture.nativeElement as Element).querySelector('nav');

test('with no `page` no pager is drawn, which is every table that fits', () => {
  const fixture = render();
  try { assertNoNode(navOf(fixture)); } finally { fixture.destroy(); }
});

test('a pager is drawn, and it is named from the table rather than from a constant', () => {
  const fixture = render({ index: 1, size: 20, total: 96 });
  try {
    const nav = navOf(fixture);
    assert.ok(nav, 'a table with a page must draw its own ArenaPagination');
    assert.equal(nav?.getAttribute('aria-label'), LABEL,
      'two paged tables on one dashboard must be tellable apart, which a shared constant name '
      + 'satisfies mechanically and never actually does');
  } finally { fixture.destroy(); }
});

test('the page count is derived from the total, not from the rows on screen', () => {
  const fixture = render({ index: 1, size: 20, total: 96 });
  try {
    const labels = [...(navOf(fixture)?.querySelectorAll('button') ?? [])].map((b) => b.textContent?.trim());
    assert.ok(labels.includes('5'), `96 rows at 20 a page is 5 pages; got ${labels.join(', ')}`);
  } finally { fixture.destroy(); }
});

test('a page past the end asks for page 1, which is the reset written by hand beside every filter', () => {
  const fixture = render({ index: 7, size: 20, total: 30 });
  try {
    assert.deepEqual(fixture.componentInstance.asked, [1],
      '30 rows at 20 a page is 2 pages, so page 7 does not exist');
  } finally { fixture.destroy(); }
});

test('a page still in range asks for nothing, so a filter that leaves it valid is silent', () => {
  const fixture = render({ index: 2, size: 20, total: 96 });
  try {
    assert.deepEqual(fixture.componentInstance.asked, []);
  } finally { fixture.destroy(); }
});

test('an empty table draws no pager, because there is no grid for it to sit under', () => {
  const fixture = render({ index: 1, size: 20, total: 0 }, false);
  try {
    assertNoNode(navOf(fixture));
    assertNoNode((fixture.nativeElement as Element).querySelector('[role="grid"]'));
  } finally { fixture.destroy(); }
});
