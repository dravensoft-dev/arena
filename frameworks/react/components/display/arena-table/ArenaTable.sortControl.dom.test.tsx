/* Sorting existed only above --bp-md, and nothing said so: card mode draws no header row, and a
 * `sortable` column's whole affordance IS the header row, so the feature was silently missing on
 * the device that needs it most, where the reader cannot see the list at all. Reaching card mode
 * needs the same lever ArenaTable.cases.dom.test.tsx uses and restores: happy-dom's ResizeObserver
 * never fires, so the width stays null and every render is wide. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { ArenaTable, arenaParseSortOption, arenaSortOptionValue } from './ArenaTable.tsx';
import { forgetArenaWarnings } from '../../../WarnOnce.ts';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow.tsx';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell.tsx';
import type { ArenaTableColumn, ArenaTableSort, ArenaTableSortControl } from '../../../Api.generated';

afterEach(cleanup);

const LABEL = 'Recent sales';
const NARROW_WIDTH = 390;

const COLUMNS: ArenaTableColumn[] = [
  { header: 'Customer', sortable: true },
  { header: 'Status' },
  { header: 'Total', sortable: true },
];

function narrowWidths<T>(width: number, body: () => T): T {
  const saved = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class {
    callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) { this.callback = callback; }
    observe(target: Element) {
      this.callback([{ target, borderBoxSize: [{ inlineSize: width, blockSize: 0 }], contentRect: { width } }] as unknown as ResizeObserverEntry[], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  try {
    return body();
  } finally {
    globalThis.ResizeObserver = saved;
  }
}

function render(options: {
  sort?: ArenaTableSort;
  sortControl?: ArenaTableSortControl;
  seen?: ArenaTableSort[];
} = {}) {
  return mount(
    <ArenaTable label={LABEL} columns={COLUMNS} sort={options.sort} sortControl={options.sortControl}
      onSortChange={(next) => options.seen?.push(next)}>
      <ArenaTableRow>
        <ArenaTableCell>Andina</ArenaTableCell><ArenaTableCell>Paid</ArenaTableCell><ArenaTableCell>1042</ArenaTableCell>
      </ArenaTableRow>
    </ArenaTable>,
  );
}

test('the option value round-trips, so the control edits the same ArenaTableSort the header does', () => {
  assert.equal(arenaSortOptionValue(2, 'desc'), '2:desc');
  assert.deepEqual(arenaParseSortOption('2:desc'), { column: 2, direction: 'desc' });
  assert.deepEqual(arenaParseSortOption('0:asc'), { column: 0, direction: 'asc' });
  assert.equal(arenaParseSortOption('2:sideways'), null);
  assert.equal(arenaParseSortOption('nope:asc'), null);
});

test('card mode draws a sort control, and picking one reports the same sortChange a header would', () => {
  const seen: ArenaTableSort[] = [];
  const root = narrowWidths(NARROW_WIDTH, () => render({ sort: { column: 2, direction: 'desc' }, seen }));

  assert.equal(root.querySelectorAll('[role="columnheader"], th').length, 0,
    'card mode must not bring the header row back: it exists because a grid does not fit');

  const control = root.querySelector('select');
  assert.ok(control, 'a sortable column below --bp-md had no control at all, which is the gap');
  assert.deepEqual(
    [...control.options].map((option) => option.value),
    ['0:asc', '0:desc', '2:asc', '2:desc'],
    'every sortable column in both directions, and no column that is not sortable',
  );
  assert.equal(control.value, '2:desc', 'the control shows the order that is in effect');

  act(() => {
    control.value = '0:asc';
    control.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  assert.deepEqual(seen, [{ column: 0, direction: 'asc' }],
    'the control reports through onSortChange, so there is one channel and not two');
});

test('sortControl="none" draws nothing, and neither does a table with no sort at all', () => {
  const off = narrowWidths(NARROW_WIDTH, () => render({ sort: { column: 2, direction: 'desc' }, sortControl: 'none' }));
  assert.equal(off.querySelector('select'), null,
    'none leaves card mode unsorted by hand, which is a real choice');

  cleanup();
  const unsorted = narrowWidths(NARROW_WIDTH, () => render({}));
  assert.equal(unsorted.querySelector('select'), null,
    'without `sort` no header is a target either, so a control that edits nothing must not draw');
});

test('the wide shape draws no control, because there the header row IS the control', () => {
  const root = render({ sort: { column: 2, direction: 'desc' } });
  assert.equal(root.querySelector('select'), null, 'a second affordance for one state is one too many');
  assert.ok(root.querySelectorAll('th').length > 0);
});

test('a sort aimed at a column that is not sortable warns once, instead of drawing nothing quietly', () => {
  const messages: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => { messages.push(args.map(String).join(' ')); };
  try {
    forgetArenaWarnings();
    render({ sort: { column: 1, direction: 'asc' } });
    assert.equal(messages.length, 1,
      'no caret, no target and no message is the silent way to be misconfigured');
    const [first = ''] = messages;
    assert.match(first, /"Status"/, 'the message must name the column it landed on');
    assert.match(first, /sortable/);

    cleanup();
    render({ sort: { column: 1, direction: 'asc' } });
    assert.equal(messages.length, 1, 'once per message, not once per render');
  } finally {
    console.warn = original;
    forgetArenaWarnings();
  }
});
