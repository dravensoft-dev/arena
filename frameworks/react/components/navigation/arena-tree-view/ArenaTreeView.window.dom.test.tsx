/* A windowed tree scrolls inside its own root and draws only the rows near the viewport. happy-dom
 * has no layout, so one stage lays every item out at a fixed height and answers the box's scroll
 * position and height; the keyboard still reaches every visible node through the window. */
import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { SilentObserver } from '../../../test/LaidOut.ts';
import { limitWindowInitial, limitWindowOverscan } from '../../../Tokens.generated.js';
import type { ArenaTreeExpansion, ArenaTreeNode, ArenaTreeSelection } from '../../../Api.generated';
import { ArenaTreeView } from './ArenaTreeView.tsx';

function scale() {
  return { branches: 40, leaves: 49, row: 40, viewport: 400, far: 30 };
}

const { branches: BRANCHES, leaves: LEAVES, row: ROW, viewport: VIEWPORT, far: FAR } = scale();

function forest(): ArenaTreeNode[] {
  const nodes: ArenaTreeNode[] = [];
  for (let b = 0; b < BRANCHES; b++) {
    nodes.push({ id: `b${b}`, label: b === FAR ? 'Zebra' : `Folder ${b}` });
    for (let l = 0; l < LEAVES; l++) nodes.push({ id: `b${b}-${l}`, label: `File ${b}.${l}`, parent: `b${b}` });
  }
  return nodes;
}

const NODES = forest();
const ALL_OPEN = Array.from({ length: BRANCHES }, (_, b) => `b${b}`);
const VISIBLE = BRANCHES * (LEAVES + 1);

interface Stage { scrollTop: number; restore: () => void }
let stage: Stage | null = null;

function rectOf(top: number, height: number): DOMRect {
  const box = Object.fromEntries([['x', 0], ['y', top], ['top', top], ['left', 0], ['bottom', top + height],
    ['right', 0], ['width', 0], ['height', height]]);
  return { ...box, toJSON() { return this; } } as unknown as DOMRect;
}

function staged(observe = true): Stage {
  const savedRect = Element.prototype.getBoundingClientRect;
  const savedObserver = globalThis.ResizeObserver;
  const proto = Element.prototype as unknown as Record<string, unknown>;
  const html = HTMLElement.prototype as unknown as Record<string, unknown>;
  const savedHeight = Object.getOwnPropertyDescriptor(html, 'clientHeight');
  const savedTop = Object.getOwnPropertyDescriptor(proto, 'scrollTop');
  const made: Stage = { scrollTop: 0, restore: () => {} };
  SilentObserver.made = [];
  globalThis.ResizeObserver = (observe ? SilentObserver : undefined) as unknown as typeof ResizeObserver;
  Element.prototype.getBoundingClientRect = function rect(this: Element): DOMRect {
    const items = Array.from(this.parentElement?.children ?? []);
    const at = items.indexOf(this);
    return this.getAttribute('role') === 'treeitem' ? rectOf(at * ROW, ROW) : rectOf(0, 0);
  };
  Object.defineProperty(html, 'clientHeight', { configurable: true, get: () => VIEWPORT });
  Object.defineProperty(proto, 'scrollTop', {
    configurable: true,
    get: () => made.scrollTop,
    set: (next: number) => { made.scrollTop = next; },
  });
  made.restore = () => {
    Element.prototype.getBoundingClientRect = savedRect;
    globalThis.ResizeObserver = savedObserver;
    if (savedHeight) Object.defineProperty(html, 'clientHeight', savedHeight); else delete html.clientHeight;
    if (savedTop) Object.defineProperty(proto, 'scrollTop', savedTop); else delete proto.scrollTop;
  };
  return made;
}

beforeEach(() => { stage = staged(); });
afterEach(() => {
  cleanup();
  stage?.restore();
  stage = null;
});

let setOpen: (next: ArenaTreeExpansion) => void = () => {};
let setWindowed: (next: boolean) => void = () => {};

function Held({ windowed = true }: { windowed?: boolean }) {
  const [expanded, setExpanded] = useState<ArenaTreeExpansion>({ ids: ALL_OPEN });
  const [isWindowed, setIsWindowed] = useState(windowed);
  setOpen = setExpanded;
  setWindowed = setIsWindowed;
  return (
    <ArenaTreeView label="Workspace" nodes={NODES} windowed={isWindowed}
      expanded={expanded} onExpandedChange={setExpanded} />
  );
}

