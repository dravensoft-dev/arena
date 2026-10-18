import test from 'node:test';
import assert from 'node:assert/strict';
import {
  arenaTreeBlankMessage, arenaTreeIsBranch, arenaTreeLevel, arenaTreeParent, arenaTreePosInSet, arenaTreeProblemMessage,
  arenaTreeSetSize, arenaTreeShape, arenaTreeStep, arenaTreeStop, arenaTreeToggled, arenaTreeVisible,
} from './TreeModel';
import type { ArenaTreeKey, ArenaTreeModelNode } from './TreeModel';

function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function forest(size: number, next: () => number): ArenaTreeModelNode[] {
  const nodes: ArenaTreeModelNode[] = [];
  for (let i = 0; i < size; i++) {
    const node: ArenaTreeModelNode = { id: `n${i}`, label: `label ${Math.floor(next() * 50)}` };
    if (i > 0 && next() < 0.85) node.parent = `n${Math.floor(next() * i)}`;
    if (next() < 0.1) node.disabled = true;
    if (next() < 0.1) node.expandable = true;
    nodes.push(node);
  }
  for (let i = nodes.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [nodes[i], nodes[j]] = [nodes[j]!, nodes[i]!];
  }
  return nodes;
}

function subset(ids: readonly string[], next: () => number): string[] {
  return [...ids.filter(() => next() < 0.5), 'unknown'];
}

const SIZES = [0, 1, 7, 200];

function sweep(body: (nodes: ArenaTreeModelNode[], next: () => number) => void): void {
  const next = seeded(25);
  for (const size of SIZES) {
    for (let k = 0; k < 12; k++) body(forest(size, next), next);
  }
}

function drawn(nodes: ArenaTreeModelNode[]) {
  const { shape, problems } = arenaTreeShape(nodes);
  assert.deepEqual(problems, []);
  return shape;
}

test('every visible node has a visible, open parent', () => {
  sweep((nodes, next) => {
    const shape = drawn(nodes);
    const expanded = subset(nodes.map((n) => n.id), next);
    const visible = arenaTreeVisible(shape, expanded);
    for (const id of visible) {
      const parent = arenaTreeParent(shape, id);
      if (parent === undefined) continue;
      assert.ok(visible.includes(parent) && expanded.includes(parent), `${id} is drawn under a closed or hidden parent`);
    }
  });
});

test('with every branch open the visible list holds each drawn node exactly once', () => {
  sweep((nodes) => {
    const shape = drawn(nodes);
    const visible = arenaTreeVisible(shape, nodes.map((n) => n.id));
    assert.equal(new Set(visible).size, visible.length);
    assert.deepEqual([...visible].sort(), nodes.map((n) => n.id).sort());
  });
});

test('with nothing open only the roots are visible, in array order', () => {
  sweep((nodes) => {
    const shape = drawn(nodes);
    const roots = nodes.filter((n) => n.parent === undefined).map((n) => n.id);
    assert.deepEqual(arenaTreeVisible(shape, []), roots);
  });
});

test('a node sits after its parent and before the parent\'s next sibling', () => {
  sweep((nodes) => {
    const shape = drawn(nodes);
    const visible = arenaTreeVisible(shape, nodes.map((n) => n.id));
    for (const id of visible) {
      const parent = arenaTreeParent(shape, id);
      if (parent !== undefined) assert.ok(visible.indexOf(parent) < visible.indexOf(id));
    }
  });
});

test('set size and position come from the parent\'s children in array order', () => {
  sweep((nodes) => {
    const shape = drawn(nodes);
    for (const node of nodes) {
      const siblings = nodes.filter((n) => n.parent === node.parent).map((n) => n.id);
      assert.equal(arenaTreeSetSize(shape, node.id), siblings.length);
      assert.equal(arenaTreePosInSet(shape, node.id), siblings.indexOf(node.id) + 1);
    }
  });
});

test('a level is one more than its parent\'s, and a root is level 1', () => {
  sweep((nodes) => {
    const shape = drawn(nodes);
    for (const node of nodes) {
      const parent = arenaTreeParent(shape, node.id);
      assert.equal(arenaTreeLevel(shape, node.id), parent === undefined ? 1 : arenaTreeLevel(shape, parent) + 1);
    }
  });
});

test('a node is a branch when it has drawn children or is expandable', () => {
  sweep((nodes) => {
    const shape = drawn(nodes);
    for (const node of nodes) {
      const parents = nodes.some((n) => n.parent === node.id);
      assert.equal(arenaTreeIsBranch(shape, node.id), parents || node.expandable === true);
    }
  });
});

