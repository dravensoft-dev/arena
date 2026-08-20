/* A grid whose DOM holds part of a list reports the whole of it, or a reader is told the size of
 * what happens to be rendered. The source page counts the header row, which is why every number
 * here is one more than the rows the consumer counted, and why the header carries index 1. */

import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { ArenaTable } from './ArenaTable.tsx';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow.tsx';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell.tsx';
import type { ArenaTableColumn } from '../../../Api.generated';

afterEach(cleanup);

const LABEL = 'Recent deployments';
const COLUMNS: ArenaTableColumn[] = [{ header: 'Service' }, { header: 'Status' }];

const rows = (n: number) => Array.from({ length: n }, (_, i) => (
  <ArenaTableRow key={i}><ArenaTableCell>svc-{i}</ArenaTableCell><ArenaTableCell>Healthy</ArenaTableCell></ArenaTableRow>
));

const grid = (root: Element) => root.querySelector('table');
const dataRows = (root: Element) => [...root.querySelectorAll('tbody tr')];

test('a table holding every row it has writes neither attribute, because the reader already counts them', () => {
  const root = mount(<ArenaTable label={LABEL} columns={COLUMNS} responsive={false}>{rows(3)}</ArenaTable>);
  assert.equal(grid(root)?.getAttribute('aria-rowcount'), null);
  assert.deepEqual(dataRows(root).map((r) => r.getAttribute('aria-rowindex')), [null, null, null]);
});

test('a paged table reports the whole list without the consumer stating it twice', () => {
  const root = mount(
    <ArenaTable label={LABEL} columns={COLUMNS} responsive={false} page={{ index: 3, size: 20, total: 500 }}>
      {rows(2)}
    </ArenaTable>,
  );
  assert.equal(grid(root)?.getAttribute('aria-rowcount'), '501',
    '500 rows and the header row the source page counts');
  assert.equal(root.querySelector('thead tr')?.getAttribute('aria-rowindex'), '1');
  assert.deepEqual(dataRows(root).map((r) => r.getAttribute('aria-rowindex')), ['42', '43'],
    'page 3 of 20 starts at row 41 of the list, which is index 42 once the header has taken 1');
});

test('a window states where it sits, which is the case no page can express', () => {
  const root = mount(
    <ArenaTable label={LABEL} columns={COLUMNS} responsive={false} slice={{ total: 20_000, offset: 4_998 }}>
      {rows(2)}
    </ArenaTable>,
  );
  assert.equal(grid(root)?.getAttribute('aria-rowcount'), '20001');
  assert.deepEqual(dataRows(root).map((r) => r.getAttribute('aria-rowindex')), ['5000', '5001']);
});

test('a slice answers the attributes whole, so a page bound beside it never contradicts it', () => {
  const root = mount(
    <ArenaTable label={LABEL} columns={COLUMNS} responsive={false}
      page={{ index: 3, size: 20, total: 500 }} slice={{ total: 500, offset: 44 }}>
      {rows(1)}
    </ArenaTable>,
  );
  assert.equal(dataRows(root)[0]?.getAttribute('aria-rowindex'), '46',
    'the rows in the DOM sit where the slice says, not where the pager would have put them');
});

test('a list of unknown length passes the sentinel through rather than inventing a number', () => {
  const root = mount(
    <ArenaTable label={LABEL} columns={COLUMNS} responsive={false} slice={{ total: -1, offset: 0 }}>
      {rows(2)}
    </ArenaTable>,
  );
  assert.equal(grid(root)?.getAttribute('aria-rowcount'), '-1',
    'a feed that loads as it scrolls says -1 rather than a total it would have to correct');
  assert.deepEqual(dataRows(root).map((r) => r.getAttribute('aria-rowindex')), ['2', '3']);
});

test('card mode carries neither, because that shape draws no grid for them to describe', () => {
  const root = mount(
    <ArenaTable label={LABEL} columns={COLUMNS} responsive={false} slice={{ total: 500, offset: 40 }}>
      {rows(0)}
    </ArenaTable>,
  );
  assert.equal(grid(root)?.getAttribute('aria-rowcount'), null,
    'the empty shape strips the grid role, and an attribute describing a grid that is not there '
    + 'is a size claim over nothing');
});
