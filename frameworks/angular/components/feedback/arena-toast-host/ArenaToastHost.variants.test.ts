import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaToastHostStyles } from './ArenaToastHost.variants';

test('the toast host recipe takes no variant, because the corner is a family an adopter writes as a class', () => {
  const root = arenaToastHostStyles().root().split(/\s+/).filter(Boolean);
  assert.ok(root.includes('arena-toast-host__root'), 'the root is the slot class');
  assert.equal(JSON.stringify(arenaToastHostStyles().$data.root()), JSON.stringify(arenaToastHostStyles().$data.root()));
});
