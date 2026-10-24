/* The acceptance table for native events: each row dispatches one native event on the named inner
 * element and counts what the document hears against what the Arena member reports. A native
 * button that is disabled or loading is delivered no click, so its document count is 0. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from './Harness.tsx';
import { ArenaCard } from '../components/display/arena-card/ArenaCard.tsx';
import { ArenaButton } from '../components/forms/arena-button/ArenaButton.tsx';
import { ArenaIconButton } from '../components/forms/arena-icon-button/ArenaIconButton.tsx';
import { ArenaSplitButton } from '../components/forms/arena-split-button/ArenaSplitButton.tsx';
import { ArenaTable } from '../components/display/arena-table/ArenaTable.tsx';
import { ArenaTableRow } from '../components/display/arena-table-row/ArenaTableRow.tsx';
import { ArenaTableCell } from '../components/display/arena-table-cell/ArenaTableCell.tsx';
import { ArenaCalendarEvent } from '../components/display/arena-calendar-event/ArenaCalendarEvent.tsx';

afterEach(cleanup);

const click = () => new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
const enter = () => new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });

function heardByDocument(el: Element, event: Event): number {
  let heard = 0;
  const count = () => { heard += 1; };
  document.addEventListener(event.type, count);
  try {
    act(() => { el.dispatchEvent(event); });
  } finally {
    document.removeEventListener(event.type, count);
  }
  return heard;
}

const part = (root: ParentNode, name: string) => root.querySelector<HTMLElement>(`[data-arena-part="${name}"]`)!;

test("ArenaCard: a click on a plain card's body reaches the document and activates nothing", () => {
  let n = 0;
  const root = mount(<ArenaCard title="Plain" onActivate={() => { n += 1; }}>Body</ArenaCard>);
  assert.equal(heardByDocument(part(root, 'card.body'), click()), 1);
  assert.equal(n, 0);
});

test('ArenaCard: a click on an interactive card reaches the document and activates once', () => {
  let n = 0;
  const root = mount(<ArenaCard title="Card" interactive onActivate={() => { n += 1; }}>Body</ArenaCard>);
  assert.equal(heardByDocument(part(root, 'card.body'), click()), 1);
  assert.equal(n, 1);
});

test('ArenaCard: a disabled interactive card hears the click and activates nothing', () => {
  let n = 0;
  const root = mount(<ArenaCard title="Card" interactive disabled onActivate={() => { n += 1; }}>Body</ArenaCard>);
  assert.equal(heardByDocument(root.firstElementChild!, click()), 1);
  assert.equal(n, 0);
});

test('ArenaCard: Enter on an interactive card reaches the document as a keydown (N3)', () => {
  let n = 0;
  const root = mount(<ArenaCard title="Card" interactive onActivate={() => { n += 1; }}>Body</ArenaCard>);
  assert.equal(heardByDocument(root.firstElementChild!, enter()), 1);
  assert.equal(n, 1);
});

test("ArenaCard: a click on the href card's anchor reaches the document and activates once", () => {
  let n = 0;
  const root = mount(<ArenaCard title="Card" href="/x" onActivate={() => { n += 1; }}>Body</ArenaCard>);
  assert.equal(heardByDocument(root.querySelector('a')!, click()), 1);
  assert.equal(n, 1);
});

test('ArenaButton: a click reaches the document and activates once', () => {
  let n = 0;
  const root = mount(<ArenaButton onActivate={() => { n += 1; }}>Go</ArenaButton>);
  assert.equal(heardByDocument(root.querySelector('button')!, click()), 1);
  assert.equal(n, 1);
});

test('ArenaButton: a loading button hears the click and activates nothing', () => {
  let n = 0;
  const root = mount(<ArenaButton loading onActivate={() => { n += 1; }}>Go</ArenaButton>);
  assert.equal(heardByDocument(root.querySelector('button')!, click()), 0);
  assert.equal(n, 0);
});

test('ArenaIconButton: a click reaches the document and activates once', () => {
  let n = 0;
  const root = mount(<ArenaIconButton icon="ph-bold ph-x" label="Close" onActivate={() => { n += 1; }} />);
  assert.equal(heardByDocument(root.querySelector('button')!, click()), 1);
  assert.equal(n, 1);
});

const split = (onActivate: () => void) => (
  <ArenaSplitButton label="Deploy" menuLabel="More deploy options" items={[{ label: 'Rollback' }]} onActivate={onActivate}>
    Deploy
  </ArenaSplitButton>
);

test('ArenaSplitButton: a click on the primary half reaches the document and activates once', () => {
  let n = 0;
  const root = mount(split(() => { n += 1; }));
  assert.equal(heardByDocument(part(root, 'split-button.primary'), click()), 1);
  assert.equal(n, 1);
});

test('ArenaSplitButton: a click on the caret reaches the document and activates nothing', () => {
  let n = 0;
  const root = mount(split(() => { n += 1; }));
  assert.equal(heardByDocument(part(root, 'split-button.caret'), click()), 1);
  assert.equal(n, 0);
});

test('ArenaTableRow: a click on a cell of an interactive row reaches the document and activates once', () => {
  let n = 0;
  const root = mount(
    <ArenaTable label="Services" responsive={false} columns={[{ header: 'Service' }, { header: 'Status' }]}>
      <ArenaTableRow interactive onActivate={() => { n += 1; }}>
        <ArenaTableCell>checkout</ArenaTableCell><ArenaTableCell>Healthy</ArenaTableCell>
      </ArenaTableRow>
    </ArenaTable>,
  );
  assert.equal(heardByDocument(root.querySelector('td')!, click()), 1);
  assert.equal(n, 1);
});

test('ArenaTableRow: Enter on an interactive card-layout row reaches the document as a keydown (N3)', () => {
  let n = 0;
  const root = mount(
    <table role="presentation"><tbody role="presentation">
      <ArenaTableRow layout="card" interactive columns={[{ header: 'Service' }]} onActivate={() => { n += 1; }}>
        <ArenaTableCell>checkout</ArenaTableCell>
      </ArenaTableRow>
    </tbody></table>,
  );
  assert.equal(heardByDocument(root.querySelector('tr')!, enter()), 1);
  assert.equal(n, 1);
});

const CHIP = {
  box: {}, color: 'var(--color-cat-1)', timeLabel: '09:00 – 09:30', dateLabel: 'Monday 20 July', tabIndex: -1,
};
const chip = (onActivate: () => void, extra: Record<string, unknown> = {}) => (
  <ArenaCalendarEvent id="a" title="Standup" start="2026-07-20T09:00:00Z" end="2026-07-20T09:30:00Z"
    interactive onActivate={onActivate} {...CHIP} {...extra} />
);
const buttonNamed = (root: ParentNode, name: RegExp) =>
  [...root.querySelectorAll<HTMLElement>('button')].find((b) => name.test(b.getAttribute('aria-label') ?? ''))!;

test('ArenaCalendarEvent: a click on the chip stops at the chip, alike in both layers (D2)', () => {
  let n = 0;
  const root = mount(chip(() => { n += 1; }));
  assert.equal(heardByDocument(buttonNamed(root, /^Standup,/), click()), 0);
  assert.equal(n, 1);
});

test('ArenaCalendarEvent: a click on the body of a chip with a panel stops at the chip, alike in both layers (D2)', () => {
  let n = 0;
  const root = mount(chip(() => { n += 1; }, { actionsEnabled: true, actions: <button type="button">Delete</button> }));
  assert.equal(heardByDocument(buttonNamed(root, /^Standup,/), click()), 0);
  assert.equal(n, 1);
});

test('ArenaCalendarEvent: a press on the kebab opens the panel and does not activate the chip', () => {
  let n = 0;
  const root = mount(chip(() => { n += 1; }, { actionsEnabled: true, actions: <button type="button">Delete</button> }));
  assert.equal(root.textContent?.includes('Delete'), false);
  assert.equal(heardByDocument(buttonNamed(root, /^Actions$/), click()), 1);
  assert.equal(n, 0);
  assert.equal(root.textContent?.includes('Delete'), true, 'the kebab press did not open the panel');
});
