/* The first render runs through @angular/platform-server. The render swaps the DOM adapter for
 * domino's, which replaces Event and its siblings on globalThis, so each render snapshots the
 * globals first and restores them, and the adapter, afterwards (as test/ServerRender.test.ts does). */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal, ɵsetDocument, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { bootstrapApplication, ɵBrowserDomAdapter } from '@angular/platform-browser';
import { provideServerRendering, renderApplication } from '@angular/platform-server';
import { arenaTreeBlankMessage } from '../TreeModel';
import type { ArenaTreeNode } from '../../../Api.generated';
import { ArenaTreeView } from './ArenaTreeView';

const NODES: ArenaTreeNode[] = [
  { id: 'project', label: 'Project', icon: 'ph-bold ph-folder' },
  { id: 'src', label: 'src', icon: 'ph-bold ph-folder', parent: 'project' },
  { id: 'tokens', label: 'tokens', parent: 'src' },
  { id: 'docs', label: 'docs', parent: 'project' },
];

const PAGE = '<!doctype html><html><head></head><body><tree-server-host></tree-server-host></body></html>';

@Component({
  selector: 'tree-server-host',
  standalone: true,
  imports: [ArenaTreeView],
  template: `<arena-tree-view label="Project files" [nodes]="nodes" [expanded]="{ ids: ['project', 'src'] }" [selection]="{ ids: ['tokens'] }" />`,
})
class OpenTree {
  readonly nodes = NODES;
}

@Component({
  selector: 'tree-server-host',
  standalone: true,
  imports: [ArenaTreeView],
  template: `<arena-tree-view label="Project files" [nodes]="nodes" />`,
})
class ClosedTree {
  readonly nodes = NODES;
}

async function renderOnServer(host: Type<unknown>): Promise<string> {
  const saved = new Map(Object.getOwnPropertyNames(globalThis)
    .map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const));
  const log = console.log;
  console.log = () => {};
  try {
    return await renderApplication(
      (context) => bootstrapApplication(host, { providers: [provideServerRendering()] }, context),
      { document: PAGE, url: '/' },
    );
  } finally {
    console.log = log;
    const global = globalThis as Record<string, unknown>;
    for (const key of Object.getOwnPropertyNames(globalThis)) if (!saved.has(key)) delete global[key];
    for (const [key, descriptor] of saved) {
      if (descriptor?.configurable) Object.defineProperty(globalThis, key, descriptor);
    }
    ɵBrowserDomAdapter.makeCurrent();
    ɵsetDocument(document);
  }
}

const treeTag = (html: string) => html.match(/<arena-tree-view\b[^>]*>/)?.[0] ?? '';
const items = (html: string) => html.match(/<div[^>]*role="treeitem"[^>]*>/g) ?? [];
const facts = (row: string) => ['aria-level', 'aria-setsize', 'aria-posinset', 'aria-expanded']
  .map((name) => row.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? '-').join(' ');

test('the first render on the server draws the visible nodes with their level, set size and position', async () => {
  const html = await renderOnServer(OpenTree);
  assert.match(treeTag(html), /role="tree"/);
  assert.match(treeTag(html), /aria-label="Project files"/);
  const rows = items(html);
  assert.equal(rows.length, 4);
  assert.equal(facts(rows[0]!), '1 1 1 true');
  assert.equal(facts(rows[2]!), '3 1 1 -');
  assert.equal(facts(rows[3]!), '2 2 2 -');
});

test('the first render on the server gives the tab stop to the selected node and to no other', async () => {
  const html = await renderOnServer(OpenTree);
  const stops = items(html).filter((row) => row.includes('tabindex="0"'));
  assert.equal(stops.length, 1);
  assert.match(stops[0]!, /aria-selected="true"/);
});

test('the first render on the server draws only the roots when nothing is open', async () => {
  const html = await renderOnServer(ClosedTree);
  assert.equal(items(html).length, 1);
  assert.doesNotMatch(html, /aria-selected/);
});

@Component({
  selector: 'tree-guarded-host',
  standalone: true,
  imports: [ArenaTreeView],
  template: `<arena-tree-view [label]="label()" [nodes]="nodes()" />`,
})
class Guarded {
  readonly label = signal('Files');
  readonly nodes = signal<ArenaTreeNode[]>(NODES);
}

function draw(label: string, nodes: ArenaTreeNode[]): void {
  const fixture = TestBed.createComponent(Guarded);
  try {
    fixture.componentInstance.label.set(label);
    fixture.componentInstance.nodes.set(nodes);
    fixture.detectChanges();
  } finally {
    fixture.destroy();
  }
}

test('a blank label is refused', () => {
  assert.throws(() => draw('  ', NODES), /ArenaTreeView: `label` is required/);
});

test('a node with a blank id or a blank label is refused, naming the field and the index', () => {
  const blankId = [...NODES, { id: ' ', label: 'Ghost' }];
  assert.throws(() => draw('Files', blankId), { message: arenaTreeBlankMessage('id', 4) });
  const blankLabel = [{ id: 'one', label: '' }];
  assert.throws(() => draw('Files', blankLabel), { message: arenaTreeBlankMessage('label', 0) });
});
