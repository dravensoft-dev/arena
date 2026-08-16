/* The graph is asserted against the real tree for the three cases that motivated it, because a
 * synthetic fixture would prove the walker and not the claim: React's ArenaTable composes ArenaPagination
 * and ArenaSelect, React's ArenaUnauthCard composes ArenaCard where Angular's draws the frame itself, and the
 * union is what keeps the two layers' pages identical. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { composedBy, composedGraph, importedComponents } from './composed-surfaces.ts';
import { repoRoot } from './repo-root.ts';

test('an import of another component directory is a composition, and nothing else is', () => {
  const path = `${repoRoot}/frameworks/react/components/display/arena-table/ArenaTable.tsx`;
  const text = [
    "import { arenaWarnOnce } from '../../../WarnOnce.ts';",
    "import manifest from './ArenaTable.classes.generated.ts';",
    "import { ArenaPagination } from '../../navigation/arena-pagination/ArenaPagination.tsx';",
    "import { ArenaTableRow } from '../arena-table-row/ArenaTableRow.tsx';",
    "import React from 'react';",
  ].join('\n');
  assert.deepEqual(importedComponents(text, path, 'react', repoRoot), ['ArenaPagination', 'ArenaTableRow']);
});

test('the graph reads every layer, so a composition only one of them makes still counts', () => {
  const graph = composedGraph();
  assert.ok(graph.size > 0, 'an empty graph would let every page link too little and pass');
  assert.ok(graph.get('ArenaTable')?.has('ArenaPagination'), 'both layers compose ArenaPagination inside ArenaTable');
  assert.ok(graph.get('ArenaUnauthCard')?.has('ArenaCard'),
    'React composes ArenaCard and Angular draws the frame itself; the union is what both pages carry');
  assert.ok(graph.get('ArenaConfirmDialog')?.has('ArenaButton'), 'the cancel action is a real ArenaButton in React');
});

test('the closure is transitive and excludes what was asked about', () => {
  const graph = new Map([
    ['A', new Set(['B'])],
    ['B', new Set(['C'])],
    ['C', new Set(['A'])],
  ]);
  assert.deepEqual(composedBy(['A'], graph), ['B', 'C']);
  assert.deepEqual(composedBy(['A', 'B'], graph), ['C']);
  assert.deepEqual(composedBy(['Unknown'], graph), []);
});
