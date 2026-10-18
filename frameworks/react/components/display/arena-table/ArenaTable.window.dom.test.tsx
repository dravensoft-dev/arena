/* A windowed grid mounts a few rows of a long list, and the reader's place in it is a record, not
 * a position in the DOM. The window moves under the cursor as the consumer follows the scroll, so
 * the cursor is held against the whole list, and the Tab stop is the row the reader left whenever
 * that row is mounted and the nearest mounted row when it is not. Rows are keyed by record, as a
 * windowed list keys them, so a cell that holds focus survives the shift of the window. */
import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { ArenaTable } from './ArenaTable.tsx';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow.tsx';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell.tsx';
import { forgetArenaWarnings } from '../../../WarnOnce.ts';
import { forgetArenaBreakpoints } from '../../../UseArenaContainerWidth.ts';
import type { ArenaTableColumn } from '../../../Api.generated';

const LABEL = 'Recent deployments';
const COLUMNS: ArenaTableColumn[] = [{ header: 'Service' }, { header: 'Status' }];
const TOTAL = 20_000;
const SIZE = 20;
const START = 100;
const NEAR_END = 3;
const SHIFT = 5;
const PRESSES = 25;

const warnings: string[] = [];
const savedWarn = console.warn;

beforeEach(() => {
  forgetArenaWarnings();
  warnings.length = 0;
  console.warn = (message: string) => { warnings.push(message); };
});
afterEach(() => {
  console.warn = savedWarn;
  cleanup();
});

interface Scroller { offset: (next: number) => void }

function Windowed({ control, first, count }: { control: Scroller; first: number; count: number }) {
  const [offset, setOffset] = React.useState(first);
  control.offset = setOffset;
  return (
    <ArenaTable label={LABEL} columns={COLUMNS} responsive={false} slice={{ total: TOTAL, offset }}>
      {Array.from({ length: count }, (_, i) => (
        <ArenaTableRow key={offset + i}>
          <ArenaTableCell>rec-{offset + i}</ArenaTableCell>
          <ArenaTableCell>Healthy</ArenaTableCell>
        </ArenaTableRow>
      ))}
    </ArenaTable>
  );
}

function windowed(first = START): { root: HTMLElement; control: Scroller } {
  const control: Scroller = { offset: () => {} };
  const root = mount(<Windowed control={control} first={first} count={SIZE} />);
  return { root, control };
}

function press(key: string) {
  const el = document.activeElement;
  act(() => { el!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); });
}

const stops = (root: Element) => [...root.querySelectorAll<HTMLElement>('[tabindex="0"]')];

function theStop(root: Element): HTMLElement {
  const all = stops(root);
  assert.equal(all.length, 1, 'a grid is ONE tab stop');
  return all[0]!;
}

function recordOf(cell: HTMLElement): { index: string | null; text: string } {
  const row = cell.closest('tr');
  return { index: row?.getAttribute('aria-rowindex') ?? null, text: row?.firstElementChild?.textContent ?? '' };
}

const cellIndexOf = (cell: HTMLElement) => [...(cell.parentElement?.children ?? [])].indexOf(cell);

function expectedStop(record: number) {
  return { index: String(record + 2), text: `rec-${record}` };
}

function focusHeader(root: Element) {
  act(() => { root.querySelector<HTMLElement>('th[tabindex="0"]')!.focus(); });
}

test('the cursor keeps its record while the window shifts under 25 ArrowDown presses', () => {
  const { root, control } = windowed();
  focusHeader(root);
  let offset = START;
  for (let press_ = 1; press_ <= PRESSES; press_ += 1) {
    press('ArrowDown');
    const record = START + press_ - 1;
    const stop = theStop(root);
    assert.deepEqual(recordOf(stop), expectedStop(record), `press ${press_} left the stop on another record`);
    assert.equal(document.activeElement, stop, `press ${press_} left focus away from the stop`);
    if (record - offset + 1 > SIZE - NEAR_END) {
      offset += SHIFT;
      act(() => { control.offset(offset); });
      const after = theStop(root);
      assert.deepEqual(recordOf(after), expectedStop(record), `shifting to ${offset} moved the cursor off its record`);
      assert.equal(document.activeElement, after, `shifting to ${offset} dropped focus`);
    }
  }
});

