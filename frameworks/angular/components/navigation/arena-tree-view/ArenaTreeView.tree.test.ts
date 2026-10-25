import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';
import { forgetArenaWarnings } from '../../../WarnOnce';
import { assertSameNode } from '../../../test/NodeAssert';
import { arenaTreeProblemMessage } from '../TreeModel';
import type { ArenaTreeExpansion, ArenaTreeNode, ArenaTreeSelection } from '../../../Api.generated';
import { ArenaTreeView } from './ArenaTreeView';

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

@Component({
  selector: 'tree-held-host',
  standalone: true,
  imports: [ArenaTreeView],
  template: `
    <arena-tree-view label="Fruit" [nodes]="nodes()" [multiple]="multiple()"
      [expanded]="expanded()" (expandedChange)="onExpanded($event)"
      [selection]="selectable() ? selection() : undefined"
      (selectionChange)="onSelection($event)"
      (activate)="seen.activated.push($event)" />
  `,
})
class Held {
  seen = record();
  readonly nodes = signal<ArenaTreeNode[]>(NODES);
  readonly multiple = signal(false);
  readonly selectable = signal(true);
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

@Component({
  selector: 'tree-bare-host',
  standalone: true,
  imports: [ArenaTreeView],
  template: `<arena-tree-view label="Fruit" [nodes]="nodes()" />`,
})
class Bare {
  readonly nodes = signal<ArenaTreeNode[]>(NODES);
}

interface Options { seen?: Seen; open?: string[]; chosen?: string[]; multiple?: boolean; nodes?: ArenaTreeNode[]; selectable?: boolean }

const fixtures: ComponentFixture<unknown>[] = [];

function cleanup(): void {
  for (const fixture of fixtures.splice(0)) fixture.destroy();
}

function mount({ seen = record(), open = ALL_OPEN, chosen = [], multiple = false, nodes = NODES, selectable = true }: Options = {}): HTMLElement {
  const fixture = TestBed.createComponent(Held);
  const held = fixture.componentInstance;
  held.seen = seen;
  held.expanded.set({ ids: open });
  held.selection.set({ ids: chosen });
  held.multiple.set(multiple);
  held.nodes.set(nodes);
  held.selectable.set(selectable);
  fixture.autoDetectChanges();
  fixture.detectChanges();
  fixtures.push(fixture);
  return fixture.nativeElement as HTMLElement;
}

function mountBare(nodes: ArenaTreeNode[] = NODES): HTMLElement {
  const fixture = TestBed.createComponent(Bare);
  fixture.componentInstance.nodes.set(nodes);
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
const namesOf = (root: ParentNode) => itemsOf(root).map((el) => el.textContent?.trim());
const stopsOf = (root: ParentNode) => itemsOf(root).filter((el) => el.getAttribute('tabindex') === '0');
const caretOf = (item: Element) => item.querySelector<HTMLElement>('[data-arena-part="tree-view.caret"]')!;
const press = (el: HTMLElement) => { el.click(); settle(); };
const facts = (el: Element) => ['aria-level', 'aria-setsize', 'aria-posinset'].map((name) => el.getAttribute(name)).join(' ');
const key = (el: HTMLElement, name: string) => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
  settle();
};
const heldOf = () => (fixtures.at(-1) as ComponentFixture<Held>).componentInstance;

test('the tree is one named tree element holding the visible nodes as treeitems, in visible order', () => {
  try {
    const root = mount();
    const tree = root.querySelector('[role="tree"]')!;
    assert.equal(tree.getAttribute('aria-label'), 'Fruit');
    assert.deepEqual(namesOf(root), ['Alpha', 'Apple', 'Beta', 'Banana', 'Blueberry', 'Cherry', 'Date', 'Lazy']);
    assert.ok(itemsOf(root).every((el) => el.parentElement === tree), 'an item sits in a group, not directly in the tree');
  } finally {
    cleanup();
  }
});

test('levels, set sizes and positions follow the model: a root of one child, a root of three, a node three deep', () => {
  try {
    const root = mount();
    assert.equal(facts(itemNamed(root, 'Alpha')), '1 3 1');
    assert.equal(facts(itemNamed(root, 'Apple')), '2 1 1');
    assert.equal(facts(itemNamed(root, 'Beta')), '1 3 2');
    assert.equal(facts(itemNamed(root, 'Banana')), '2 3 1');
    assert.equal(facts(itemNamed(root, 'Blueberry')), '2 3 2');
    assert.equal(facts(itemNamed(root, 'Cherry')), '2 3 3');
    assert.equal(facts(itemNamed(root, 'Date')), '3 1 1');
    assert.equal(facts(itemNamed(root, 'Lazy')), '1 3 3');
  } finally {
    cleanup();
  }
});

test('aria-expanded sits on parent nodes only, true while open, and a leaf draws a spacer where a caret would be', () => {
  try {
    const root = mount({ open: ['b'] });
    assert.equal(itemNamed(root, 'Alpha').getAttribute('aria-expanded'), 'false');
    assert.equal(itemNamed(root, 'Beta').getAttribute('aria-expanded'), 'true');
    assert.equal(itemNamed(root, 'Cherry').getAttribute('aria-expanded'), 'false');
    assert.equal(itemNamed(root, 'Lazy').getAttribute('aria-expanded'), 'false');
    assert.equal(itemNamed(root, 'Banana').hasAttribute('aria-expanded'), false);
    assert.equal(caretOf(itemNamed(root, 'Banana')).children.length, 0);
    assert.equal(caretOf(itemNamed(root, 'Beta')).children.length, 1);
    assert.equal(caretOf(itemNamed(root, 'Banana')).className, caretOf(itemNamed(root, 'Beta')).className);
  } finally {
    cleanup();
  }
});

test('the depth channel on each item is its level minus one', () => {
  try {
    const root = mount();
    const depths = itemsOf(root).map((el) => el.style.getPropertyValue('--arena-tree-depth'));
    assert.deepEqual(depths, ['0', '1', '0', '1', '1', '1', '2', '0']);
  } finally {
    cleanup();
  }
});

test('aria-selected is written on every item only when a selection is bound, and aria-multiselectable only with multiple', () => {
  try {
    const bound = mount({ chosen: ['b1'], multiple: true });
    assert.deepEqual(itemsOf(bound).map((el) => el.getAttribute('aria-selected')),
      ['false', 'false', 'false', 'true', 'false', 'false', 'false', 'false']);
    assert.equal(bound.querySelector('[role="tree"]')!.getAttribute('aria-multiselectable'), 'true');
    cleanup();
    const single = mount({ chosen: ['b1'] });
    assert.equal(single.querySelector('[role="tree"]')!.hasAttribute('aria-multiselectable'), false);
    cleanup();
    const free = mount({ selectable: false, multiple: true });
    assert.equal(itemsOf(free).some((el) => el.hasAttribute('aria-selected')), false);
    assert.equal(free.querySelector('[role="tree"]')!.hasAttribute('aria-multiselectable'), false);
  } finally {
    cleanup();
  }
});

test('a disabled node is marked aria-disabled and stays in the roving set', () => {
  try {
    const root = mount();
    const disabled = itemNamed(root, 'Blueberry');
    assert.equal(disabled.getAttribute('aria-disabled'), 'true');
    assert.equal(disabled.getAttribute('tabindex'), '-1');
    assert.equal(itemNamed(root, 'Banana').hasAttribute('aria-disabled'), false);
  } finally {
    cleanup();
  }
});

test('exactly one item holds the tab stop: the first selected one, else the first', () => {
  try {
    const chosen = mount({ chosen: ['b3x'] });
    assert.deepEqual(stopsOf(chosen).map((el) => el.textContent?.trim()), ['Date']);
    cleanup();
    const none = mount();
    assert.deepEqual(stopsOf(none).map((el) => el.textContent?.trim()), ['Alpha']);
  } finally {
    cleanup();
  }
});

test('a press on the caret opens or closes the branch and neither selects nor activates', () => {
  try {
    const seen = record();
    const root = mount({ seen, open: [] });
    press(caretOf(itemNamed(root, 'Beta')));
    assert.deepEqual(seen.expanded, [['b']]);
    assert.equal(itemNamed(root, 'Beta').getAttribute('aria-expanded'), 'true');
    press(caretOf(itemNamed(root, 'Beta')));
    assert.deepEqual(seen.expanded, [['b'], []]);
    assert.deepEqual(seen.selected, []);
    assert.deepEqual(seen.activated, []);
  } finally {
    cleanup();
  }
});

test('a press on the row selects the node and then activates it', () => {
  try {
    const seen = record();
    const root = mount({ seen });
    press(itemNamed(root, 'Banana'));
    assert.deepEqual(seen.selected, [['b1']]);
    assert.deepEqual(seen.activated, ['b1']);
    assert.equal(itemNamed(root, 'Banana').getAttribute('aria-selected'), 'true');
  } finally {
    cleanup();
  }
});

test('a single selection replaces the set and reports nothing when the set does not change', () => {
  try {
    const seen = record();
    const root = mount({ seen, chosen: ['a1'] });
    press(itemNamed(root, 'Banana'));
    press(itemNamed(root, 'Banana'));
    assert.deepEqual(seen.selected, [['b1']]);
    assert.deepEqual(seen.activated, ['b1', 'b1']);
  } finally {
    cleanup();
  }
});

test('with multiple a press adds the node to the set or takes it out', () => {
  try {
    const seen = record();
    const root = mount({ seen, chosen: ['a1'], multiple: true });
    press(itemNamed(root, 'Banana'));
    press(itemNamed(root, 'Apple'));
    assert.deepEqual(seen.selected, [['a1', 'b1'], ['b1']]);
  } finally {
    cleanup();
  }
});

test('a disabled node is never selected or activated, and its caret still toggles', () => {
  try {
    const seen = record();
    const nodes = [...NODES, { id: 'b2x', label: 'Elder', parent: 'b2' }];
    const root = mount({ seen, nodes });
    press(itemNamed(root, 'Blueberry'));
    assert.deepEqual(seen.selected, []);
    assert.deepEqual(seen.activated, []);
    press(caretOf(itemNamed(root, 'Blueberry')));
    assert.deepEqual(seen.expanded, [[...ALL_OPEN, 'b2']]);
    assert.ok(itemNamed(root, 'Elder'), 'the open disabled branch drew no child');
  } finally {
    cleanup();
  }
});

test('without a selection a press activates and selectionChange never fires', () => {
  try {
    const seen = record();
    const root = mount({ seen, selectable: false });
    press(itemNamed(root, 'Banana'));
    assert.deepEqual(seen.selected, []);
    assert.deepEqual(seen.activated, ['b1']);
  } finally {
    cleanup();
  }
});

test('when nodes drop the focused node, the tab stop and focus move to the first selected, else the first visible node', () => {
  try {
    for (const [selectable, expected] of [[true, 'Cherry'], [false, 'Alpha']] as const) {
      const root = mount({ chosen: ['b3'], selectable });
      itemNamed(root, 'Banana').focus();
      settle();
      heldOf().nodes.set(NODES.filter((node) => node.id !== 'b1'));
      settle();
      assert.deepEqual(stopsOf(root).map((el) => el.textContent?.trim()), [expected]);
      assertSameNode(document.activeElement, itemNamed(root, expected));
      cleanup();
    }
  } finally {
    cleanup();
  }
});

test('when nodes drop the focused node right after its focusout reports no next target, focus still moves to the first selected, else the first visible node', () => {
  try {
    for (const [selectable, expected] of [[true, 'Cherry'], [false, 'Alpha']] as const) {
      const root = mount({ chosen: ['b3'], selectable });
      const gone = itemNamed(root, 'Banana');
      gone.focus();
      settle();
      gone.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
      heldOf().nodes.set(NODES.filter((node) => node.id !== 'b1'));
      settle();
      assert.deepEqual(stopsOf(root).map((el) => el.textContent?.trim()), [expected]);
      assertSameNode(document.activeElement, itemNamed(root, expected));
      cleanup();
    }
  } finally {
    cleanup();
  }
});

test('when the window loses focus and two reloads follow, the second dropping the focused node, the tab stop and focus move to the first selected, else the first visible node', async () => {
  try {
    for (const [selectable, expected] of [[true, 'Cherry'], [false, 'Alpha']] as const) {
      const root = mount({ chosen: ['b3'], selectable });
      const kept = itemNamed(root, 'Banana');
      kept.focus();
      settle();
      kept.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
      assertSameNode(document.activeElement, kept);
      await Promise.resolve();
      heldOf().nodes.set(NODES.filter((node) => node.id !== 'c'));
      settle();
      assertSameNode(document.activeElement, kept);
      heldOf().nodes.set(NODES.filter((node) => node.id !== 'b1' && node.id !== 'c'));
      settle();
      assert.deepEqual(stopsOf(root).map((el) => el.textContent?.trim()), [expected]);
      assertSameNode(document.activeElement, itemNamed(root, expected));
      cleanup();
    }
  } finally {
    cleanup();
  }
});

test('a disabled node the consumer selected reads selected, refuses Space and Enter, and stays in the set when multiple adds another', () => {
  try {
    const seen = record();
    const root = mount({ seen, chosen: ['b2'], multiple: true });
    const disabled = itemNamed(root, 'Blueberry');
    assert.equal(disabled.getAttribute('aria-selected'), 'true');
    assert.equal(disabled.getAttribute('aria-disabled'), 'true');
    disabled.focus();
    settle();
    key(disabled, ' ');
    key(disabled, 'Enter');
    assert.deepEqual(seen.selected, []);
    assert.deepEqual(seen.activated, []);
    press(itemNamed(root, 'Banana'));
    assert.deepEqual(seen.selected, [['b2', 'b1']]);
    assert.equal(itemNamed(root, 'Blueberry').getAttribute('aria-selected'), 'true');
    assert.equal(itemNamed(root, 'Banana').getAttribute('aria-selected'), 'true');
  } finally {
    cleanup();
  }
});

test('an expanded set that names a leaf or an unknown id draws no aria-expanded on the leaf, and a toggle reports those ids back', () => {
  try {
    const seen = record();
    const root = mount({ seen, open: ['b', 'b1', 'ghost'] });
    assert.deepEqual(namesOf(root), ['Alpha', 'Beta', 'Banana', 'Blueberry', 'Cherry', 'Lazy']);
    assert.equal(itemNamed(root, 'Banana').hasAttribute('aria-expanded'), false);
    assert.equal(caretOf(itemNamed(root, 'Banana')).children.length, 0);
    press(caretOf(itemNamed(root, 'Alpha')));
    press(caretOf(itemNamed(root, 'Beta')));
    assert.deepEqual(seen.expanded, [['b', 'b1', 'ghost', 'a'], ['b1', 'ghost', 'a']]);
  } finally {
    cleanup();
  }
});

test('a tree with no handler does not open and draws no error', () => {
  forgetArenaWarnings();
  const warned: unknown[] = [];
  const saved = console.warn;
  console.warn = (...args: unknown[]) => { warned.push(args); };
  try {
    const root = mountBare();
    press(caretOf(itemNamed(root, 'Beta')));
    assert.equal(itemNamed(root, 'Beta').getAttribute('aria-expanded'), 'false');
    assert.deepEqual(namesOf(root), ['Alpha', 'Beta', 'Lazy']);
    assert.deepEqual(warned, []);
    assert.equal(root.textContent?.replace(/\s+/g, ''), 'AlphaBetaLazy');
  } finally {
    console.warn = saved;
    cleanup();
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
    const root = mountBare(nodes);
    assert.deepEqual(namesOf(root), ['Alpha', 'Orphan']);
    mountBare(nodes);
    assert.deepEqual(warned, [
      arenaTreeProblemMessage({ kind: 'duplicate', id: 'a' }),
      arenaTreeProblemMessage({ kind: 'orphan', id: 'o' }),
      arenaTreeProblemMessage({ kind: 'cycle', id: 'x' }),
      arenaTreeProblemMessage({ kind: 'cycle', id: 'y' }),
    ].map((message) => `[arena] ${message}`));
  } finally {
    console.warn = saved;
    cleanup();
  }
});

test('the binding is honest: every `tree` requirement, in both directions', () => {
  try {
    const root = mount({ chosen: ['b1'], multiple: true });
    const items = itemsOf(root);
    assertPattern({
      root,
      bindingPath: join(ANGULAR_COMPONENTS, 'navigation', 'arena-tree-view', 'ArenaTreeView.behaviour.json'),
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
  } finally {
    cleanup();
  }
});
