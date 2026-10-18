/* Only the tree's own timer is captured by the fake clock: a delay other than --delay-typeahead goes
 * to the real one, so the test bed's own scheduling still runs. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { assertSameNode } from '../../../test/NodeAssert';
import { delayTypeahead } from '../../../Tokens.generated';
import type { ArenaTreeExpansion, ArenaTreeNode, ArenaTreeSelection } from '../../../Api.generated';
import { ArenaTreeView } from './ArenaTreeView';

const NODES: ArenaTreeNode[] = [
  { id: 'a', label: 'Alpha' },
  { id: 'a1', label: 'Apple', parent: 'a' },
  { id: 'b', label: 'Beta' },
  { id: 'b1', label: 'Banana', parent: 'b' },
  { id: 'b2', label: 'Blueberry', parent: 'b', disabled: true },
  { id: 'b3', label: 'Cherry', parent: 'b' },
  { id: 'b3x', label: 'Date', parent: 'b3' },
  { id: 'c', label: 'Lazy', expandable: true },
];
const ALL_OPEN = ['a', 'b', 'b3'];

interface Seen { expanded: string[][]; selected: string[][]; activated: string[] }
const record = (): Seen => ({ expanded: [], selected: [], activated: [] });

@Component({
  selector: 'tree-keyboard-host',
  standalone: true,
  imports: [ArenaTreeView],
  template: `
    <arena-tree-view label="Fruit" [nodes]="nodes" [multiple]="multiple()"
      [expanded]="expanded()" (expandedChange)="onExpanded($event)"
      [selection]="selection()" (selectionChange)="onSelection($event)"
      (activate)="seen.activated.push($event)" />
  `,
})
class KeyboardHeld {
  readonly nodes = NODES;
  seen = record();
  readonly multiple = signal(false);
  readonly expanded = signal<ArenaTreeExpansion>({ ids: ALL_OPEN });
  readonly selection = signal<ArenaTreeSelection>({ ids: [] });

  onExpanded(next: ArenaTreeExpansion): void {
    this.seen.expanded.push([...next.ids]);
    this.expanded.set(next);
  }

  onSelection(next: ArenaTreeSelection): void {
    this.seen.selected.push([...next.ids]);
    this.selection.set(next);
  }
}

type Fire = () => void;
interface Clock { fires: Fire[]; delays: number[]; cleared: number }
let restore: (() => void) | null = null;

function captureClock(): Clock {
  const clock: Clock = { fires: [], delays: [], cleared: 0 };
  const savedSet = globalThis.setTimeout;
  const savedClear = globalThis.clearTimeout;
  const own = new Set<number>();
  (globalThis as { setTimeout: unknown }).setTimeout = ((fn: Fire, ms?: number, ...rest: unknown[]) => {
    if (ms !== delayTypeahead) return savedSet(fn, ms, ...rest);
    clock.fires.push(fn);
    clock.delays.push(ms);
    own.add(clock.fires.length);
    return clock.fires.length as unknown as ReturnType<typeof setTimeout>;
  });
  (globalThis as { clearTimeout: unknown }).clearTimeout = ((handle: unknown) => {
    if (typeof handle === 'number' && own.has(handle)) clock.cleared += 1;
    else savedClear(handle as ReturnType<typeof setTimeout>);
  });
  restore = () => { globalThis.setTimeout = savedSet; globalThis.clearTimeout = savedClear; };
  return clock;
}

const fixtures: ComponentFixture<KeyboardHeld>[] = [];

function cleanup(): void {
  for (const fixture of fixtures.splice(0)) fixture.destroy();
}

afterEach(() => { cleanup(); restore?.(); restore = null; });

function mount({ seen = record(), open = ALL_OPEN, chosen = [] as string[], multiple = false } = {}): HTMLElement {
  const fixture = TestBed.createComponent(KeyboardHeld);
  const held = fixture.componentInstance;
  held.seen = seen;
  held.expanded.set({ ids: open });
  held.selection.set({ ids: chosen });
  held.multiple.set(multiple);
  fixture.autoDetectChanges();
  fixture.detectChanges();
  fixtures.push(fixture);
  return fixture.nativeElement as HTMLElement;
}

function settle(): void {
  for (const fixture of fixtures) fixture.detectChanges();
}

const itemsOf = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>('[role="treeitem"]')];
const itemNamed = (root: ParentNode, name: string) => itemsOf(root).find((el) => el.textContent?.trim() === name)!;
const stopsOf = (root: ParentNode) => itemsOf(root).filter((el) => el.getAttribute('tabindex') === '0');
const focusedName = () => (document.activeElement as HTMLElement | null)?.textContent?.trim();

function enter(root: ParentNode, name: string) {
  itemNamed(root, name).focus();
  settle();
}

function key(name: string, extra: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...extra });
  (document.activeElement ?? document.body).dispatchEvent(event);
  settle();
  return event;
}

test('ArrowDown and ArrowUp walk the visible nodes and stop at either end', () => {
  const root = mount();
  enter(root, 'Alpha');
  key('ArrowUp');
  assert.equal(focusedName(), 'Alpha');
  const walked: string[] = [];
  for (let step = 0; step < 8; step++) {
    key('ArrowDown');
    walked.push(focusedName() ?? '');
  }
  assert.deepEqual(walked, ['Apple', 'Beta', 'Banana', 'Blueberry', 'Cherry', 'Date', 'Lazy', 'Lazy']);
  key('ArrowUp');
  assert.equal(focusedName(), 'Date');
});

test('exactly one item is tabindex 0 after every move, and it is the focused one', () => {
  const root = mount();
  enter(root, 'Alpha');
  for (const name of ['ArrowDown', 'ArrowDown', 'End', 'Home', 'ArrowRight']) {
    key(name);
    const stops = stopsOf(root);
    assert.equal(stops.length, 1);
    assertSameNode(stops[0], document.activeElement);
  }
});

test('ArrowRight opens a closed branch and then enters it, and ArrowLeft closes it and then climbs', () => {
  const seen = record();
  const root = mount({ seen, open: [] });
  enter(root, 'Beta');
  key('ArrowRight');
  assert.deepEqual(seen.expanded, [['b']]);
  assert.equal(focusedName(), 'Beta');
  key('ArrowRight');
  assert.equal(focusedName(), 'Banana');
  key('ArrowLeft');
  assert.equal(focusedName(), 'Beta');
  key('ArrowLeft');
  assert.deepEqual(seen.expanded, [['b'], []]);
  assert.equal(focusedName(), 'Beta');
});

test('ArrowRight on a leaf and ArrowLeft on a closed root change nothing and report nothing', () => {
  const seen = record();
  const root = mount({ seen, open: ['a'] });
  enter(root, 'Apple');
  const right = key('ArrowRight');
  assert.equal(focusedName(), 'Apple');
  assert.equal(right.defaultPrevented, true);
  enter(root, 'Beta');
  key('ArrowLeft');
  assert.equal(focusedName(), 'Beta');
  assert.deepEqual(seen.expanded, []);
});

test('a branch whose children are not loaded opens on ArrowRight and cannot be entered', () => {
  const seen = record();
  const root = mount({ seen, open: [] });
  enter(root, 'Lazy');
  key('ArrowRight');
  assert.deepEqual(seen.expanded, [['c']]);
  assert.equal(itemNamed(root, 'Lazy').getAttribute('aria-expanded'), 'true');
  key('ArrowRight');
  assert.equal(focusedName(), 'Lazy');
  assert.deepEqual(seen.expanded, [['c']]);
});

test('Home and End reach the first and last visible node', () => {
  const root = mount();
  enter(root, 'Banana');
  key('End');
  assert.equal(focusedName(), 'Lazy');
  key('Home');
  assert.equal(focusedName(), 'Alpha');
});

test('Enter selects the node and activates it, and Space selects without activating', () => {
  const seen = record();
  const root = mount({ seen });
  enter(root, 'Banana');
  key('Enter');
  assert.deepEqual(seen.selected, [['b1']]);
  assert.deepEqual(seen.activated, ['b1']);
  key('ArrowDown');
  key('ArrowDown');
  key(' ');
  assert.deepEqual(seen.selected, [['b1'], ['b3']]);
  assert.deepEqual(seen.activated, ['b1']);
});

test('with multiple Space toggles the focused node in and out of the set', () => {
  const seen = record();
  const root = mount({ seen, chosen: ['a'], multiple: true });
  enter(root, 'Banana');
  key(' ');
  key(' ');
  assert.deepEqual(seen.selected, [['a', 'b1'], ['a']]);
});

test('a disabled node is reached by the arrows and refuses Enter and Space', () => {
  const seen = record();
  const root = mount({ seen });
  enter(root, 'Banana');
  key('ArrowDown');
  assert.equal(focusedName(), 'Blueberry');
  key('Enter');
  key(' ');
  assert.deepEqual(seen.selected, []);
  assert.deepEqual(seen.activated, []);
});

test('every key the tree answers is prevented, and a key held with Control, Meta or Alt is left alone', () => {
  const root = mount();
  enter(root, 'Banana');
  for (const name of ['ArrowDown', 'ArrowUp', 'Home', 'End', ' ', 'Enter', 'b']) {
    assert.equal(key(name).defaultPrevented, true, `${name} was not prevented`);
  }
  enter(root, 'Banana');
  for (const held of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
    assert.equal(key('ArrowDown', held).defaultPrevented, false);
    assert.equal(focusedName(), 'Banana');
  }
  assert.equal(key('Tab').defaultPrevented, false);
});

test('a focused node hidden by a closed ancestor hands focus to the nearest visible one', () => {
  const root = mount();
  enter(root, 'Date');
  itemNamed(root, 'Beta').querySelector<HTMLElement>('[data-arena-part="tree-view.caret"]')!.click();
  settle();
  assert.equal(focusedName(), 'Beta');
  const stops = stopsOf(root);
  assert.equal(stops.length, 1);
  assertSameNode(stops[0], document.activeElement);
});

test('type-ahead moves to the next node starting with the character, wrapping past the end', () => {
  const clock = captureClock();
  const root = mount();
  enter(root, 'Cherry');
  key('a');
  assert.equal(focusedName(), 'Alpha');
  clock.fires.at(-1)?.();
  key('z');
  assert.equal(focusedName(), 'Alpha');
});

test('characters typed in succession accumulate into one prefix', () => {
  captureClock();
  const root = mount();
  enter(root, 'Alpha');
  key('b');
  assert.equal(focusedName(), 'Beta');
  key('l');
  assert.equal(focusedName(), 'Blueberry');
});

test('the same letter typed again cycles through the nodes that start with it', () => {
  captureClock();
  const root = mount();
  enter(root, 'Alpha');
  const landed: string[] = [];
  for (let step = 0; step < 4; step++) {
    key('B');
    landed.push(focusedName() ?? '');
  }
  assert.deepEqual(landed, ['Beta', 'Banana', 'Blueberry', 'Beta']);
});

test('the prefix clears --delay-typeahead after the last character, and each character restarts the clock', () => {
  const clock = captureClock();
  const root = mount();
  enter(root, 'Alpha');
  key('b');
  key('l');
  assert.deepEqual(clock.delays, [delayTypeahead, delayTypeahead]);
  assert.equal(clock.cleared, 1);
  clock.fires.at(-1)?.();
  key('d');
  assert.equal(focusedName(), 'Date');
});

test('the type-ahead clock is cleared when the tree unmounts', () => {
  const clock = captureClock();
  const root = mount();
  enter(root, 'Alpha');
  key('b');
  const before = clock.cleared;
  cleanup();
  assert.equal(clock.cleared, before + 1);
});
