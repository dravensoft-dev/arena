/* A windowed grid with `slice.view` answers the page keys against the whole list. A target inside
 * the window moves the cursor, a target outside is asked of the consumer once and held until a
 * later render projects it, and without `view` the page keeps its own keys. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { ArenaTable } from './ArenaTable.tsx';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow.tsx';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell.tsx';
import type { ArenaTableColumn } from '../../../Api.generated';

const LABEL = 'Recent deployments';
const COLUMNS: ArenaTableColumn[] = [{ header: 'Service' }, { header: 'Status' }];
const TOTAL = 20_000;
const START = 100;
const VIEW = 10;
const SHORT = 8;
const LONG = 20;

afterEach(cleanup);

interface Control { offset: (next: number) => void; rerender: () => void }

function Windowed(props: {
  control: Control; count: number; view: number | null; requests: number[];
}) {
  const [offset, setOffset] = React.useState(START);
  const [, setTick] = React.useState(0);
  props.control.offset = setOffset;
  props.control.rerender = () => setTick((n) => n + 1);
  const slice = props.view === null ? { total: TOTAL, offset } : { total: TOTAL, offset, view: props.view };
  return (
    <ArenaTable label={LABEL} columns={COLUMNS} responsive={false} slice={slice}
      onRowRequest={(index) => { props.requests.push(index); }}>
      {Array.from({ length: props.count }, (_, i) => (
        <ArenaTableRow key={offset + i}>
          <ArenaTableCell>rec-{offset + i}</ArenaTableCell>
          <ArenaTableCell>Healthy</ArenaTableCell>
        </ArenaTableRow>
      ))}
    </ArenaTable>
  );
}

function windowed(count: number, view: number | null = VIEW) {
  const control: Control = { offset: () => {}, rerender: () => {} };
  const requests: number[] = [];
  const root = mount(<Windowed control={control} count={count} view={view} requests={requests} />);
  act(() => { root.querySelector<HTMLElement>('th[tabindex="0"]')!.focus(); });
  press('ArrowDown');
  return { root, control, requests };
}

function press(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  act(() => { document.activeElement!.dispatchEvent(event); });
  return event;
}

function theStop(root: Element): HTMLElement {
  const all = [...root.querySelectorAll<HTMLElement>('[tabindex="0"]')];
  assert.equal(all.length, 1, 'a grid is ONE tab stop');
  return all[0]!;
}

const recordText = (cell: HTMLElement) => cell.closest('tr')?.firstElementChild?.textContent ?? '';

test('PageDown with a view emits once for a target outside the window and not again on a re-render', () => {
  const { root, control, requests } = windowed(SHORT);
  const event = press('PageDown');
  assert.deepEqual(requests, [START + VIEW]);
  assert.equal(event.defaultPrevented, true);
  act(() => { control.rerender(); });
  act(() => { control.rerender(); });
  assert.deepEqual(requests, [START + VIEW], 'a re-render asked for the same row again');
  assert.equal(recordText(theStop(root)), `rec-${START}`, 'the cursor moved before the row arrived');
});

test('PageDown with a view moves the cursor to a target inside the window and emits nothing', () => {
  const { root, requests } = windowed(LONG);
  press('PageDown');
  assert.deepEqual(requests, []);
  const stop = theStop(root);
  assert.equal(recordText(stop), `rec-${START + VIEW}`);
  assert.equal(document.activeElement, stop);
  press('PageUp');
  assert.equal(recordText(theStop(root)), `rec-${START}`);
  assert.deepEqual(requests, []);
});

test('without a view PageUp and PageDown are left to the page, the Control keys act as Home and End, and nothing is emitted', () => {
  const { root, requests } = windowed(SHORT, null);
  const keys: Array<[string, KeyboardEventInit]> = [
    ['PageDown', {}], ['PageUp', {}], ['Home', { ctrlKey: true }], ['End', { ctrlKey: true }],
  ];
  for (const [key, init] of keys) {
    const event = press(key, init);
    const shipped = key === 'Home' || key === 'End';
    assert.equal(event.defaultPrevented, shipped, `${key} was handled without a view`);
  }
  assert.deepEqual(requests, []);
  assert.equal(recordText(theStop(root)), `rec-${START}`);
});

test('the pending target takes focus on its cell when a later render projects it', () => {
  const { root, control, requests } = windowed(SHORT);
  press('PageDown');
  assert.deepEqual(requests, [START + VIEW]);
  act(() => { control.offset(START + 6); });
  const stop = theStop(root);
  assert.equal(recordText(stop), `rec-${START + VIEW}`, 'the arrived row does not hold the stop');
  assert.equal(document.activeElement, stop, 'the arrived cell did not take focus');
  assert.deepEqual(requests, [START + VIEW]);
});

test('ArrowDown cancels the pending target', () => {
  const { root, control, requests } = windowed(SHORT);
  press('PageDown');
  press('ArrowDown');
  act(() => { control.offset(START + 4); });
  assert.deepEqual(requests, [START + VIEW]);
  const stop = theStop(root);
  assert.notEqual(recordText(stop), `rec-${START + VIEW}`, 'a cancelled request still moved the cursor');
  assert.notEqual(document.activeElement, stop);
});

test('Control End emits the last row and Control Home the first from far away', () => {
  const { requests, control } = windowed(SHORT);
  const end = press('End', { ctrlKey: true });
  assert.equal(end.defaultPrevented, true);
  assert.deepEqual(requests, [TOTAL - 1]);
  act(() => { control.offset(START); });
  const home = press('Home', { ctrlKey: true });
  assert.equal(home.defaultPrevented, true);
  assert.deepEqual(requests, [TOTAL - 1, 0]);
});

test('a requested row that leaves the window and returns takes focus again until the reader acts', () => {
  const { root, control } = windowed(SHORT);
  press('PageDown');
  act(() => { control.offset(START + 6); });
  assert.equal(document.activeElement, theStop(root));
  act(() => { control.offset(5000); });
  assert.notEqual(recordText(theStop(root)), `rec-${START + VIEW}`);
  act(() => { control.offset(START + 8); });
  const stop = theStop(root);
  assert.equal(recordText(stop), `rec-${START + VIEW}`);
  assert.equal(document.activeElement, stop, 'the returning row did not take focus');
  press('ArrowRight');
  act(() => { control.offset(5000); });
  act(() => { control.offset(START + 8); });
  assert.notEqual(document.activeElement, theStop(root), 'a reader who acted had focus taken back');
});
