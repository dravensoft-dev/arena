import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { join } from 'node:path';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { forgetArenaWarnings } from '../../../WarnOnce.ts';
import { arenaTreeProblemMessage } from '../TreeModel.ts';
import type { ArenaTreeExpansion, ArenaTreeNode, ArenaTreeSelection } from '../../../Api.generated';
import { ArenaTreeView } from './ArenaTreeView.tsx';

afterEach(cleanup);

const NODES: ArenaTreeNode[] = [
  { id: 'a', label: 'Alpha', icon: 'ph-bold ph-folder' },
  { id: 'a1', label: 'Apple', parent: 'a' },
  { id: 'b', label: 'Beta', icon: 'ph-bold ph-folder' },
  { id: 'b1', label: 'Banana', parent: 'b' },
  { id: 'b2', label: 'Blueberry', parent: 'b', disabled: true },
  { id: 'b3', label: 'Cherry', parent: 'b' },
  { id: 'b3x', label: 'Date', parent: 'b3' },
  { id: 'c', label: 'Lazy', expandable: true },
];
const ALL_OPEN = ['a', 'b', 'b3'];

interface Seen { expanded: string[][]; selected: string[][]; activated: string[] }
const record = (): Seen => ({ expanded: [], selected: [], activated: [] });

function Held({ seen, open = ALL_OPEN, chosen = [], multiple = false, nodes = NODES, selectable = true }: {
  seen: Seen; open?: string[]; chosen?: string[]; multiple?: boolean; nodes?: ArenaTreeNode[]; selectable?: boolean;
}) {
  const [expanded, setExpanded] = useState<ArenaTreeExpansion>({ ids: open });
  const [selection, setSelection] = useState<ArenaTreeSelection>({ ids: chosen });
  return (
    <ArenaTreeView label="Fruit" nodes={nodes} multiple={multiple}
      expanded={expanded}
      onExpandedChange={(next) => { seen.expanded.push([...next.ids]); setExpanded(next); }}
      selection={selectable ? selection : undefined}
      onSelectionChange={(next) => { seen.selected.push([...next.ids]); setSelection(next); }}
      onActivate={(id) => { seen.activated.push(id); }} />
  );
}

const itemsOf = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>('[role="treeitem"]')];
const itemNamed = (root: ParentNode, name: string) => itemsOf(root).find((el) => el.textContent === name)!;
const stopsOf = (root: ParentNode) => itemsOf(root).filter((el) => el.getAttribute('tabindex') === '0');
const caretOf = (item: Element) => item.querySelector<HTMLElement>('[data-arena-part="tree-view.caret"]')!;
const press = (el: HTMLElement) => act(() => { el.click(); });
const facts = (el: Element) => ['aria-level', 'aria-setsize', 'aria-posinset'].map((name) => el.getAttribute(name)).join(' ');
const key = (el: HTMLElement, name: string) => act(() => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
});

function Shifting({ hold, chosen }: { hold: { set?: (nodes: ArenaTreeNode[]) => void }; chosen?: string[] }) {
  const [nodes, setNodes] = useState<ArenaTreeNode[]>(NODES);
  hold.set = setNodes;
  return (
    <ArenaTreeView label="Fruit" nodes={nodes} expanded={{ ids: ALL_OPEN }}
      selection={chosen ? { ids: chosen } : undefined} />
  );
}

test('the tree is one named tree element holding the visible nodes as treeitems, in visible order', () => {
  const root = mount(<Held seen={record()} />);
  const tree = root.querySelector('[role="tree"]')!;
  assert.equal(tree.getAttribute('aria-label'), 'Fruit');
  assert.deepEqual(itemsOf(root).map((el) => el.textContent),
    ['Alpha', 'Apple', 'Beta', 'Banana', 'Blueberry', 'Cherry', 'Date', 'Lazy']);
  assert.ok(itemsOf(root).every((el) => el.parentElement === tree), 'an item sits in a group, not directly in the tree');
});

test('levels, set sizes and positions follow the model: a root of one child, a root of three, a node three deep', () => {
  const root = mount(<Held seen={record()} />);
  assert.equal(facts(itemNamed(root, 'Alpha')), '1 3 1');
  assert.equal(facts(itemNamed(root, 'Apple')), '2 1 1');
  assert.equal(facts(itemNamed(root, 'Beta')), '1 3 2');
  assert.equal(facts(itemNamed(root, 'Banana')), '2 3 1');
  assert.equal(facts(itemNamed(root, 'Blueberry')), '2 3 2');
  assert.equal(facts(itemNamed(root, 'Cherry')), '2 3 3');
  assert.equal(facts(itemNamed(root, 'Date')), '3 1 1');
  assert.equal(facts(itemNamed(root, 'Lazy')), '1 3 3');
});

