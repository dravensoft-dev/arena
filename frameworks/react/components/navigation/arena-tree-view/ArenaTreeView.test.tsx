import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { arenaTreeBlankMessage } from '../TreeModel.ts';
import type { ArenaTreeNode } from '../../../Api.generated';
import { ArenaTreeView } from './ArenaTreeView.tsx';

const NODES: ArenaTreeNode[] = [
  { id: 'project', label: 'Project', icon: 'ph-bold ph-folder' },
  { id: 'src', label: 'src', icon: 'ph-bold ph-folder', parent: 'project' },
  { id: 'tokens', label: 'tokens', parent: 'src' },
  { id: 'docs', label: 'docs', parent: 'project' },
];

const items = (html: string) => html.match(/<div[^>]*role="treeitem"[^>]*>/g) ?? [];

test('the first render on the server draws the visible nodes with their level, set size and position', () => {
  const html = renderToStaticMarkup(
    <ArenaTreeView label="Project files" nodes={NODES} expanded={{ ids: ['project', 'src'] }} selection={{ ids: ['tokens'] }} />);
  assert.match(html, /^<div role="tree" aria-label="Project files"/);
  const rows = items(html);
  assert.equal(rows.length, 4);
  assert.match(rows[0]!, /aria-level="1" aria-setsize="1" aria-posinset="1" aria-expanded="true"/);
  assert.match(rows[2]!, /aria-level="3" aria-setsize="1" aria-posinset="1"/);
  assert.doesNotMatch(rows[2]!, /aria-expanded/);
  assert.match(rows[3]!, /aria-level="2" aria-setsize="2" aria-posinset="2"/);
});

test('the first render on the server gives the tab stop to the selected node and to no other', () => {
  const html = renderToStaticMarkup(
    <ArenaTreeView label="Project files" nodes={NODES} expanded={{ ids: ['project', 'src'] }} selection={{ ids: ['tokens'] }} />);
  const stops = items(html).filter((row) => row.includes('tabindex="0"'));
  assert.equal(stops.length, 1);
  assert.match(stops[0]!, /aria-selected="true"/);
});

test('the first render on the server draws only the roots when nothing is open', () => {
  const html = renderToStaticMarkup(<ArenaTreeView label="Project files" nodes={NODES} />);
  assert.equal(items(html).length, 1);
  assert.doesNotMatch(html, /aria-selected/);
});

test('a blank label is refused', () => {
  assert.throws(() => renderToStaticMarkup(<ArenaTreeView label="  " nodes={NODES} />), /ArenaTreeView: `label` is required/);
});

test('a node with a blank id or a blank label is refused, naming the field and the index', () => {
  const blankId = [...NODES, { id: ' ', label: 'Ghost' }];
  assert.throws(() => renderToStaticMarkup(<ArenaTreeView label="Files" nodes={blankId} />),
    { message: arenaTreeBlankMessage('id', 4) });
  const blankLabel = [{ id: 'one', label: '' }];
  assert.throws(() => renderToStaticMarkup(<ArenaTreeView label="Files" nodes={blankLabel} />),
    { message: arenaTreeBlankMessage('label', 0) });
});
