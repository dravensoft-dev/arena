/* Sorting costs no tab stop, and that is the whole reason it is a header activation rather than
 * a control inside the header: the header row is already row 0 of the grid's roving cursor, so
 * Enter and Space land on the cell the user is already on. `grid.json` asks for no aria-sort,
 * and it is not widened to: `requires` is a flat map, so the key would oblige every component
 * that binds the pattern. It is asserted here instead. */

import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { ArenaTable } from './ArenaTable.tsx';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow.tsx';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell.tsx';
import type { ArenaTableColumn, ArenaTableSort } from '../../../Api.generated';

afterEach(cleanup);

const LABEL = 'Recent deployments';
const COLUMNS: ArenaTableColumn[] = [
  { header: 'Service', sortable: true },
  { header: 'Status' },
  { header: 'p95', sortable: true },
];

const rows = () => [
  <ArenaTableRow key="a"><ArenaTableCell>checkout</ArenaTableCell><ArenaTableCell>Healthy</ArenaTableCell><ArenaTableCell>91</ArenaTableCell></ArenaTableRow>,
  <ArenaTableRow key="b"><ArenaTableCell>billing</ArenaTableCell><ArenaTableCell>Degraded</ArenaTableCell><ArenaTableCell>340</ArenaTableCell></ArenaTableRow>,
];

function press(key: string) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  act(() => { document.activeElement!.dispatchEvent(event); });
  return event;
}

function headers(root: Element) {
  return [...root.querySelectorAll<HTMLElement>('[role="columnheader"]')];
}

test('with no `sort` no header is a target, however many columns declare sortable', () => {
  const root = mount(<ArenaTable label={LABEL} columns={COLUMNS} responsive={false}>{rows()}</ArenaTable>);
  for (const th of headers(root)) {
    assert.equal(th.hasAttribute('aria-sort'), false,
      'a header that draws a sort state it does not know is worse than one that draws none');
  }
});

test('aria-sort names the sorted column and says `none` on the other sortable ones', () => {
  const sort: ArenaTableSort = { column: 0, direction: 'asc' };
  const root = mount(<ArenaTable label={LABEL} columns={COLUMNS} responsive={false} sort={sort}>{rows()}</ArenaTable>);
  const th = headers(root);
  assert.equal(th[0]!.getAttribute('aria-sort'), 'ascending');
  assert.equal(th[1]!.hasAttribute('aria-sort'), false, 'a column that is not sortable claims no sort state');
  assert.equal(th[2]!.getAttribute('aria-sort'), 'none');
});

test('descending is announced as descending, not as a second ascending', () => {
  const root = mount(
    <ArenaTable label={LABEL} columns={COLUMNS} responsive={false} sort={{ column: 2, direction: 'desc' }}>{rows()}</ArenaTable>,
  );
  assert.equal(headers(root)[2]!.getAttribute('aria-sort'), 'descending');
});

test('activating the sorted column flips it; a different column starts ascending', () => {
  const seen: ArenaTableSort[] = [];
  const root = mount(
    <ArenaTable label={LABEL} columns={COLUMNS} responsive={false}
      sort={{ column: 0, direction: 'asc' }} onSortChange={(next) => seen.push(next)}>{rows()}</ArenaTable>,
  );
  const th = headers(root);
  act(() => { th[0]!.click(); });
  act(() => { th[2]!.click(); });
  act(() => { th[1]!.click(); });
  assert.deepEqual(seen, [
    { column: 0, direction: 'desc' },
    { column: 2, direction: 'asc' },
  ], 'a non-sortable header must emit nothing at all');
});

test('Enter and Space on a header sort it, and neither adds a tab stop', () => {
  const seen: ArenaTableSort[] = [];
  const root = mount(
    <ArenaTable label={LABEL} columns={COLUMNS} responsive={false}
      sort={{ column: 0, direction: 'asc' }} onSortChange={(next) => seen.push(next)}>{rows()}</ArenaTable>,
  );
  const th = headers(root);
  act(() => { th[0]!.focus(); });
  assert.equal(root.querySelectorAll('[tabindex="0"]').length, 1,
    'a sortable header must not add a stop of its own -- the grid is ONE tab stop');

  const enter = press('Enter');
  assert.equal(enter.defaultPrevented, true, 'Enter was not claimed by the header');
  const space = press(' ');
  assert.equal(space.defaultPrevented, true,
    'Space must be prevented, or the page scrolls under the header the user just pressed');
  assert.equal(seen.length, 2, 'both keys must activate the header');
  assert.equal(root.querySelectorAll('[tabindex="0"]').length, 1, 'and neither may add a stop');
});

test('Enter on a DATA row still activates the row, not a sort', () => {
  let activated = 0;
  const seen: ArenaTableSort[] = [];
  const root = mount(
    <ArenaTable label={LABEL} columns={COLUMNS} responsive={false}
      sort={{ column: 0, direction: 'asc' }} onSortChange={(next) => seen.push(next)}>
      <ArenaTableRow interactive onClick={() => { activated += 1; }}>
        <ArenaTableCell>checkout</ArenaTableCell><ArenaTableCell>Healthy</ArenaTableCell><ArenaTableCell>91</ArenaTableCell>
      </ArenaTableRow>
    </ArenaTable>,
  );
  const cell = root.querySelector<HTMLElement>('[role="gridcell"]')!;
  act(() => { cell.focus(); });
  press('Enter');
  assert.equal(activated, 1, 'Enter on a data row must reach that row');
  assert.deepEqual(seen, [], 'and must not be read as a sort');
});