test('aria-expanded sits on parent nodes only, true while open, and a leaf draws a spacer where a caret would be', () => {
  const root = mount(<Held seen={record()} open={['b']} />);
  assert.equal(itemNamed(root, 'Alpha').getAttribute('aria-expanded'), 'false');
  assert.equal(itemNamed(root, 'Beta').getAttribute('aria-expanded'), 'true');
  assert.equal(itemNamed(root, 'Cherry').getAttribute('aria-expanded'), 'false');
  assert.equal(itemNamed(root, 'Lazy').getAttribute('aria-expanded'), 'false');
  assert.equal(itemNamed(root, 'Banana').hasAttribute('aria-expanded'), false);
  assert.equal(caretOf(itemNamed(root, 'Banana')).children.length, 0);
  assert.equal(caretOf(itemNamed(root, 'Beta')).children.length, 1);
  assert.equal(caretOf(itemNamed(root, 'Banana')).className, caretOf(itemNamed(root, 'Beta')).className);
});

test('the depth channel on each item is its level minus one', () => {
  const root = mount(<Held seen={record()} />);
  const depths = itemsOf(root).map((el) => el.style.getPropertyValue('--arena-tree-depth'));
  assert.deepEqual(depths, ['0', '1', '0', '1', '1', '1', '2', '0']);
});

test('aria-selected is written on every item only when a selection is bound, and aria-multiselectable only with multiple', () => {
  const bound = mount(<Held seen={record()} chosen={['b1']} multiple />);
  assert.deepEqual(itemsOf(bound).map((el) => el.getAttribute('aria-selected')),
    ['false', 'false', 'false', 'true', 'false', 'false', 'false', 'false']);
  assert.equal(bound.querySelector('[role="tree"]')!.getAttribute('aria-multiselectable'), 'true');
  cleanup();
  const single = mount(<Held seen={record()} chosen={['b1']} />);
  assert.equal(single.querySelector('[role="tree"]')!.hasAttribute('aria-multiselectable'), false);
  cleanup();
  const free = mount(<Held seen={record()} selectable={false} multiple />);
  assert.equal(itemsOf(free).some((el) => el.hasAttribute('aria-selected')), false);
  assert.equal(free.querySelector('[role="tree"]')!.hasAttribute('aria-multiselectable'), false);
});

test('a disabled node is marked aria-disabled and stays in the roving set', () => {
  const root = mount(<Held seen={record()} />);
  const disabled = itemNamed(root, 'Blueberry');
  assert.equal(disabled.getAttribute('aria-disabled'), 'true');
  assert.equal(disabled.getAttribute('tabindex'), '-1');
  assert.equal(itemNamed(root, 'Banana').hasAttribute('aria-disabled'), false);
});

test('exactly one item holds the tab stop: the first selected one, else the first', () => {
  const chosen = mount(<Held seen={record()} chosen={['b3x']} />);
  assert.deepEqual(stopsOf(chosen).map((el) => el.textContent), ['Date']);
  cleanup();
  const none = mount(<Held seen={record()} />);
  assert.deepEqual(stopsOf(none).map((el) => el.textContent), ['Alpha']);
});

test('a press on the caret opens or closes the branch and neither selects nor activates', () => {
  const seen = record();
  const root = mount(<Held seen={seen} open={[]} />);
  press(caretOf(itemNamed(root, 'Beta')));
  assert.deepEqual(seen.expanded, [['b']]);
  assert.equal(itemNamed(root, 'Beta').getAttribute('aria-expanded'), 'true');
  press(caretOf(itemNamed(root, 'Beta')));
  assert.deepEqual(seen.expanded, [['b'], []]);
  assert.deepEqual(seen.selected, []);
  assert.deepEqual(seen.activated, []);
});

test('a press on the row selects the node and then activates it', () => {
  const seen = record();
  const root = mount(<Held seen={seen} />);
  press(itemNamed(root, 'Banana'));
  assert.deepEqual(seen.selected, [['b1']]);
  assert.deepEqual(seen.activated, ['b1']);
  assert.equal(itemNamed(root, 'Banana').getAttribute('aria-selected'), 'true');
});

test('a single selection replaces the set and reports nothing when the set does not change', () => {
  const seen = record();
  const root = mount(<Held seen={seen} chosen={['a1']} />);
  press(itemNamed(root, 'Banana'));
  press(itemNamed(root, 'Banana'));
  assert.deepEqual(seen.selected, [['b1']]);
  assert.deepEqual(seen.activated, ['b1', 'b1']);
});

