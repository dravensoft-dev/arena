/* The whole reason the rows are real table elements, asserted rather than argued. A server render
 * is serialized to text and parsed again by the client, and the HTML parser foster-parents a
 * non-table element straight out of the table it was written in: a row inside a plain box does not
 * come back as a row, it comes back as the text it held, with the row and every cell gone. So the
 * markup is put through exactly that round trip here. The control case is what gives the assertion
 * its teeth -- it shows the parser really does drop the shape this component used to have. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { ArenaTableColumn } from '../../../Api.generated';
import { ArenaTable } from './ArenaTable';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell';

const COLUMNS: ArenaTableColumn[] = [{ header: 'Service' }, { header: 'Commit', mono: true }];

@Component({
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table label="Recent deployments" [columns]="columns" [responsive]="false">
      <tr arena-table-row>
        <td arena-table-cell>checkout-api</td>
        <td arena-table-cell>4f2a1c9</td>
      </tr>
      <tr arena-table-row>
        <td arena-table-cell>billing-worker</td>
        <td arena-table-cell>9b31de4</td>
      </tr>
    </arena-table>
  `,
})
class TableHost {
  columns: ArenaTableColumn[] = COLUMNS;
}

function render(): ComponentFixture<TableHost> {
  const fixture = TestBed.createComponent(TableHost);
  fixture.detectChanges();
  return fixture;
}

function reparsed(markup: string): Element {
  const box = document.createElement('div');
  box.innerHTML = markup;
  return box;
}

test('the rendered markup survives being serialized and parsed again, rows and cells intact', () => {
  const fixture = render();
  try {
    const host = fixture.nativeElement as HTMLElement;
    const again = reparsed(host.innerHTML);

    assert.equal(again.querySelectorAll('tbody > tr').length, 2,
      'a row did not come back as a child of the body it was written in, which is what a client '
      + 'hydrating a server render parses');
    assert.equal(again.querySelectorAll('tbody > tr > td').length, 4,
      'a cell did not come back inside its row');
    assert.equal(again.querySelectorAll('thead > tr > th').length, COLUMNS.length,
      'the header row did not come back');
    assert.match(again.textContent ?? '', /checkout-api/, 'the content did not come back at all');
  } finally {
    fixture.destroy();
  }
});

test('a row written into a plain box does NOT survive it, which is what the elements buy', () => {
  const dropped = reparsed('<div class="grid"><tr class="row"><td>checkout-api</td></tr></div>');

  assert.equal(dropped.querySelectorAll('tr').length, 0,
    'the parser kept a row outside a table, so this control proves nothing and the guard above is '
    + 'asserting a round trip that was never in danger');
  assert.equal(dropped.querySelectorAll('td').length, 0, 'and it kept the cell too');
  assert.match(dropped.textContent ?? '', /checkout-api/,
    'the text is all that comes back, which is the shape of the loss: the reader keeps the words '
    + 'and loses every relation between them');
});