const treeOf = (root: ParentNode) => root.querySelector<HTMLElement>('[role="tree"]')!;
const itemsOf = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>('[role="treeitem"]')];
const namesOf = (root: ParentNode) => itemsOf(root).map((el) => el.textContent);
const stopsOf = (root: ParentNode) => itemsOf(root).filter((el) => el.getAttribute('tabindex') === '0');
const focusedName = () => (document.activeElement as HTMLElement | null)?.textContent;
const padOf = (root: ParentNode) => treeOf(root).firstElementChild as HTMLElement;
const padTop = (root: ParentNode) => Number.parseFloat(padOf(root).style.paddingBlockStart) || 0;

function scrollTo(root: ParentNode, top: number): void {
  stage!.scrollTop = top;
  act(() => { treeOf(root).dispatchEvent(new Event('scroll')); });
}

function key(name: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
  act(() => { (document.activeElement ?? document.body).dispatchEvent(event); });
  return event;
}

function topRow(root: ParentNode): string | null | undefined {
  const at = Math.floor((stage!.scrollTop - padTop(root)) / ROW);
  return itemsOf(root)[at]?.textContent;
}

test('without windowed every visible node is drawn and no element wraps the rows', () => {
  const root = mount(<Held windowed={false} />);
  assert.equal(itemsOf(root).length, VISIBLE);
  assert.equal(itemsOf(root)[0]!.parentElement, treeOf(root));
  assert.equal(stopsOf(root).length, 1);
});

test('before anything is measured a windowed tree draws the initial window', () => {
  stage!.restore();
  stage = staged(false);
  const root = mount(<Held />);
  assert.equal(itemsOf(root).length, limitWindowInitial);
  assert.deepEqual(namesOf(root).slice(0, 2), ['Folder 0', 'File 0.0']);
  assert.equal(padTop(root), 0);
});

test('a windowed tree of 2 000 visible nodes draws the rows near its viewport and follows the scroll', () => {
  const root = mount(<Held />);
  const near = VIEWPORT / ROW + limitWindowOverscan;
  assert.ok(near <= limitWindowInitial);
  assert.equal(itemsOf(root).length, near);
  assert.equal(itemsOf(root)[0]!.closest('[data-arena-part="tree-view.rows"]')?.parentElement, padOf(root));
  scrollTo(root, 1000 * ROW);
  const first = 1000 - limitWindowOverscan;
  assert.equal(padTop(root), first * ROW);
  assert.equal(namesOf(root)[0], `File 19.${first - 19 * (LEAVES + 1) - 1}`);
  assert.equal(itemsOf(root).length, VIEWPORT / ROW + 2 * limitWindowOverscan);
  assert.equal(topRow(root), 'Folder 20');
});

test('End reaches the last node of a long tree, mounts it and focuses it, and Home comes back', () => {
  const root = mount(<Held />);
  act(() => { itemsOf(root)[0]!.focus(); });
  const end = key('End');
  assert.equal(end.defaultPrevented, true);
  assert.equal(focusedName(), `File ${BRANCHES - 1}.${LEAVES - 1}`);
  assert.deepEqual(stopsOf(root), [document.activeElement]);
  assert.ok(stage!.scrollTop >= (VISIBLE * ROW) - VIEWPORT - 1, 'the box did not scroll to the end');
  key('Home');
  assert.equal(focusedName(), 'Folder 0');
  assert.deepEqual(stopsOf(root), [document.activeElement]);
  assert.equal(stage!.scrollTop, 0);
});

test('type-ahead reaches a node far below the window and focuses it once mounted', () => {
  const root = mount(<Held />);
  act(() => { itemsOf(root)[0]!.focus(); });
  assert.ok(!namesOf(root).includes('Zebra'));
  key('z');
  assert.equal(focusedName(), 'Zebra');
  assert.deepEqual(stopsOf(root), [document.activeElement]);
  assert.equal(document.activeElement?.getAttribute('aria-level'), '1');
});