test('with multiple a press adds the node to the set or takes it out', () => {
  const seen = record();
  const root = mount(<Held seen={seen} chosen={['a1']} multiple />);
  press(itemNamed(root, 'Banana'));
  press(itemNamed(root, 'Apple'));
  assert.deepEqual(seen.selected, [['a1', 'b1'], ['b1']]);
});

test('a disabled node is never selected or activated, and its caret still toggles', () => {
  const seen = record();
  const nodes = [...NODES, { id: 'b2x', label: 'Elder', parent: 'b2' }];
  const root = mount(<Held seen={seen} nodes={nodes} />);
  press(itemNamed(root, 'Blueberry'));
  assert.deepEqual(seen.selected, []);
  assert.deepEqual(seen.activated, []);
  press(caretOf(itemNamed(root, 'Blueberry')));
  assert.deepEqual(seen.expanded, [[...ALL_OPEN, 'b2']]);
  assert.ok(itemNamed(root, 'Elder'), 'the open disabled branch drew no child');
});

test('without a selection a press activates and selectionChange never fires', () => {
  const seen = record();
  const root = mount(<Held seen={seen} selectable={false} />);
  press(itemNamed(root, 'Banana'));
  assert.deepEqual(seen.selected, []);
  assert.deepEqual(seen.activated, ['b1']);
});

test('when nodes drop the focused node, the tab stop and focus move to the first selected, else the first visible node', () => {
  for (const [chosen, expected] of [[['b3'], 'Cherry'], [undefined, 'Alpha']] as const) {
    const hold: { set?: (nodes: ArenaTreeNode[]) => void } = {};
    const root = mount(<Shifting hold={hold} chosen={chosen ? [...chosen] : undefined} />);
    act(() => { itemNamed(root, 'Banana').focus(); });
    act(() => { hold.set!(NODES.filter((node) => node.id !== 'b1')); });
    assert.deepEqual(stopsOf(root).map((el) => el.textContent), [expected]);
    assert.equal(document.activeElement, itemNamed(root, expected));
    cleanup();
  }
});

test('when nodes drop the focused node right after its focusout reports no next target, focus still moves to the first selected, else the first visible node', () => {
  for (const [chosen, expected] of [[['b3'], 'Cherry'], [undefined, 'Alpha']] as const) {
    const hold: { set?: (nodes: ArenaTreeNode[]) => void } = {};
    const root = mount(<Shifting hold={hold} chosen={chosen ? [...chosen] : undefined} />);
    const gone = itemNamed(root, 'Banana');
    act(() => { gone.focus(); });
    act(() => {
      gone.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
      hold.set!(NODES.filter((node) => node.id !== 'b1'));
    });
    assert.deepEqual(stopsOf(root).map((el) => el.textContent), [expected]);
    assert.equal(document.activeElement, itemNamed(root, expected));
    cleanup();
  }
});

test('when the window loses focus and two reloads follow, the second dropping the focused node, the tab stop and focus move to the first selected, else the first visible node', async () => {
  for (const [chosen, expected] of [[['b3'], 'Cherry'], [undefined, 'Alpha']] as const) {
    const hold: { set?: (nodes: ArenaTreeNode[]) => void } = {};
    const root = mount(<Shifting hold={hold} chosen={chosen ? [...chosen] : undefined} />);
    const kept = itemNamed(root, 'Banana');
    act(() => { kept.focus(); });
    act(() => { kept.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null })); });
    assert.equal(document.activeElement, kept);
    await Promise.resolve();
    act(() => { hold.set!(NODES.filter((node) => node.id !== 'c')); });
    assert.equal(document.activeElement, kept);
    act(() => { hold.set!(NODES.filter((node) => node.id !== 'b1' && node.id !== 'c')); });
    assert.deepEqual(stopsOf(root).map((el) => el.textContent), [expected]);
    assert.equal(document.activeElement, itemNamed(root, expected));
    cleanup();
  }
});

test('a disabled node the consumer selected reads selected, refuses Space and Enter, and stays in the set when multiple adds another', () => {
  const seen = record();
  const root = mount(<Held seen={seen} chosen={['b2']} multiple />);
  const disabled = itemNamed(root, 'Blueberry');
  assert.equal(disabled.getAttribute('aria-selected'), 'true');
  assert.equal(disabled.getAttribute('aria-disabled'), 'true');
  act(() => { disabled.focus(); });
  key(disabled, ' ');
  key(disabled, 'Enter');
  assert.deepEqual(seen.selected, []);
  assert.deepEqual(seen.activated, []);
  press(itemNamed(root, 'Banana'));
  assert.deepEqual(seen.selected, [['b2', 'b1']]);
  assert.equal(itemNamed(root, 'Blueberry').getAttribute('aria-selected'), 'true');
  assert.equal(itemNamed(root, 'Banana').getAttribute('aria-selected'), 'true');
});