test('the cursor resumes where it was after the window leaves and returns', () => {
  const { root, control } = windowed();
  focusHeader(root);
  for (let i = 0; i < 5; i += 1) press('ArrowDown');
  press('ArrowRight');
  const before = theStop(root);
  assert.deepEqual(recordOf(before), expectedStop(START + 4));
  assert.equal(cellIndexOf(before), 1);

  act(() => { control.offset(5000); });
  const away = theStop(root);
  assert.deepEqual(recordOf(away), expectedStop(5000), 'above the window, the first mounted row carries the stop');
  assert.equal(cellIndexOf(away), 1, 'the column of the cursor is kept on the stand-in row');

  act(() => { control.offset(START); });
  assert.deepEqual(recordOf(theStop(root)), expectedStop(START + 4), 'the cursor did not resume on its record');

  act(() => { control.offset(0); });
  const below = theStop(root);
  assert.deepEqual(recordOf(below), expectedStop(SIZE - 1), 'below the window, the last mounted row carries the stop');
  assert.equal(cellIndexOf(below), 1);

  act(() => { control.offset(START); });
  assert.deepEqual(recordOf(theStop(root)), expectedStop(START + 4), 'the cursor did not resume after the second absence');
});

test('the header is projected at every offset and holds the stop while the cursor rests on it', () => {
  const { root, control } = windowed();
  for (const offset of [START, 5000, 0, 19_980]) {
    act(() => { control.offset(offset); });
    const stop = theStop(root);
    assert.equal(stop.tagName, 'TH', `at offset ${offset} the cursor on the header lost its stop`);
    assert.equal(root.querySelectorAll('thead th').length, COLUMNS.length);
  }
});

test('ArrowUp at the first mounted row clamps there, because the row above is not mounted', () => {
  const { root } = windowed();
  focusHeader(root);
  press('ArrowDown');
  press('ArrowUp');
  const stop = theStop(root);
  assert.deepEqual(recordOf(stop), expectedStop(START));
  assert.equal(document.activeElement, stop);
});

test('without a slice the cursor is projected, so fewer rows clamp it onto the last one', () => {
  const control = { count: (_next: number) => {} };
  function Plain() {
    const [count, setCount] = React.useState(5);
    control.count = setCount;
    return (
      <ArenaTable label={LABEL} columns={COLUMNS} responsive={false}>
        {Array.from({ length: count }, (_, i) => (
          <ArenaTableRow key={i}>
            <ArenaTableCell>rec-{i}</ArenaTableCell>
            <ArenaTableCell>Healthy</ArenaTableCell>
          </ArenaTableRow>
        ))}
      </ArenaTable>
    );
  }
  const root = mount(<Plain />);
  focusHeader(root);
  for (let i = 0; i < 5; i += 1) press('ArrowDown');
  assert.equal(recordOf(theStop(root)).text, 'rec-4');
  act(() => { control.count(3); });
  assert.equal(recordOf(theStop(root)).text, 'rec-2', 'the shipped clamp onto the last projected row changed');
});

test('a table that is not responsive reads no breakpoint and prints no warning', () => {
  const style = document.documentElement.style;
  const saved = style.getPropertyValue('--bp-md');
  forgetArenaBreakpoints();
  style.removeProperty('--bp-md');
  try {
    const root = mount(
      <ArenaTable label={LABEL} columns={COLUMNS} responsive={false}>
        <ArenaTableRow><ArenaTableCell>rec-0</ArenaTableCell><ArenaTableCell>Healthy</ArenaTableCell></ArenaTableRow>
      </ArenaTable>,
    );
    assert.ok(root.querySelector('table'));
    assert.deepEqual(warnings, []);
  } finally {
    if (saved) style.setProperty('--bp-md', saved);
    forgetArenaBreakpoints();
  }
});
