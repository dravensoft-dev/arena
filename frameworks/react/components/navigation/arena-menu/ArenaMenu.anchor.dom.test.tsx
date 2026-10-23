/* A composer that draws the menu inside a wider control provides the box the panel lines up with,
 * while the trigger stays the menu's own. happy-dom lays nothing out, so every box is a stubbed
 * rect, the viewport is given a width, and the placement is read as the panel's left and top style. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useRef } from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { ArenaMenu } from './ArenaMenu.tsx';
import { ArenaMenuAnchor } from './MenuAnchor.ts';
import type { ArenaMenuAlign } from '../../../Api.generated';

afterEach(cleanup);

type Box = { left: number; top: number; width: number; height: number };

function box(left: number, top: number, width: number, height: number): Box {
  return { left, top, width, height };
}

const COMPOSER = box(100, 50, 300, 40);
const MENU = box(340, 200, 80, 32);
const PANEL = box(0, 0, 120, 80);

function boxOf(element: Element): Box {
  if (element.hasAttribute('data-composer')) return COMPOSER;
  const part = element.getAttribute('data-arena-part');
  if (part === 'menu') return MENU;
  if (part === 'menu.panel') return PANEL;
  return box(0, 0, 0, 0);
}

function Composer({ align }: { align: ArenaMenuAlign }) {
  const root = useRef<HTMLDivElement | null>(null);
  return (
    <div ref={root} data-composer="">
      <ArenaMenuAnchor.Provider value={root}>
        <ArenaMenu align={align} trigger={<button type="button">Open</button>} items={[{ label: 'Rename' }]} />
      </ArenaMenuAnchor.Provider>
    </div>
  );
}

function placed(tree: React.ReactElement): string {
  const rect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function stubbed(this: Element) {
    const { left, top, width, height } = boxOf(this);
    return { x: left, y: top, left, top, right: left + width, bottom: top + height, width, height, toJSON() { return this; } } as DOMRect;
  };
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, get: () => 1024 });
  try {
    const root = mount(tree);
    act(() => { root.querySelector<HTMLElement>('button')!.click(); });
    const panel = root.querySelector<HTMLElement>('[role="menu"]')!;
    return `${panel.style.left} ${panel.style.top}`;
  } finally {
    Element.prototype.getBoundingClientRect = rect;
    delete (document.documentElement as { clientWidth?: number }).clientWidth;
  }
}

test('inside a composer the panel lines up with the provided box at its start edge', () => {
  assert.equal(placed(<Composer align="start" />), '100px 96px',
    'the panel was placed against some box other than the one the composer provided');
});

test('inside a composer the panel lines up with the provided box at its end edge', () => {
  assert.equal(placed(<Composer align="end" />), '280px 96px',
    'the end edge was measured from some box other than the one the composer provided');
});

test('with no composer the panel lines up with the menu root at its start edge', () => {
  const menu = <ArenaMenu align="start" trigger={<button type="button">Open</button>} items={[{ label: 'Rename' }]} />;
  assert.equal(placed(menu), '340px 238px',
    'a lone menu placed its panel against some box other than its own root');
});

test('with no composer the panel lines up with the menu root at its end edge', () => {
  const menu = <ArenaMenu align="end" trigger={<button type="button">Open</button>} items={[{ label: 'Rename' }]} />;
  assert.equal(placed(menu), '300px 238px',
    'a lone menu measured its end edge from some box other than its own root');
});

function pressDown(el: Element) {
  act(() => { el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
}

test('inside a composer a press on the provided box outside the trigger closes the menu', () => {
  const root = mount(<Composer align="start" />);
  act(() => { root.querySelector<HTMLElement>('button')!.click(); });
  assert.ok(root.querySelector('[role="menu"]'), 'the menu never opened');
  pressDown(root.querySelector('[data-composer]')!);
  assert.equal(root.querySelector('[role="menu"]'), null,
    'a press on the composer outside the trigger left the menu open');
});

test('with no composer a press on the menu root keeps the menu open', () => {
  const root = mount(<ArenaMenu trigger={<button type="button">Open</button>} items={[{ label: 'Rename' }]} />);
  act(() => { root.querySelector<HTMLElement>('button')!.click(); });
  pressDown(root.querySelector('[data-arena-part="menu"]')!);
  assert.ok(root.querySelector('[role="menu"]'), 'a press on a lone menu\'s own root closed it');
});
