/* The split's two halves at work: the primary half reports its activation unless loading or
 * disabled blocks it, the caret opens the menu while the action runs and not while disabled, an
 * entry reports the whole item, and focus comes back to the caret. happy-dom lays nothing out, so
 * the alignment cases stub every box, the caret's apart from the split's, and read the panel's
 * left and top style to see which box the panel was placed against. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { ArenaSplitButton } from './ArenaSplitButton.tsx';
import type { ArenaMenuAlign, ArenaMenuItem } from '../../../Api.generated';

afterEach(cleanup);

const ITEMS: ArenaMenuItem[] = [{ label: 'Deploy to staging' }, { divider: true }, { label: 'Roll back', destructive: true }];

function split(props: Partial<React.ComponentProps<typeof ArenaSplitButton>> = {}) {
  return (
    <ArenaSplitButton label="Deployment" menuLabel="More deploy options" items={ITEMS} {...props}>Deploy</ArenaSplitButton>
  );
}

function halves(root: ParentNode) {
  return {
    primary: root.querySelector<HTMLButtonElement>('[data-arena-part="split-button.primary"]')!,
    caret: root.querySelector<HTMLButtonElement>('[data-arena-part="split-button.caret"]')!,
  };
}

function press(el: Element, key: string) {
  act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); });
}

test('the root is a group the label names, holding both halves', () => {
  const root = mount(split());
  const group = root.querySelector<HTMLElement>('[role="group"]')!;
  assert.equal(group.getAttribute('aria-label'), 'Deployment');
  const { primary, caret } = halves(root);
  assert.ok(group.contains(primary) && group.contains(caret), 'a half sits outside the named group');
});

test('activating the primary half reports a click', () => {
  let clicks = 0;
  const root = mount(split({ onActivate: () => { clicks += 1; } }));
  act(() => { halves(root).primary.click(); });
  assert.equal(clicks, 1);
  assert.equal(root.querySelector('[role="menu"]'), null, 'the primary half opened the menu');
});

test('activating the caret opens the menu and reports no click', () => {
  let clicks = 0;
  const root = mount(split({ onActivate: () => { clicks += 1; } }));
  act(() => { halves(root).caret.click(); });
  assert.ok(root.querySelector('[role="menu"]'), 'the caret did not open the menu');
  assert.equal(clicks, 0, 'a caret press was reported as a primary activation');
});

test('with the menu open, a press on the primary half closes the menu and reports the click once', () => {
  let clicks = 0;
  const root = mount(split({ onActivate: () => { clicks += 1; } }));
  const { primary, caret } = halves(root);
  act(() => { caret.click(); });
  assert.ok(root.querySelector('[role="menu"]'), 'the caret did not open the menu');
  act(() => { primary.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
  act(() => { primary.click(); });
  assert.equal(root.querySelector('[role="menu"]'), null, 'a press on the primary half left the menu open');
  assert.equal(caret.getAttribute('aria-expanded'), 'false');
  assert.equal(clicks, 1, 'the primary half did not report its activation exactly once');
});

test('loading and disabled each report nothing from the primary half', () => {
  for (const blocked of [{ loading: true }, { disabled: true }]) {
    let clicks = 0;
    const root = mount(split({ ...blocked, onActivate: () => { clicks += 1; } }));
    act(() => { halves(root).primary.click(); });
    assert.equal(clicks, 0, `the primary half reported a click while ${Object.keys(blocked)[0]}`);
    cleanup();
  }
});

test('the caret opens the menu while the primary action is loading', () => {
  const root = mount(split({ loading: true }));
  const { caret } = halves(root);
  act(() => { caret.click(); });
  assert.ok(root.querySelector('[role="menu"]'), 'loading blocked the caret as well');
  assert.equal(caret.getAttribute('aria-expanded'), 'true');
});

test('disabled blocks the caret', () => {
  const root = mount(split({ disabled: true }));
  const { caret } = halves(root);
  assert.equal(caret.disabled, true);
  act(() => { caret.click(); });
  assert.equal(root.querySelector('[role="menu"]'), null, 'a disabled split opened its menu');
});

test('an entry reports the whole item and closes the menu', () => {
  const seen: ArenaMenuItem[] = [];
  const root = mount(split({ onSelect: (item) => seen.push(item) }));
  act(() => { halves(root).caret.click(); });
  const rows = root.querySelectorAll<HTMLElement>('[role="menuitem"]');
  act(() => { rows[1]!.click(); });
  assert.equal(seen.length, 1);
  assert.equal(seen[0], ITEMS[2], 'select did not carry the item the caller passed in');
  assert.equal(root.querySelector('[role="menu"]'), null, 'activating an entry left the menu open');
});

test('the tab stops are the primary half, then the caret', () => {
  const root = mount(split());
  const stops = [...root.querySelectorAll<HTMLElement>('button, [tabindex]')].filter((one) => one.tabIndex >= 0);
  const { primary, caret } = halves(root);
  assert.deepEqual(stops, [primary, caret]);
});

test('Escape closes the menu and returns focus to the caret', () => {
  const root = mount(split());
  const { caret } = halves(root);
  act(() => { caret.click(); });
  const first = root.querySelector<HTMLElement>('[role="menuitem"]')!;
  assert.equal(document.activeElement, first, 'opening did not move focus to the first entry');
  press(first, 'Escape');
  assert.equal(root.querySelector('[role="menu"]'), null);
  assert.equal(document.activeElement, caret);
});

type Box = { left: number; top: number; width: number; height: number };

function box(left: number, top: number, width: number, height: number): Box {
  return { left, top, width, height };
}

const SPLIT = box(100, 50, 300, 40);
const CARET = box(340, 60, 40, 40);
const PANEL = box(0, 0, 120, 80);

function boxOf(element: Element): Box {
  const part = element.getAttribute('data-arena-part');
  if (part === 'split-button') return SPLIT;
  if (part === 'menu' || part === 'split-button.caret') return CARET;
  if (part === 'menu.panel') return PANEL;
  return box(0, 0, 0, 0);
}

function placed(align?: ArenaMenuAlign): string {
  const rect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function stubbed(this: Element) {
    const { left, top, width, height } = boxOf(this);
    return { x: left, y: top, left, top, right: left + width, bottom: top + height, width, height, toJSON() { return this; } } as DOMRect;
  };
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, get: () => 1024 });
  try {
    const root = mount(split(align ? { align } : {}));
    act(() => { halves(root).caret.click(); });
    const panel = root.querySelector<HTMLElement>('[role="menu"]')!;
    return `${panel.style.left} ${panel.style.top}`;
  } finally {
    Element.prototype.getBoundingClientRect = rect;
    delete (document.documentElement as { clientWidth?: number }).clientWidth;
  }
}

test('align start lines the panel up with the start edge of the whole split', () => {
  assert.equal(placed('start'), '100px 96px', 'the panel was measured from the caret, not from the split');
});

test('align end lines the panel up with the end edge of the whole split', () => {
  assert.equal(placed('end'), '280px 96px', 'the panel was measured from the caret, not from the split');
});

test('align defaults to the end edge', () => {
  assert.equal(placed(), '280px 96px');
});
