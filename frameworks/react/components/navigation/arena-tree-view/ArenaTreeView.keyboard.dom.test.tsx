import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { delayTypeahead } from '../../../Tokens.generated.js';
import type { ArenaTreeExpansion, ArenaTreeNode, ArenaTreeSelection } from '../../../Api.generated';
import { ArenaTreeView } from './ArenaTreeView.tsx';

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

function Held({ seen, open = ALL_OPEN, chosen = [], multiple = false }: {
  seen: Seen; open?: string[]; chosen?: string[]; multiple?: boolean;
}) {
  const [expanded, setExpanded] = useState<ArenaTreeExpansion>({ ids: open });
  const [selection, setSelection] = useState<ArenaTreeSelection>({ ids: chosen });
  return (
    <ArenaTreeView label="Fruit" nodes={NODES} multiple={multiple}
      expanded={expanded}
      onExpandedChange={(next) => { seen.expanded.push([...next.ids]); setExpanded(next); }}
      selection={selection}
      onSelectionChange={(next) => { seen.selected.push([...next.ids]); setSelection(next); }}
      onActivate={(id) => { seen.activated.push(id); }} />
  );
}

type Fire = () => void;
interface Clock { fires: Fire[]; delays: number[]; cleared: number }
let restore: (() => void) | null = null;

function captureClock(): Clock {
  const clock: Clock = { fires: [], delays: [], cleared: 0 };
  const savedSet = globalThis.setTimeout;
  const savedClear = globalThis.clearTimeout;
  (globalThis as { setTimeout: unknown }).setTimeout = ((fn: Fire, ms: number) => {
    clock.fires.push(fn);
    clock.delays.push(ms);
    return clock.fires.length as unknown as ReturnType<typeof setTimeout>;
  });
  (globalThis as { clearTimeout: unknown }).clearTimeout = (() => { clock.cleared += 1; });
  restore = () => { globalThis.setTimeout = savedSet; globalThis.clearTimeout = savedClear; };
  return clock;
}

afterEach(() => { cleanup(); restore?.(); restore = null; });

const itemsOf = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>('[role="treeitem"]')];
const itemNamed = (root: ParentNode, name: string) => itemsOf(root).find((el) => el.textContent === name)!;
const stopsOf = (root: ParentNode) => itemsOf(root).filter((el) => el.getAttribute('tabindex') === '0');
const focusedName = () => (document.activeElement as HTMLElement | null)?.textContent;

function enter(root: ParentNode, name: string) {
  act(() => { itemNamed(root, name).focus(); });
}

function key(name: string, extra: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...extra });
  act(() => { (document.activeElement ?? document.body).dispatchEvent(event); });
  return event;
}

test('ArrowDown and ArrowUp walk the visible nodes and stop at either end', () => {
  const root = mount(<Held seen={record()} />);
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
  const root = mount(<Held seen={record()} />);
  enter(root, 'Alpha');
  for (const name of ['ArrowDown', 'ArrowDown', 'End', 'Home', 'ArrowRight']) {
    key(name);
    assert.deepEqual(stopsOf(root), [document.activeElement]);
  }
});

test('ArrowRight opens a closed branch and then enters it, and ArrowLeft closes it and then climbs', () => {
  const seen = record();
  const root = mount(<Held seen={seen} open={[]} />);
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
  const root = mount(<Held seen={seen} open={['a']} />);
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
  const root = mount(<Held seen={seen} open={[]} />);
  enter(root, 'Lazy');
  key('ArrowRight');
  assert.deepEqual(seen.expanded, [['c']]);
  assert.equal(itemNamed(root, 'Lazy').getAttribute('aria-expanded'), 'true');
  key('ArrowRight');
  assert.equal(focusedName(), 'Lazy');
  assert.deepEqual(seen.expanded, [['c']]);
});

test('Home and End reach the first and last visible node', () => {
  const root = mount(<Held seen={record()} />);
  enter(root, 'Banana');
  key('End');
  assert.equal(focusedName(), 'Lazy');
  key('Home');
  assert.equal(focusedName(), 'Alpha');
});

test('Enter selects the node and activates it, and Space selects without activating', () => {
  const seen = record();
  const root = mount(<Held seen={seen} />);
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
  const root = mount(<Held seen={seen} chosen={['a']} multiple />);
  enter(root, 'Banana');
  key(' ');
  key(' ');
  assert.deepEqual(seen.selected, [['a', 'b1'], ['a']]);
});

test('a disabled node is reached by the arrows and refuses Enter and Space', () => {
  const seen = record();
  const root = mount(<Held seen={seen} />);
  enter(root, 'Banana');
  key('ArrowDown');
  assert.equal(focusedName(), 'Blueberry');
  key('Enter');
  key(' ');
  assert.deepEqual(seen.selected, []);
  assert.deepEqual(seen.activated, []);
});

test('every key the tree answers is prevented, and a key held with Control, Meta or Alt is left alone', () => {
  const root = mount(<Held seen={record()} />);
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
  const root = mount(<Held seen={record()} />);
  enter(root, 'Date');
  act(() => { itemNamed(root, 'Beta').querySelector<HTMLElement>('[data-arena-part="tree-view.caret"]')!.click(); });
  assert.equal(focusedName(), 'Beta');
  assert.deepEqual(stopsOf(root), [document.activeElement]);
});

test('type-ahead moves to the next node starting with the character, wrapping past the end', () => {
  const clock = captureClock();
  const root = mount(<Held seen={record()} />);
  enter(root, 'Cherry');
  key('a');
  assert.equal(focusedName(), 'Alpha');
  clock.fires.at(-1)?.();
  key('z');
  assert.equal(focusedName(), 'Alpha');
});

test('characters typed in succession accumulate into one prefix', () => {
  captureClock();
  const root = mount(<Held seen={record()} />);
  enter(root, 'Alpha');
  key('b');
  assert.equal(focusedName(), 'Beta');
  key('l');
  assert.equal(focusedName(), 'Blueberry');
});

test('the same letter typed again cycles through the nodes that start with it', () => {
  captureClock();
  const root = mount(<Held seen={record()} />);
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
  const root = mount(<Held seen={record()} />);
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
  const root = mount(<Held seen={record()} />);
  enter(root, 'Alpha');
  key('b');
  const before = clock.cleared;
  cleanup();
  assert.equal(clock.cleared, before + 1);
});
