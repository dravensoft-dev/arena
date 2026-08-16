/* The anchor convention, and the one question this member adds to it: what happens when a cell that
 * navigates sits inside a row that also activates. The answer is that the anchor wins and the row
 * stays silent, which is not new behaviour but the predicate the row already applies to any control
 * a consumer puts in a cell -- so what is asserted here is that Arena's OWN anchor is on the same
 * side of it as a consumer's would be. The rest is the settled split: one activation a router owns,
 * every other one left to the browser with nothing emitted. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { ArenaTable } from '../arena-table/ArenaTable.tsx';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow.tsx';
import { ArenaTableCell } from './ArenaTableCell.tsx';

afterEach(cleanup);

const COLUMNS = [{ header: 'Sale' }, { header: 'Customer' }];

const seen = { rows: 0, went: 0 };

function render() {
  seen.rows = 0;
  seen.went = 0;
  return mount(
    <ArenaTable label="Recent sales" columns={COLUMNS} responsive={false}>
      <ArenaTableRow interactive onClick={() => { seen.rows += 1; }}>
        <ArenaTableCell href="/sales/4f2a1c9" onNavigate={() => { seen.went += 1; }}>4f2a1c9</ArenaTableCell>
        <ArenaTableCell>Nestor</ArenaTableCell>
      </ArenaTableRow>
    </ArenaTable>,
  );
}

function press(el: Element, over: Partial<MouseEventInit> = {}): MouseEvent {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...over });
  act(() => { el.dispatchEvent(event); });
  return event;
}

test('a cell with href draws a real anchor inside its own box, carrying the address', () => {
  const root = render();
  const anchor = root.querySelector('td a') as HTMLAnchorElement;

  assert.ok(anchor, 'no anchor was drawn at all, so the destination is reachable by nothing');
  assert.equal(anchor.getAttribute('href'), '/sales/4f2a1c9',
    'the anchor carries no address, which is the whole of what a crawler and a ctrl-click read');
  assert.equal(anchor.parentElement?.tagName, 'TD',
    'the anchor is not inside the cell box, which is the one place HTML admits it without breaking '
    + 'the row and cell structure the grid is made of');
  assert.match(anchor.textContent ?? '', /4f2a1c9/, 'the projected content is not inside the anchor');
});

test('a cell with no href draws no anchor, so nothing announces a destination there is none of', () => {
  const root = render();
  const plain = root.querySelectorAll('td')[1] as HTMLElement;

  assert.equal(plain.querySelector('a'), null, 'a cell with no href drew an anchor');
});

test('a primary click is cancelled and reported, and the row it sits in does not fire', () => {
  const root = render();
  const event = press(root.querySelector('td a') as Element);

  assert.equal(seen.went, 1, 'the anchor did not report the one activation a router owns');
  assert.equal(event.defaultPrevented, true,
    'the anchor was left to navigate on its own, so a router never gets the chance to');
  assert.equal(seen.rows, 0,
    'the row fired under its own cell anchor, so one press ran two destinations: the precedence is '
    + 'that a press landing on a control inside the row was never the row\'s');
});

test('a modified click and a middle click stay the browser\'s, and report nothing', () => {
  const root = render();
  const anchor = root.querySelector('td a') as Element;

  for (const over of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
    const event = press(anchor, over);
    assert.equal(event.defaultPrevented, false,
      `${JSON.stringify(over)} was cancelled -- the reader asked for a new tab or for the address, and `
      + 'answering with an in-app route is the defect the convention exists to avoid');
  }
  assert.equal(seen.went, 0, 'a modified activation reported through `navigate`');
  assert.equal(seen.rows, 0, 'a modified activation reached the row instead');
});

test('the row still activates from a cell that carries no anchor, so the two coexist', () => {
  const root = render();
  press(root.querySelectorAll('td')[1] as Element);

  assert.equal(seen.rows, 1,
    'the anchor in a sibling cell silenced the row everywhere, which is a member taking more than it asks for');
  assert.equal(seen.went, 0, 'and the anchor reported an activation that never touched it');
});

test('the anchor is a tab stop of its own, one Tab from the cell rather than a step-in', () => {
  const root = render();
  const anchor = root.querySelector('td a') as HTMLAnchorElement;

  assert.equal(anchor.hasAttribute('tabindex'), false,
    'the anchor was given a tabindex, and a native anchor is already in the tab sequence: writing one '
    + 'back onto it is how a grid ends up with a stop it did not mean to place');
});
