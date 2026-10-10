import test from 'node:test';
import assert from 'node:assert/strict';
import { cyclePath, duplicateWriters, needsOf, selfFeeds, subscriptionProblems, topoOrder, transitiveFeeds, unknownFeeds, upstreamOf } from './graph.ts';

const node = (name: string, over: Partial<{ reads: string[]; writes: string[]; feeds: string[] }> = {}) =>
  ({ name, reads: [], writes: [], feeds: [], ...over });

const flat = (specs: string[]) => specs;

test('the other direction is derived, because only one of the two is declared', () => {
  const nodes = [
    node('generate:tokens', { feeds: ['build:tailwind', 'check:ramp'] }),
    node('build:tailwind', { feeds: ['check:tailwind'] }),
    node('check:ramp'),
    node('check:tailwind'),
  ];
  assert.deepEqual([...needsOf(nodes)], [
    ['generate:tokens', []],
    ['build:tailwind', ['generate:tokens']],
    ['check:ramp', ['generate:tokens']],
    ['check:tailwind', ['build:tailwind']],
  ]);
});

test('an order runs a producer before everything it feeds', () => {
  const nodes = [
    node('check:tailwind'),
    node('build:tailwind', { feeds: ['check:tailwind'] }),
    node('generate:tokens', { feeds: ['build:tailwind'] }),
  ];
  assert.deepEqual(topoOrder(nodes).map((n) => n.name),
    ['generate:tokens', 'build:tailwind', 'check:tailwind']);
});

test('a tie breaks on the position a node was collected at, so the printed sequence is stable', () => {
  const nodes = [node('b'), node('a'), node('c')];
  assert.deepEqual(topoOrder(nodes).map((n) => n.name), ['b', 'a', 'c'],
    'sorting the ready set by name would reorder a chain nobody asked to reorder');
});

test('a cycle is named as the path it goes round, and no order is invented for it', () => {
  const nodes = [
    node('generate:api-types', { feeds: ['check:api'] }),
    node('check:api', { feeds: ['generate:api-types'] }),
  ];
  assert.deepEqual(cyclePath(nodes), ['generate:api-types', 'check:api', 'generate:api-types']);
  assert.throws(() => topoOrder(nodes), /a cycle has no order/);
});

test('a graph with no cycle says so, rather than reporting the first branch it walked', () => {
  assert.equal(cyclePath([node('a', { feeds: ['b'] }), node('b', { feeds: ['c'] }), node('c')]), null);
});

test('a feed naming nothing is caught, and it is not the same failure as a self-feed', () => {
  const nodes = [node('build:tailwind', { feeds: ['check:tailwnd'] }), node('a', { feeds: ['a'] })];
  assert.deepEqual(unknownFeeds(nodes),
    ['build:tailwind lists check:tailwnd in feeds, and no node is called that']);
  assert.deepEqual(selfFeeds(nodes), ['a lists itself in feeds']);
});

test('an artifact with two writers has no upstream, so the pair is named', () => {
  const nodes = [
    node('generate:api-types', { writes: ['frameworks/react/Api.generated.ts'] }),
    node('generate:playgrounds', { writes: ['frameworks/react/Api.generated.ts'] }),
  ];
  assert.deepEqual(duplicateWriters(nodes, flat), [
    'frameworks/react/Api.generated.ts is written by generate:api-types and by generate:playgrounds; '
    + 'an artifact with two writers has no upstream',
  ]);
});

test('a reader of an artifact that the writer does not list is the failure this holds', () => {
  const nodes = [
    node('generate:tokens', { writes: ['palette.generated.css'], feeds: [] }),
    node('check:ramp', { reads: ['palette.generated.css'] }),
  ];
  assert.deepEqual(subscriptionProblems(nodes, flat), [
    'generate:tokens writes palette.generated.css, which check:ramp reads, and generate:tokens does '
    + 'not list check:ramp in feeds -- an unsubscribed reader is a gate that runs against an '
    + 'artifact from the last build',
  ]);
});

test('a subscription carried by an artifact is silent, in both directions', () => {
  const nodes = [
    node('generate:tokens', { writes: ['palette.generated.css'], feeds: ['check:ramp'] }),
    node('check:ramp', { reads: ['palette.generated.css'] }),
  ];
  assert.deepEqual(subscriptionProblems(nodes, flat), []);
});

test('an edge nothing carries is reported too, because a stale one is a claim nobody maintains', () => {
  const nodes = [
    node('build:tailwind', { writes: ['Utilities.generated.css'], feeds: ['check:docs'] }),
    node('check:docs', { reads: ['AGENTS.md'] }),
  ];
  assert.deepEqual(subscriptionProblems(nodes, flat), [
    'build:tailwind lists check:docs in feeds, and nothing check:docs reads is written by '
    + 'build:tailwind -- an edge nothing carries is an edge nobody maintains',
  ]);
});

test('a node writing into what it reads is legal, and does not subscribe itself', () => {
  const nodes = [node('generate:member-docs', {
    reads: ['ArenaButton.tsx'], writes: ['ArenaButton.tsx'], feeds: [],
  })];
  assert.deepEqual(subscriptionProblems(nodes, flat), [],
    'the in-place generators write the descriptions into the components they read, so writes '
    + 'meeting reads is the shape rather than a defect');
});

test('a failure reaches everything downstream of it, however many hops away', () => {
  const nodes = [
    node('generate:tokens', { feeds: ['build:tailwind'] }),
    node('build:tailwind', { feeds: ['build:demos', 'build:angular-demo'] }),
    node('build:demos'),
    node('build:angular-demo'),
    node('build:vendor'),
  ];
  assert.deepEqual([...transitiveFeeds(nodes, 'generate:tokens')].sort(),
    ['build:angular-demo', 'build:demos', 'build:tailwind'],
    'generate:tokens does not feed build:demos directly, so a single hop would let a step compile '
    + 'against tokens that were never written');
  assert.deepEqual([...transitiveFeeds(nodes, 'build:vendor')], [],
    'a step nothing depends on stops nothing, which is the half that makes the run worth continuing');
});

test('a cycle does not hang the walk downstream', () => {
  const nodes = [node('a', { feeds: ['b'] }), node('b', { feeds: ['a'] })];
  assert.deepEqual([...transitiveFeeds(nodes, 'a')].sort(), ['a', 'b']);
});

test('upstream is the other direction of transitiveFeeds: every step a target reads from, transitively', () => {
  const nodes = [
    node('generate:tokens', { feeds: ['build:tailwind', 'check:ramp'] }),
    node('build:tailwind', { feeds: ['build:demos'] }),
    node('build:vendor', { feeds: ['build:demos'] }),
    node('build:demos'),
    node('build:intro'),
    node('check:ramp'),
  ];
  assert.deepEqual([...upstreamOf(nodes, 'build:demos')].sort(), ['build:tailwind', 'build:vendor', 'generate:tokens']);
  assert.deepEqual([...upstreamOf(nodes, 'generate:tokens')], [],
    'a step nothing feeds reads from nothing the graph declares');
  assert.deepEqual([...upstreamOf(nodes, 'build:intro')], []);
});

test('a name the graph does not hold has no upstream', () => {
  assert.deepEqual([...upstreamOf([node('a', { feeds: ['b'] }), node('b')], 'c')], []);
});

test('a cycle upstream is walked once and ends', () => {
  const nodes = [node('a', { feeds: ['b'] }), node('b', { feeds: ['a'] })];
  assert.deepEqual([...upstreamOf(nodes, 'a')].sort(), ['a', 'b']);
});
