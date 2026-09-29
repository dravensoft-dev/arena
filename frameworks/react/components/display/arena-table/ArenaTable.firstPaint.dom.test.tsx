import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { laidOut } from '../../../test/LaidOut.ts';
import { ArenaTable } from './ArenaTable.tsx';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow.tsx';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell.tsx';

afterEach(cleanup);

function table() {
  return (
    <ArenaTable label="Recent deployments" columns={[{ header: 'Service' }, { header: 'Status' }]}>
      <ArenaTableRow><ArenaTableCell>checkout-api</ArenaTableCell><ArenaTableCell>Healthy</ArenaTableCell></ArenaTableRow>
    </ArenaTable>
  );
}

test('below --bp-md the table is cards without any observer report', () => {
  const root = laidOut(390, () => mount(table()));
  assert.equal(root.querySelector('[role="grid"]'), null,
    'the table drew its grid first, which a phone paints before it narrows');
});

test('at --bp-md it is the grid', () => {
  const root = laidOut(768, () => mount(table()));
  assert.ok(root.querySelector('[role="grid"]'));
});