test('ArrowDown then ArrowUp returns to the same node, and the ends do not move', () => {
  sweep((nodes, next) => {
    const shape = drawn(nodes);
    const expanded = subset(nodes.map((n) => n.id), next);
    const visible = arenaTreeVisible(shape, expanded);
    visible.forEach((id, i) => {
      const down = arenaTreeStep(shape, visible, expanded, id, 'ArrowDown');
      if (i === visible.length - 1) {
        assert.equal(down, null);
        return;
      }
      assert.deepEqual(down, { focus: visible[i + 1] });
      assert.deepEqual(arenaTreeStep(shape, visible, expanded, visible[i + 1]!, 'ArrowUp'), { focus: id });
    });
    if (visible.length > 0) assert.equal(arenaTreeStep(shape, visible, expanded, visible[0]!, 'ArrowUp'), null);
  });
});

test('Home and End land on the first and last visible node', () => {
  sweep((nodes, next) => {
    const shape = drawn(nodes);
    const expanded = subset(nodes.map((n) => n.id), next);
    const visible = arenaTreeVisible(shape, expanded);
    for (const id of visible) {
      assert.deepEqual(arenaTreeStep(shape, visible, expanded, id, 'Home'), { focus: visible[0] });
      assert.deepEqual(arenaTreeStep(shape, visible, expanded, id, 'End'), { focus: visible[visible.length - 1] });
    }
  });
});

test('ArrowRight on a leaf and ArrowLeft on a root that is a leaf or closed do nothing', () => {
  sweep((nodes, next) => {
    const shape = drawn(nodes);
    const expanded = subset(nodes.map((n) => n.id), next);
    const visible = arenaTreeVisible(shape, expanded);
    for (const id of visible) {
      if (!arenaTreeIsBranch(shape, id)) assert.equal(arenaTreeStep(shape, visible, expanded, id, 'ArrowRight'), null);
      const root = arenaTreeParent(shape, id) === undefined;
      if (root && !(arenaTreeIsBranch(shape, id) && expanded.includes(id))) {
        assert.equal(arenaTreeStep(shape, visible, expanded, id, 'ArrowLeft'), null);
      }
    }
  });
});

test('ArrowRight opens a closed branch and then enters it, and ArrowLeft closes it and then climbs', () => {
  sweep((nodes, next) => {
    const shape = drawn(nodes);
    const expanded = subset(nodes.map((n) => n.id), next);
    const visible = arenaTreeVisible(shape, expanded);
    for (const id of visible) {
      if (!arenaTreeIsBranch(shape, id)) continue;
      const open = expanded.includes(id);
      const right = arenaTreeStep(shape, visible, expanded, id, 'ArrowRight');
      const first = shape.children.get(id)?.[0];
      assert.deepEqual(right, open ? (first === undefined ? null : { focus: first }) : { open: id });
      const left = arenaTreeStep(shape, visible, expanded, id, 'ArrowLeft');
      const parent = arenaTreeParent(shape, id);
      assert.deepEqual(left, open ? { close: id } : (parent === undefined ? null : { focus: parent }));
    }
  });
});

test('opening and then closing a node returns the set it started from', () => {
  sweep((nodes, next) => {
    const ids = nodes.map((n) => n.id);
    const expanded = subset(ids, next);
    for (const id of ids.filter((i) => !expanded.includes(i)).slice(0, 5)) {
      const opened = arenaTreeToggled(expanded, id, true);
      assert.deepEqual(opened, [...expanded, id]);
      assert.deepEqual(arenaTreeToggled(opened, id, false), expanded);
    }
  });
});

test('toggling keeps unknown ids and order, and never reports a node twice', () => {
  assert.deepEqual(arenaTreeToggled(['b', 'zzz', 'a'], 'a', true), ['b', 'zzz', 'a']);
  assert.deepEqual(arenaTreeToggled(['b', 'zzz', 'a'], 'b', false), ['zzz', 'a']);
  assert.deepEqual(arenaTreeToggled(['b'], 'q', false), ['b']);
});

test('the stop is always a visible node, and the focused one when it is visible', () => {
  sweep((nodes, next) => {
    const shape = drawn(nodes);
    const ids = nodes.map((n) => n.id);
    const expanded = subset(ids, next);
    const visible = arenaTreeVisible(shape, expanded);
    const selected = subset(ids, next);
    const focused = ids.length > 0 && next() < 0.8 ? ids[Math.floor(next() * ids.length)] : undefined;
    const stop = arenaTreeStop(shape, visible, focused, selected);
    if (visible.length === 0) {
      assert.equal(stop, undefined);
      return;
    }
    assert.ok(stop !== undefined && visible.includes(stop));
    if (focused !== undefined && visible.includes(focused)) assert.equal(stop, focused);
  });
});

