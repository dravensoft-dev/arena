/* The canonical data table puts a selection control in the first cell and a row action in the
 * last, and an interactive row is a click target under both of them. The grid case drives the
 * row through a real ArenaTable, because Enter on a cell is the table's keyboard rather than the
 * row's, and that route reaches the row's props directly. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { ArenaTable } from '../arena-table/ArenaTable.tsx';
import { ArenaTableRow } from './ArenaTableRow.tsx';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell.tsx';

afterEach(cleanup);

const COLUMNS = [{ header: 'Pick' }, { header: 'Service' }, { header: 'Act' }];

function table(seen: { activated: number; ran: number; ticked: number }, extra: Record<string, unknown> = {}) {
  return mount(
    <ArenaTable label="Recent deployments" columns={COLUMNS} responsive={false}>
      <ArenaTableRow interactive onClick={() => { seen.activated += 1; }} {...extra}>
        <ArenaTableCell>
          <input type="checkbox" onChange={() => { seen.ticked += 1; }} />
        </ArenaTableCell>
        <ArenaTableCell>checkout-api</ArenaTableCell>
        <ArenaTableCell>
          <button type="button" onClick={() => { seen.ran += 1; }}>Retry</button>
        </ArenaTableCell>
      </ArenaTableRow>
    </ArenaTable>,
  );
}

function click(el: Element) {
  act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); });
}

function counters() {
  return { activated: 0, ran: 0, ticked: 0 };
}

test('a control inside a cell keeps its own activation, and the row takes none of it', () => {
  const seen = counters();
  const host = table(seen);
  click(host.querySelector('button') as Element);
  assert.equal(seen.ran, 1, 'the action did not fire, or fired twice');
  assert.equal(seen.activated, 0, 'the row activated under its own action');
});

test('a checkbox in the first column ticks without navigating the reader away', () => {
  const seen = counters();
  const host = table(seen);
  const box = host.querySelector('input') as HTMLInputElement;
  act(() => { box.click(); });
  assert.equal(seen.ticked, 1);
  assert.equal(seen.activated, 0, 'ticking a box activated the row');
});

test('the row still activates from a cell that holds no control', () => {
  const seen = counters();
  const host = table(seen);
  click(host.querySelectorAll('td')[1] as Element);
  assert.equal(seen.activated, 1, 'a plain cell no longer activates its row');
});

test('Enter on a cell activates only a row that is interactive and not disabled', () => {
  const seen = counters();
  const host = table(seen, { interactive: false });
  const cell = host.querySelectorAll('td')[1] as HTMLElement;
  act(() => { cell.focus(); });
  act(() => {
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  });
  assert.equal(seen.activated, 0,
    'the grid keyboard reached the consumer handler past the flag that decides whether a row activates at all');
});

test('a disabled row is not activated by the grid keyboard either', () => {
  const seen = counters();
  const host = table(seen, { disabled: true });
  const cell = host.querySelectorAll('td')[1] as HTMLElement;
  act(() => { cell.focus(); });
  act(() => {
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  });
  assert.equal(seen.activated, 0, 'Enter activated a row the consumer had locked');
});
