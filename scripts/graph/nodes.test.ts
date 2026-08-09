import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../lib/arena/repo-root.ts';
import { COLLECTED_PHASES, COLLECTION, NEVER_SUBSCRIBES, NOT_YET_SUBSCRIBED, allNodes, collectedScripts, neverSubscribesReason } from './nodes.ts';
import { budgetFor } from '../lib/arena/deadline.ts';

const BUDGET_MS = budgetFor(COLLECTION);

test('the three collected phases are the ones a run steps through', () => {
  assert.deepEqual(COLLECTED_PHASES, ['build', 'generate', 'check'],
    'lib/ and utils/ hold no step, ci/ answers a runner rather than being one, and graph/ is what '
    + 'does the collecting');
});

test('every script the walk finds is under one of those phases, and no suite is', () => {
  const scripts = collectedScripts();
  assert.ok(scripts.length > 50, 'a walk that found almost nothing proves almost nothing');
  for (const rel of scripts) {
    assert.ok(COLLECTED_PHASES.some((phase) => rel.startsWith(`scripts/${phase}/`)), rel);
    assert.equal(rel.endsWith('.test.ts'), false, `${rel} is a suite, and a suite declares nothing`);
  }
});

test('a script named in either list is there, so neither list outlives what it names', () => {
  const scripts = new Set(collectedScripts());
  for (const path of NOT_YET_SUBSCRIBED) {
    assert.ok(scripts.has(path), `NOT_YET_SUBSCRIBED names ${path}, which the walk does not find`);
  }
  for (const spec of NEVER_SUBSCRIBES.keys()) {
    assert.ok(existsSync(join(repoRoot, spec)), `NEVER_SUBSCRIBES names ${spec}, which is not there`);
  }
});

test('a reason for never subscribing is a reason and not a label', () => {
  for (const [spec, reason] of NEVER_SUBSCRIBES) {
    assert.ok(reason.length > 60, `${spec} opts out and the record does not say why`);
  }
});

test('a directory spec covers what is under it, which is how the shipped CLI opts out once', () => {
  assert.ok(neverSubscribesReason('scripts/generate/core/arena-to-prod/icon-css.ts'));
  assert.ok(neverSubscribesReason('scripts/generate/core/arena-to-prod/arena-to-prod.ts'));
  assert.equal(neverSubscribesReason('scripts/generate/arena/generate-tokens.ts'), null);
});

test('the gate that judges the graph is not imported while it is collecting',
  { timeout: BUDGET_MS }, async () => {
  assert.ok(neverSubscribesReason('scripts/check/arena/check-graph.ts'),
    'collecting reaches the gate that is running, whose guard correctly answers that it IS the '
    + 'program, so importing it makes it re-enter itself once per collection');
  const { declaredIn } = await allNodes();
  assert.equal(declaredIn.has('check:graph'), false);
});

test('every collected node carries the four keys the graph reads',
  { timeout: BUDGET_MS }, async () => {
  const { nodes, declaredIn } = await allNodes();
  assert.ok(nodes.length > 0, 'no node collected is a graph that decides nothing');
  for (const node of nodes) {
    assert.equal(typeof node.name, 'string', 'a node with no name joins nothing');
    for (const key of ['reads', 'writes', 'feeds'] as const) {
      assert.ok(Array.isArray(node[key]), `${node.name} declares no ${key}`);
      for (const spec of node[key]) assert.equal(typeof spec, 'string', `${node.name}.${key} holds a non-string`);
    }
    assert.ok(declaredIn.get(node.name), `${node.name} is collected from nowhere`);
  }
});

test('a node is declared once, so two scripts cannot answer to one name',
  { timeout: BUDGET_MS }, async () => {
  const { nodes } = await allNodes();
  const names = nodes.map((node) => node.name);
  assert.deepEqual([...new Set(names)].sort(), [...names].sort());
});
