/* A windowed tree scrolls inside its own root and draws only the rows near the viewport. happy-dom
 * has no layout, so one stage lays every item out at a fixed height and answers the box's scroll
 * position and height; the keyboard still reaches every visible node through the window, and a
 * far aim settles over animation frames. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { assertNoNode, assertSameNode } from '../../../test/NodeAssert';
import { SilentObserver } from '../../../test/LaidOut';
import { limitWindowInitial, limitWindowOverscan } from '../../../Tokens.generated';
import type { ArenaTreeExpansion, ArenaTreeNode, ArenaTreeSelection } from '../../../Api.generated';
import { ArenaTreeView } from './ArenaTreeView';

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
    if (savedHeight) Object.defineProperty(html, 'clientHeight', savedHeight); else delete html['clientHeight'];
    if (savedTop) Object.defineProperty(proto, 'scrollTop', savedTop); else delete proto['scrollTop'];
  };
  return made;
}

@Component({
  selector: 'tree-window-host',
  standalone: true,
  imports: [ArenaTreeView],
  template: `
    <arena-tree-view label="Workspace" [nodes]="nodes" [windowed]="windowed()"
      [expanded]="expanded()" (expandedChange)="expanded.set($event)" />
  `,
})
class WindowHeld {
  readonly nodes = NODES;
  readonly windowed = signal(true);
  readonly expanded = signal<ArenaTreeExpansion>({ ids: ALL_OPEN });
}

@Component({
  selector: 'tree-window-reload-host',
  standalone: true,
  imports: [ArenaTreeView],
  template: `
    <arena-tree-view label="Workspace" [nodes]="nodes()" windowed [expanded]="expanded" [selection]="selection()" />
  `,
})
class ReloadHeld {
  readonly nodes = signal<ArenaTreeNode[]>(NODES);
  readonly expanded: ArenaTreeExpansion = { ids: ALL_OPEN };
  readonly selection = signal<ArenaTreeSelection>({ ids: [] });
}

const fixtures: ComponentFixture<unknown>[] = [];

beforeEach(() => { stage = staged(); });
afterEach(() => {
  for (const fixture of fixtures.splice(0)) fixture.destroy();
  stage?.restore();
  stage = null;
});

function settle(): void {
  for (let i = 0; i < 6; i++) TestBed.tick();
}

async function frames(): Promise<void> {
  for (let pass = 0; pass < 8; pass++) {
    await new Promise<void>((done) => { requestAnimationFrame(() => done()); });
    settle();
  }
}

function mount(windowed = true): { root: HTMLElement; held: WindowHeld } {
  const fixture = TestBed.createComponent(WindowHeld);
  fixture.componentInstance.windowed.set(windowed);
  fixture.autoDetectChanges();
  settle();
  fixtures.push(fixture);
  return { root: fixture.nativeElement as HTMLElement, held: fixture.componentInstance };
}

const treeOf = (root: ParentNode) => root.querySelector<HTMLElement>('[role="tree"]')!;
const itemsOf = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>('[role="treeitem"]')];
const namesOf = (root: ParentNode) => itemsOf(root).map((el) => el.textContent?.trim());
const stopsOf = (root: ParentNode) => itemsOf(root).filter((el) => el.getAttribute('tabindex') === '0');
const focusedName = () => (document.activeElement as HTMLElement | null)?.textContent?.trim();
const padOf = (root: ParentNode) => treeOf(root).firstElementChild as HTMLElement;
const padTop = (root: ParentNode) => Number.parseFloat(padOf(root).style.paddingBlockStart) || 0;

function scrollTo(root: ParentNode, top: number): void {
  stage!.scrollTop = top;
  treeOf(root).dispatchEvent(new Event('scroll'));
  settle();
}

async function key(name: string): Promise<KeyboardEvent> {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
  (document.activeElement ?? document.body).dispatchEvent(event);
  settle();
  await frames();
  return event;
}

function enter(item: HTMLElement): void {
  item.focus();
  settle();
}

function topRow(root: ParentNode): string | undefined {
  const at = Math.floor((stage!.scrollTop - padTop(root)) / ROW);
  return itemsOf(root)[at]?.textContent?.trim();
}

function theStop(root: ParentNode): HTMLElement {
  const all = stopsOf(root);
  assert.equal(all.length, 1, 'a tree is ONE tab stop');
  return all[0]!;
}

test('without windowed every visible node is drawn and no element wraps the rows', () => {
  const { root } = mount(false);
  assert.equal(itemsOf(root).length, VISIBLE);
  assertSameNode(itemsOf(root)[0]!.parentElement, treeOf(root));
  assert.equal(stopsOf(root).length, 1);
});

test('before anything is measured a windowed tree draws the initial window', () => {
  stage!.restore();
  stage = staged(false);
  const { root } = mount();
  assert.equal(itemsOf(root).length, limitWindowInitial);
  assert.deepEqual(namesOf(root).slice(0, 2), ['Folder 0', 'File 0.0']);
  assert.equal(padTop(root), 0);
});

test('a windowed tree of 2 000 visible nodes draws the rows near its viewport and follows the scroll', () => {
  const { root } = mount();
  const near = VIEWPORT / ROW + limitWindowOverscan;
  assert.ok(near <= limitWindowInitial);
  assert.equal(itemsOf(root).length, near);
  assertSameNode(itemsOf(root)[0]!.closest('[data-arena-part="tree-view.rows"]')?.parentElement, padOf(root));
  scrollTo(root, 1000 * ROW);
  const first = 1000 - limitWindowOverscan;
  assert.equal(padTop(root), first * ROW);
  assert.equal(namesOf(root)[0], `File 19.${first - 19 * (LEAVES + 1) - 1}`);
  assert.equal(itemsOf(root).length, VIEWPORT / ROW + 2 * limitWindowOverscan);
  assert.equal(topRow(root), 'Folder 20');
});

test('End reaches the last node of a long tree, mounts it and focuses it, and Home comes back', async () => {
  const { root } = mount();
  enter(itemsOf(root)[0]!);
  const end = await key('End');
  assert.equal(end.defaultPrevented, true);
  assert.equal(focusedName(), `File ${BRANCHES - 1}.${LEAVES - 1}`);
  assertSameNode(theStop(root), document.activeElement);
  assert.ok(stage!.scrollTop >= (VISIBLE * ROW) - VIEWPORT - 1, 'the box did not scroll to the end');
  await key('Home');
  assert.equal(focusedName(), 'Folder 0');
  assertSameNode(theStop(root), document.activeElement);
  assert.equal(stage!.scrollTop, 0);
});

test('type-ahead reaches a node far below the window and focuses it once mounted', async () => {
  const { root } = mount();
  enter(itemsOf(root)[0]!);
  assert.ok(!namesOf(root).includes('Zebra'));
  await key('z');
  assert.equal(focusedName(), 'Zebra');
  assertSameNode(theStop(root), document.activeElement);
  assert.equal(document.activeElement?.getAttribute('aria-level'), '1');
});

test('collapsing a branch above the viewport keeps the top row in place', () => {
  const { root, held } = mount();
  scrollTo(root, 1000 * ROW);
  assert.equal(topRow(root), 'Folder 20');
  held.expanded.set({ ids: ALL_OPEN.filter((id) => id !== 'b5') });
  settle();
  assert.equal(stage!.scrollTop, (1000 - LEAVES) * ROW);
  assert.equal(topRow(root), 'Folder 20');
});

test('while the stop is outside the window the nearest drawn node holds the one tab stop, and the stop comes back with its node', () => {
  const { root } = mount();
  enter(itemsOf(root)[2]!);
  assert.equal(focusedName(), 'File 0.1');
  scrollTo(root, 1000 * ROW);
  assert.ok(!namesOf(root).includes('File 0.1'));
  assertSameNode(theStop(root), itemsOf(root)[0]);
  scrollTo(root, 0);
  assert.deepEqual(stopsOf(root).map((el) => el.textContent?.trim()), ['File 0.1']);
});

test('turning windowed off and on keeps exactly one tab stop and drops the pad', () => {
  const { root, held } = mount();
  enter(itemsOf(root)[2]!);
  scrollTo(root, 1000 * ROW);
  assert.equal(stopsOf(root).length, 1);
  held.windowed.set(false);
  settle();
  assert.equal(itemsOf(root).length, VISIBLE);
  assertSameNode(itemsOf(root)[0]!.parentElement, treeOf(root));
  assert.deepEqual(stopsOf(root).map((el) => el.textContent?.trim()), ['File 0.1']);
  held.windowed.set(true);
  settle();
  assert.ok(itemsOf(root).length < VISIBLE);
  assertSameNode(itemsOf(root)[0]!.closest('[data-arena-part="tree-view.rows"]')?.parentElement, padOf(root));
  assert.equal(stopsOf(root).length, 1);
  held.windowed.set(false);
  settle();
  assertNoNode(treeOf(root).querySelector('[data-arena-part="tree-view.rows"]'));
  assert.deepEqual(stopsOf(root).map((el) => el.textContent?.trim()), ['File 0.1']);
});

test('focus left on the page stays there when the windowed tree scrolls', () => {
  const { root } = mount();
  enter(itemsOf(root)[2]!);
  assert.equal(focusedName(), 'File 0.1');
  itemsOf(root)[2]!.blur();
  settle();
  assertSameNode(document.activeElement, document.body);
  scrollTo(root, 7 * ROW);
  scrollTo(root, 8 * ROW);
  assertSameNode(document.activeElement, document.body);
});

function mountReload(): { root: HTMLElement; held: ReloadHeld } {
  const fixture = TestBed.createComponent(ReloadHeld);
  fixture.componentInstance.selection.set({ ids: ['b20-5'] });
  fixture.autoDetectChanges();
  settle();
  fixtures.push(fixture);
  return { root: fixture.nativeElement as HTMLElement, held: fixture.componentInstance };
}

test('when nodes drop the focused node and the first selected node is not drawn, the tree scrolls to it and focuses it once mounted, only while focus is inside', async () => {
  const inside = mountReload();
  enter(itemsOf(inside.root)[2]!);
  assert.equal(focusedName(), 'File 0.1');
  assert.ok(!namesOf(inside.root).includes('File 20.5'));
  itemsOf(inside.root)[2]!.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
  inside.held.nodes.set(NODES.filter((node) => node.id !== 'b0-1'));
  settle();
  await frames();
  assert.equal(focusedName(), 'File 20.5');
  assertSameNode(theStop(inside.root), document.activeElement);
  for (const fixture of fixtures.splice(0)) fixture.destroy();
  stage!.scrollTop = 0;

  const outside = mountReload();
  enter(itemsOf(outside.root)[2]!);
  itemsOf(outside.root)[2]!.blur();
  await Promise.resolve();
  settle();
  outside.held.nodes.set(NODES.filter((node) => node.id !== 'b0-1'));
  settle();
  await frames();
  assertSameNode(document.activeElement, document.body);
  assert.equal(stage!.scrollTop, 0);
  assert.equal(stopsOf(outside.root).length, 1);
});
