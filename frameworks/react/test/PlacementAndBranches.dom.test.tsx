import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { join } from 'node:path';
import { mount, cleanup, act } from './Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from './AssertPattern.tsx';
import { isFocusable } from '../../../scripts/lib/core/behaviour-compliance.ts';
import { ArenaSkeleton } from '../components/display/arena-skeleton/ArenaSkeleton.tsx';
import { ArenaCalendarEvent } from '../components/display/arena-calendar-event/ArenaCalendarEvent.tsx';

afterEach(cleanup);

const SHAPES = ['arena-skeleton-block', 'arena-skeleton-line', 'arena-skeleton-circle'] as const;

test('ArenaSkeleton renders role=status in every shape, circle and stack included', () => {
  const seen: Record<string, boolean> = {};
  for (const shape of SHAPES) {
    const container = mount(<ArenaSkeleton className={shape} />);
    seen[shape] = Boolean(container.querySelector<HTMLElement>('[role="status"]'));
    cleanup();
  }
  const stack = mount(<ArenaSkeleton lines={2} />);
  seen.stack = Boolean(stack.querySelector<HTMLElement>('[role="status"]'));
  assert.deepEqual(seen, { 'arena-skeleton-block': true, 'arena-skeleton-line': true, 'arena-skeleton-circle': true, stack: true });
});

test('ArenaSkeleton circle carries the role and a name, like its siblings', () => {
  const container = mount(<ArenaSkeleton className="arena-skeleton-circle" />);
  const el = container.firstElementChild;
  assert.equal(el!.getAttribute('role'), 'status');
  assert.equal(el!.getAttribute('aria-label'), 'Loading');
  assert.equal(el!.getAttribute('aria-hidden'), null);
});

test('ArenaSkeleton matches its status binding, block and circle both', () => {

  const placeholder = mount(<ArenaSkeleton />);
  assertPattern({
    root: placeholder,
    bindingPath: join(REACT_COMPONENTS, 'display/arena-skeleton/ArenaSkeleton.behaviour.json'),
    behavioural: { 'focus.unaffected': true },
  });
  cleanup();

  const circle = mount(<ArenaSkeleton className="arena-skeleton-circle" />);
  assertPattern({
    root: circle,
    bindingPath: join(REACT_COMPONENTS, 'display/arena-skeleton/ArenaSkeleton.behaviour.json'),
    behavioural: { 'focus.unaffected': true },
  });
});

test('ArenaCalendarEvent hands its ref to the element that takes focus, panel or no panel', () => {
  const injected = {
    box: {}, color: 'var(--color-cat-1)', timeLabel: '09:00 – 09:30',
    dateLabel: 'Monday 20 July', tabIndex: -1,
  };
  const plain = React.createRef<HTMLElement>();
  mount(<ArenaCalendarEvent ref={plain} id="a" title="Standup" start="2026-07-20T09:00:00Z"
    end="2026-07-20T09:30:00Z" interactive onClick={() => {}} {...injected} />);
  assert.equal(plain.current!.tagName, 'BUTTON', 'the plain chip is not its own button any more');
  assert.equal(plain.current!.getAttribute('tabindex'), '-1',
    'the plain chip cannot be focused programmatically');

  const paneled = React.createRef<HTMLElement>();
  mount(<ArenaCalendarEvent ref={paneled} id="b" title="Standup" start="2026-07-20T09:00:00Z"
    end="2026-07-20T09:30:00Z" interactive onClick={() => {}} actionsEnabled
    actions={<button type="button">Delete</button>} {...injected} />);
  assert.equal(paneled.current!.tagName, 'BUTTON',
    'a paneled chip forwarded its ref to an element ArenaCalendar cannot focus');
  assert.equal(paneled.current!.getAttribute('tabindex'), '-1',
    'the paneled chip body cannot be focused programmatically');

  assert.match(paneled.current!.getAttribute('aria-label')!, /^Standup,/,
    'the ref landed on the kebab rather than on the chip body');
});

const CHIP = {
  box: {}, color: 'var(--color-cat-1)', timeLabel: '09:00 – 09:30',
  dateLabel: 'Monday 20 July', tabIndex: -1,
};
const mountChip = (extra: Record<string, unknown> = {}) => mount(
  <ArenaCalendarEvent id="a" title="Standup" start="2026-07-20T09:00:00Z" end="2026-07-20T09:30:00Z"
    interactive onClick={() => {}} actionsEnabled actions={<button type="button">Delete</button>}
    {...CHIP} {...extra} />,
);
const kebabOf = (c: ParentNode) => [...c.querySelectorAll<HTMLElement>('button')].find((b) => b.getAttribute('aria-label') === 'Actions');
const bodyOf = (c: ParentNode) => [...c.querySelectorAll<HTMLElement>('button')].find((b) => /^Standup,/.test(b.getAttribute('aria-label') || ''));
const press = (el: Element, key: string) => act(() => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
});

test('ArrowRight steps from the chip body to its kebab, and ArrowLeft steps back', () => {
  const c = mountChip();
  const body = bodyOf(c);
  const kebab = kebabOf(c);
  assert.ok(body && kebab, 'the fixture did not render both a body and a kebab');
  assert.equal(kebab.getAttribute('tabindex'), '-1',
    'the kebab is in the page Tab sequence -- focus.roving would be false');

  act(() => { body.focus(); });
  press(body, 'ArrowRight');
  assert.equal(document.activeElement, kebab, 'ArrowRight did not reach the kebab');

  press(kebab, 'ArrowLeft');
  assert.equal(document.activeElement, body, 'ArrowLeft did not step back to the chip body');
});

test('opening the panel moves focus into it, and Escape closes it and returns to the kebab', () => {
  const c = mountChip();
  const kebab = kebabOf(c);

  act(() => { kebab!.focus(); kebab!.click(); });
  const del = [...c.querySelectorAll<HTMLElement>('button')].find((b) => b.textContent === 'Delete');
  assert.ok(del, 'activating the kebab did not open the panel');

  assert.equal(document.activeElement, del, 'the panel opened without taking focus');

  press(del, 'Escape');
  assert.equal([...c.querySelectorAll<HTMLElement>('button')].some((b) => b.textContent === 'Delete'), false,
    'Escape did not close the panel');

  assert.equal(document.activeElement, kebab, 'Escape dropped focus instead of returning it to the kebab');
});

test('a chip opened by defaultPanelOpen does not steal focus on mount', () => {
  const before = document.activeElement;
  const c = mountChip({ defaultPanelOpen: true });
  assert.ok([...c.querySelectorAll<HTMLElement>('button')].some((b) => b.textContent === 'Delete'),
    'defaultPanelOpen did not render the panel');
  assert.equal(document.activeElement, before,
    'a chip mounted with its panel open pulled focus out of whatever had it');
});
