/* The install command names no peer the project already has. A peer named with a range is an
 * explicit install, so a framework package in the command would move the project's own version. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { PEERS, OPTIONAL_PEERS, installPeers, renderInstall } from './support-matrix.ts';

test('every peer of a layer is exactly one of framework, follower or independent', () => {
  for (const layer of Object.keys(PEERS)) {
    const { framework, followers, independent } = installPeers(layer);
    assert.deepEqual([...framework, ...followers, ...independent].sort(), Object.keys(PEERS[layer as keyof typeof PEERS]).sort());
  }
});

test('the framework is react and react-dom, or the core angular packages, and never an optional peer', () => {
  assert.deepEqual(installPeers('react').framework, ['react', 'react-dom']);
  assert.deepEqual(installPeers('angular').framework,
    ['@angular/core', '@angular/common', '@angular/platform-browser']);
  for (const name of Object.keys(OPTIONAL_PEERS.angular)) assert.ok(!installPeers('angular').framework.includes(name));
});

test('the install command names no framework package and writes a follower as a placeholder', () => {
  for (const layer of Object.keys(PEERS)) {
    const text = renderInstall([layer]);
    for (const name of installPeers(layer).framework)
      assert.ok(!text.includes(`'${name}@`), `${name} is the project's own`);
    for (const name of installPeers(layer).followers)
      assert.ok(text.includes(`'${name}@<${layer}-major>'`), `${name} follows the framework's major`);
    for (const name of installPeers(layer).independent) assert.ok(text.includes(`'${name}@^`));
  }
});
