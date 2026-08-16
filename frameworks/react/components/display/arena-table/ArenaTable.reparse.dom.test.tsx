/* The whole reason the rows are real table elements, asserted rather than argued. A server render
 * is serialized to text and parsed again by the client, and the HTML parser foster-parents a
 * non-table element straight out of the table it was written in: a row inside a plain box does not
 * come back as a row, it comes back as the text it held, with the row and every cell gone. So the
 * markup is put through exactly that round trip here. The control case is what gives the assertion
 * its teeth -- it shows the parser really does drop the shape the other responsive technique has. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { ArenaTable } from './ArenaTable.tsx';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow.tsx';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell.tsx';

afterEach(cleanup);

const LABEL = 'Recent deployments';
const COLUMNS = [{ header: 'Service' }, { header: 'Commit', mono: true }];

function rows() {
  return [
    <ArenaTableRow key="a"><ArenaTableCell>checkout-api</ArenaTableCell><ArenaTableCell>4f2a1c9</ArenaTableCell></ArenaTableRow>,
    <ArenaTableRow key="b"><ArenaTableCell>billing-worker</ArenaTableCell><ArenaTableCell>9b31de4</ArenaTableCell></ArenaTableRow>,
  ];
}

function reparsed(markup: string): Element {
  const box = document.createElement('div');
  box.innerHTML = markup;
  return box;
}

test('the rendered markup survives being serialized and parsed again, rows and cells intact', () => {
  const root = mount(<ArenaTable label={LABEL} columns={COLUMNS} responsive={false}>{rows()}</ArenaTable>);
  const again = reparsed(root.innerHTML);

  assert.equal(again.querySelectorAll('tbody > tr').length, 2,
    'a row did not come back as a child of the body it was written in, which is what a client '
    + 'hydrating a server render parses');
  assert.equal(again.querySelectorAll('tbody > tr > td').length, 4, 'a cell did not come back inside its row');
  assert.equal(again.querySelectorAll('thead > tr > th').length, COLUMNS.length, 'the header row did not come back');
  assert.match(again.textContent ?? '', /checkout-api/, 'the content did not come back at all');
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