function tiny() {
  const nodes: ArenaTreeModelNode[] = [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B', parent: 'a' },
    { id: 'c', label: 'C', parent: 'b' },
    { id: 'd', label: 'D', parent: 'a' },
    { id: 'e', label: 'E', expandable: true },
  ];
  return arenaTreeShape(nodes).shape;
}

test('the stop falls to the nearest visible ancestor, then the first selected, then the first visible', () => {
  const shape = tiny();
  const visible = arenaTreeVisible(shape, ['a']);
  assert.deepEqual(visible, ['a', 'b', 'd', 'e']);
  assert.equal(arenaTreeStop(shape, visible, 'c', []), 'b');
  assert.equal(arenaTreeStop(shape, visible, 'gone', ['e', 'd']), 'd');
  assert.equal(arenaTreeStop(shape, visible, undefined, ['c']), 'a');
  assert.equal(arenaTreeStop(shape, [], 'a', ['a']), undefined);
});

test('an expandable node with no drawn child opens but cannot be entered', () => {
  const shape = tiny();
  const visible = arenaTreeVisible(shape, ['e']);
  assert.deepEqual(arenaTreeStep(shape, visible, [], 'e', 'ArrowRight'), { open: 'e' });
  assert.equal(arenaTreeStep(shape, visible, ['e'], 'e', 'ArrowRight'), null);
  assert.deepEqual(arenaTreeStep(shape, visible, ['e'], 'e', 'ArrowLeft'), { close: 'e' });
});

test('a key for a node that is not visible moves nothing', () => {
  const shape = tiny();
  const keys: ArenaTreeKey[] = ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'];
  for (const key of keys) assert.equal(arenaTreeStep(shape, arenaTreeVisible(shape, []), [], 'c', key), null);
});

test('a blank id or label throws and names the field and the index', () => {
  assert.throws(() => arenaTreeShape([{ id: 'a', label: 'A' }, { id: ' ', label: 'B' }]), { message: arenaTreeBlankMessage('id', 1) });
  assert.throws(() => arenaTreeShape([{ id: 'a', label: '' }]), { message: arenaTreeBlankMessage('label', 0) });
  assert.match(arenaTreeBlankMessage('label', 3), /^ArenaTreeView: .*label.*3/);
});

test('the first blank in array order is the one reported', () => {
  assert.throws(
    () => arenaTreeShape([{ id: 'a', label: ' ' }, { id: '', label: 'B' }]),
    { message: arenaTreeBlankMessage('label', 0) },
  );
});

test('a duplicate id is reported and the later node is dropped', () => {
  const { shape, problems } = arenaTreeShape([{ id: 'a', label: 'first' }, { id: 'a', label: 'second' }]);
  assert.deepEqual(problems, [{ kind: 'duplicate', id: 'a' }]);
  assert.equal(shape.byId.get('a')?.label, 'first');
  assert.deepEqual(shape.roots, ['a']);
});

test('a parent naming no node is reported and the node is drawn as a root', () => {
  const { shape, problems } = arenaTreeShape([{ id: 'a', label: 'A', parent: 'nowhere' }, { id: 'b', label: 'B', parent: 'a' }]);
  assert.deepEqual(problems, [{ kind: 'orphan', id: 'a' }]);
  assert.deepEqual(shape.roots, ['a']);
  assert.equal(arenaTreeLevel(shape, 'b'), 2);
});

test('a two-node cycle is reported once per node and neither is drawn', () => {
  const { shape, problems } = arenaTreeShape([
    { id: 'r', label: 'R' },
    { id: 'x', label: 'X', parent: 'y' },
    { id: 'y', label: 'Y', parent: 'x' },
    { id: 'z', label: 'Z', parent: 'y' },
  ]);
  assert.deepEqual(problems, [{ kind: 'cycle', id: 'x' }, { kind: 'cycle', id: 'y' }, { kind: 'cycle', id: 'z' }]);
  assert.deepEqual(arenaTreeVisible(shape, ['x', 'y', 'r']), ['r']);
  assert.equal(shape.byId.size, 1);
});

test('a node that names itself as its parent is a cycle', () => {
  const { problems } = arenaTreeShape([{ id: 'a', label: 'A', parent: 'a' }]);
  assert.deepEqual(problems, [{ kind: 'cycle', id: 'a' }]);
});

test('every problem reads as one sentence that names the tree and the node', () => {
  for (const kind of ['duplicate', 'orphan', 'cycle'] as const) {
    const message = arenaTreeProblemMessage({ kind, id: 'node-7' });
    assert.match(message, /^ArenaTreeView: .*node-7/);
    assert.ok(!message.includes('. '));
  }
  const distinct = new Set((['duplicate', 'orphan', 'cycle'] as const).map((kind) => arenaTreeProblemMessage({ kind, id: 'q' })));
  assert.equal(distinct.size, 3);
});
