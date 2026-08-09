/* Four claims and no more: the walk reaches every depth, its order is the sorted one at each
 * level rather than the filesystem's, `skip` decides a directory and a file alike, and a root
 * that is not there throws rather than answering as an empty tree, which is the half a
 * caller's own existsSync rests on. The fixtures are real directories under tmpdir: a walk
 * mocked over an object literal proves the mock. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { relPosix } from './posix-path.ts';
import { walkFiles } from './walk-files.ts';
import type { WalkOptions } from './walk-files.ts';

function tree(files: string[]) {
  const root = mkdtempSync(join(tmpdir(), 'arena-walk-'));
  for (const rel of files) {
    const path = join(root, ...rel.split('/'));
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, '');
  }
  return root;
}

const found = (root: string, options?: WalkOptions) =>
  walkFiles(root, options).map((p) => relPosix(root, p));

test('every file at every depth comes back, and a directory never does', () => {
  const root = tree(['a.ts', 'one/b.ts', 'one/two/three/c.ts']);
  try {
    assert.deepEqual(found(root), ['a.ts', 'one/b.ts', 'one/two/three/c.ts']);
  } finally { rmSync(root, { recursive: true }); }
});

test('each level is read sorted, so a comparison against the result is not reading hash order', () => {
  const root = tree(['z.ts', 'a.ts', 'm/y.ts', 'm/b.ts']);
  try {
    assert.deepEqual(found(root), ['a.ts', 'm/b.ts', 'm/y.ts', 'z.ts']);
  } finally { rmSync(root, { recursive: true }); }
});

test('skip decides a file and a directory alike, which is one predicate carrying both rules', () => {
  const root = tree(['keep.ts', '.hidden', 'dist/out.js', 'src/keep.ts']);
  try {
    assert.deepEqual(found(root, { skip: (name) => name.startsWith('.') || name === 'dist' }),
      ['keep.ts', 'src/keep.ts'],
      'a dotfile rule reads a name and an exclusion list reads a name, and neither is worth its own option');
  } finally { rmSync(root, { recursive: true }); }
});

test('skip is handed the path too, so one anchored directory is dropped and not every one of that name', () => {
  const root = tree(['build/a.ts', 'nested/build/b.ts']);
  try {
    assert.deepEqual(found(root, { skip: (_name, path) => path === join(root, 'build') }),
      ['nested/build/b.ts'],
      'the emitted tree is anchored: a walk skipping every directory called build would skip a '
      + 'phase directory under scripts/ too');
  } finally { rmSync(root, { recursive: true }); }
});

test('a root that is not there throws and names itself rather than reading as an empty tree', () => {
  assert.throws(() => walkFiles(join(tmpdir(), 'arena-walk-nowhere-at-all')), /ENOENT/,
    'a caller that expects an absent tree says so with its own existsSync, and a caller that does '
    + 'not gets a name instead of a clean-looking pass over nothing');
});

test('a walk with everything skipped is empty, and calling that a failure is the caller\'s job', () => {
  const root = tree(['x/y.ts']);
  try {
    assert.deepEqual(found(root, { skip: (name) => name === 'x' }), []);
  } finally { rmSync(root, { recursive: true }); }
});
