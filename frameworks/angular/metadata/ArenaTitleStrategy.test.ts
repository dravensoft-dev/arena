/* The strategy is one hook the router calls on every successful navigation, so what is worth
 * asserting is the walk it does inside it: down the PRIMARY chain, merging what each level
 * declared, so a layout route can set a default its children override. The snapshots here are
 * hand-built rather than navigated, because a real navigation would prove the router calls
 * updateTitle, which is Angular's claim and not this layer's. */

import { useTestEnvironment } from '../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { PRIMARY_OUTLET } from '@angular/router';
import type { ActivatedRouteSnapshot } from '@angular/router';
import { arenaRouteMetadataOf } from './ArenaTitleStrategy';
import { arenaRouteMeta, ARENA_ROUTE_KEY } from './ArenaRouteMetadata';
import type { ArenaRouteMetadata } from './ArenaRouteMetadata';

function chain(...levels: (ArenaRouteMetadata | null)[]): ActivatedRouteSnapshot {
  const nodes = levels.map((meta) => ({
    data: meta === null ? {} : arenaRouteMeta(meta),
    outlet: PRIMARY_OUTLET,
    children: [] as unknown[],
  }));
  nodes.forEach((node, at) => { if (nodes[at + 1]) node.children = [nodes[at + 1]]; });
  return nodes[0] as unknown as ActivatedRouteSnapshot;
}

test('the helper puts everything under one key of the data a consumer owns', () => {
  const data = arenaRouteMeta({ description: 'Every order.', robots: 'index' });
  assert.deepEqual(Object.keys(data), [ARENA_ROUTE_KEY],
    'a flat key is a name claimed in a namespace that is the consumer\'s, and a route already '
    + 'using data.description for its own would collide in silence');
});

test('a deeper route wins the key, and keeps what it did not name', () => {
  const merged = arenaRouteMetadataOf(chain(
    { robots: 'index,follow', image: '/social.png' },
    { description: 'Every order in the system.' },
  ));
  assert.deepEqual(merged, {
    robots: 'index,follow', image: '/social.png', description: 'Every order in the system.',
  }, 'a layout route sets what a section shares and a leaf says what is its own');

  const overridden = arenaRouteMetadataOf(chain({ robots: 'index,follow' }, { robots: 'noindex' }));
  assert.equal(overridden.robots, 'noindex', 'the innermost route is the one that decides');
});

test('a chain that declares nothing yields nothing, so the defaults decide', () => {
  assert.deepEqual(arenaRouteMetadataOf(chain(null, null)), {});
});

test('a named outlet is not on the walk, because it is not the page', () => {
  const root = chain({ robots: 'index' });
  const aside = { data: arenaRouteMeta({ robots: 'noindex' }), outlet: 'aside', children: [] };
  (root as unknown as { children: unknown[] }).children = [aside];

  assert.equal(arenaRouteMetadataOf(root).robots, 'index',
    'a panel in a second outlet cannot decide whether the page is indexed');
});