test('collapsing a branch above the viewport keeps the top row in place', () => {
  const root = mount(<Held />);
  scrollTo(root, 1000 * ROW);
  assert.equal(topRow(root), 'Folder 20');
  act(() => { setOpen({ ids: ALL_OPEN.filter((id) => id !== 'b5') }); });
  assert.equal(stage!.scrollTop, (1000 - LEAVES) * ROW);
  assert.equal(topRow(root), 'Folder 20');
});

test('while the stop is outside the window the nearest drawn node holds the one tab stop, and the stop comes back with its node', () => {
  const root = mount(<Held />);
  act(() => { itemsOf(root)[2]!.focus(); });
  assert.equal(focusedName(), 'File 0.1');
  scrollTo(root, 1000 * ROW);
  assert.ok(!namesOf(root).includes('File 0.1'));
  assert.equal(stopsOf(root).length, 1);
  assert.equal(stopsOf(root)[0], itemsOf(root)[0]);
  scrollTo(root, 0);
  assert.deepEqual(stopsOf(root).map((el) => el.textContent), ['File 0.1']);
});

test('turning windowed off and on keeps exactly one tab stop and drops the pad', () => {
  const root = mount(<Held />);
  act(() => { itemsOf(root)[2]!.focus(); });
  scrollTo(root, 1000 * ROW);
  assert.equal(stopsOf(root).length, 1);
  act(() => { setWindowed(false); });
  assert.equal(itemsOf(root).length, VISIBLE);
  assert.equal(itemsOf(root)[0]!.parentElement, treeOf(root));
  assert.deepEqual(stopsOf(root).map((el) => el.textContent), ['File 0.1']);
  act(() => { setWindowed(true); });
  assert.ok(itemsOf(root).length < VISIBLE);
  assert.equal(itemsOf(root)[0]!.closest('[data-arena-part="tree-view.rows"]')?.parentElement, padOf(root));
  assert.equal(stopsOf(root).length, 1);
  act(() => { setWindowed(false); });
  assert.equal(treeOf(root).querySelector('[data-arena-part="tree-view.rows"]'), null);
  assert.deepEqual(stopsOf(root).map((el) => el.textContent), ['File 0.1']);
});

test('focus left on the page stays there when the windowed tree scrolls', () => {
  const root = mount(<Held />);
  act(() => { itemsOf(root)[2]!.focus(); });
  assert.equal(focusedName(), 'File 0.1');
  act(() => { itemsOf(root)[2]!.blur(); });
  assert.equal(document.activeElement, document.body);
  scrollTo(root, 7 * ROW);
  scrollTo(root, 8 * ROW);
  assert.equal(document.activeElement, document.body);
});

let setReloaded: (next: ArenaTreeNode[]) => void = () => {};

function Reloading() {
  const [nodes, setNodes] = useState<ArenaTreeNode[]>(NODES);
  const [selection] = useState<ArenaTreeSelection>({ ids: ['b20-5'] });
  setReloaded = setNodes;
  return <ArenaTreeView label="Workspace" nodes={nodes} windowed expanded={{ ids: ALL_OPEN }} selection={selection} />;
}

test('when nodes drop the focused node and the first selected node is not drawn, the tree scrolls to it and focuses it once mounted, only while focus is inside', () => {
  const inside = mount(<Reloading />);
  act(() => { itemsOf(inside)[2]!.focus(); });
  assert.equal(focusedName(), 'File 0.1');
  assert.ok(!namesOf(inside).includes('File 20.5'));
  act(() => {
    itemsOf(inside)[2]!.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    setReloaded(NODES.filter((node) => node.id !== 'b0-1'));
  });
  assert.equal(focusedName(), 'File 20.5');
  assert.deepEqual(stopsOf(inside), [document.activeElement]);
  cleanup();
  stage!.scrollTop = 0;

  const outside = mount(<Reloading />);
  act(() => { itemsOf(outside)[2]!.focus(); });
  act(() => { itemsOf(outside)[2]!.blur(); });
  act(() => { setReloaded(NODES.filter((node) => node.id !== 'b0-1')); });
  assert.equal(document.activeElement, document.body);
  assert.equal(stage!.scrollTop, 0);
  assert.equal(stopsOf(outside).length, 1);
});
