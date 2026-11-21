import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scratchTree } from './scratch-tree.ts';

const scratch = scratchTree('scratch-tree-test');

test('files land under a root in the temp directory, nested directories are made, and clean removes the root', () => {
  const root = scratch.tree({ 'a.txt': 'one', 'deep/er/b.txt': 'two' });
  assert.ok(root.startsWith(join(tmpdir(), 'scratch-tree-test-')), root);
  assert.equal(readFileSync(join(root, 'a.txt'), 'utf8'), 'one');
  assert.equal(readFileSync(join(root, 'deep/er/b.txt'), 'utf8'), 'two');
  const other = scratch.tree({});
  assert.notEqual(other, root, 'each call is its own root');
  scratch.clean();
  assert.equal(existsSync(root), false);
  assert.equal(existsSync(other), false);
});
