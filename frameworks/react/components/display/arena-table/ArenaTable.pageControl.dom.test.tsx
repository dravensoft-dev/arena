/* `page` is what the table KNOWS about a longer list and `pageControl` is what it DRAWS about it.
 * The two were one member, so a consumer who wanted the control somewhere else had to withhold
 * `page` and leave the table knowing nothing about paging at all. Both assertions matter: that
 * 'none' draws no pager, and that the table still holds the paging it was given. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import type { ArenaTablePage, ArenaTablePageControl } from '../../../Api.generated';
import { ArenaTable } from './ArenaTable.tsx';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow.tsx';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell.tsx';

afterEach(cleanup);

const COLUMNS = [{ header: 'Service' }];
const PAGE: ArenaTablePage = { index: 2, size: 10, total: 45 };

function table(pageControl: ArenaTablePageControl, page: ArenaTablePage = PAGE, seen = { chose: 0 }) {
  const host = mount(
    <ArenaTable label="Recent deployments" columns={COLUMNS} responsive={false}
      page={page} pageControl={pageControl} onPageChange={() => { seen.chose += 1; }}>
      <ArenaTableRow><ArenaTableCell>checkout-api</ArenaTableCell></ArenaTableRow>
    </ArenaTable>,
  );
  return { host, seen };
}

test('auto draws the pager, which is what a table showing one list of its own wants', () => {
  const { host } = table('auto');
  assert.ok(host.querySelector('nav'), 'auto drew no pager');
});

test('none draws no pager and the grid stays', () => {
  const { host } = table('none');
  assert.equal(host.querySelector('nav'), null, 'none drew a pager anyway');
  assert.ok(host.querySelector('[role="grid"]'), 'the grid went with the pager');
});

test('a page past the end still resets, because that is knowledge rather than drawing', () => {
  const seen = { chose: 0 };
  table('none', { index: 9, size: 10, total: 45 }, seen);
  assert.equal(seen.chose, 1,
    'the one reset ArenaTable performs went away with the control it no longer draws');
});