test('an expanded set that names a leaf or an unknown id draws no aria-expanded on the leaf, and a toggle reports those ids back', () => {
  const seen = record();
  const root = mount(<Held seen={seen} open={['b', 'b1', 'ghost']} />);
  assert.deepEqual(itemsOf(root).map((el) => el.textContent), ['Alpha', 'Beta', 'Banana', 'Blueberry', 'Cherry', 'Lazy']);
  assert.equal(itemNamed(root, 'Banana').hasAttribute('aria-expanded'), false);
  assert.equal(caretOf(itemNamed(root, 'Banana')).children.length, 0);
  press(caretOf(itemNamed(root, 'Alpha')));
  press(caretOf(itemNamed(root, 'Beta')));
  assert.deepEqual(seen.expanded, [['b', 'b1', 'ghost', 'a'], ['b1', 'ghost', 'a']]);
});

test('a tree with no handler does not open and draws no error', () => {
  forgetArenaWarnings();
  const warned: unknown[] = [];
  const saved = console.warn;
  console.warn = (...args: unknown[]) => { warned.push(args); };
  try {
    const root = mount(<ArenaTreeView label="Fruit" nodes={NODES} />);
    press(caretOf(itemNamed(root, 'Beta')));
    assert.equal(itemNamed(root, 'Beta').getAttribute('aria-expanded'), 'false');
    assert.deepEqual(itemsOf(root).map((el) => el.textContent), ['Alpha', 'Beta', 'Lazy']);
    assert.deepEqual(warned, []);
    assert.equal(root.textContent, 'AlphaBetaLazy');
  } finally {
    console.warn = saved;
  }
});

test('a duplicate id, an orphan and a cycle each warn once, and the tree draws what it can', () => {
  forgetArenaWarnings();
  const warned: string[] = [];
  const saved = console.warn;
  console.warn = (message: unknown) => { warned.push(String(message)); };
  try {
    const nodes: ArenaTreeNode[] = [
      { id: 'a', label: 'Alpha' },
      { id: 'a', label: 'Again' },
      { id: 'o', label: 'Orphan', parent: 'gone' },
      { id: 'x', label: 'Ex', parent: 'y' },
      { id: 'y', label: 'Why', parent: 'x' },
    ];
    const root = mount(<ArenaTreeView label="Fruit" nodes={nodes} />);
    assert.deepEqual(itemsOf(root).map((el) => el.textContent), ['Alpha', 'Orphan']);
    mount(<ArenaTreeView label="Fruit" nodes={nodes} />);
    assert.deepEqual(warned, [
      arenaTreeProblemMessage({ kind: 'duplicate', id: 'a' }),
      arenaTreeProblemMessage({ kind: 'orphan', id: 'o' }),
      arenaTreeProblemMessage({ kind: 'cycle', id: 'x' }),
      arenaTreeProblemMessage({ kind: 'cycle', id: 'y' }),
    ].map((message) => `[arena] ${message}`));
  } finally {
    console.warn = saved;
  }
});

test('the binding is honest: every `tree` requirement, in both directions', () => {
  const root = mount(<Held seen={record()} chosen={['b1']} multiple />);
  const items = itemsOf(root);
  assertPattern({
    root,
    bindingPath: join(REACT_COMPONENTS, 'navigation', 'arena-tree-view', 'ArenaTreeView.behaviour.json'),
    subjects: {
      default: root.querySelector<HTMLElement>('[role="tree"]')!,
      'roles.treeitem': items,
      'roles.expanded': items.filter((el) => el.hasAttribute('aria-expanded')),
      'states.selected': items,
      'states.level': items,
      'states.setsize': items,
      'states.posinset': items,
    },
    behavioural: {
      'states.setsize': true,
      'states.posinset': true,
      'states.multiselectable': true,
      'focus.roving': true,
      'keyboard.ArrowDown': true,
      'keyboard.ArrowUp': true,
      'keyboard.ArrowRight': true,
      'keyboard.ArrowLeft': true,
      'keyboard.Home': true,
      'keyboard.End': true,
      'keyboard.Enter': true,
      'keyboard.Space': true,
      'keyboard.TypeAhead': true,
    },
  });
});
