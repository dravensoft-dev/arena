import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, utimesSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { digestOf, stampAll, stampOf, universe, SKIPPED_DIRECTORIES } from './inputs.ts';

const withTree = (build: (dir: string) => void, run: (dir: string) => void) => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-inputs-'));
  try {
    build(dir);
    run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test('a file whose stat has not moved is taken from the record, and never read again', () => {
  withTree((dir) => writeFileSync(join(dir, 'a.txt'), 'one'), (dir) => {
    const path = join(dir, 'a.txt');
    const first = stampOf(path);

    writeFileSync(path, 'two');
    const when = first.mtimeMs / 1000;
    utimesSync(path, when, when);

    const kept = statSync(path);
    assert.equal(kept.size, first.size, 'the fixture holds the size as well as the time');
    const record = { ...first, mtimeMs: kept.mtimeMs };
    assert.equal(stampOf(path, record), record,
      'the stat is the filter and it is trusted when it agrees, which is the whole saving. This '
      + 'fixture IS the blind spot, written on purpose: a rewrite that restores both the size and '
      + 'the mtime is read as the file it was, and --force is what answers it. The record takes '
      + 'the mtime the filesystem kept rather than the one handed to utimes, because a double of '
      + 'seconds does not round-trip to the same millisecond on every filesystem, and what is '
      + 'under test is the agreement rather than that arithmetic');
  });
});

test('a mtime that moved over identical content costs one read and invalidates nothing', () => {
  withTree((dir) => writeFileSync(join(dir, 'a.txt'), 'one'), (dir) => {
    const path = join(dir, 'a.txt');
    const first = stampOf(path);
    const when = statSync(path).mtimeMs / 1000 + 5;
    utimesSync(path, when, when);

    const second = stampOf(path, first);
    assert.notEqual(second.mtimeMs, first.mtimeMs, 'the stat moved, so the file was read');
    assert.equal(second.hash, first.hash,
      'a checkout of a branch and back rewrites every mtime, and the hash is what keeps that from '
      + 'invalidating a tree whose content never moved');
  });
});

test('a changed byte changes the hash, which is the only thing that invalidates', () => {
  withTree((dir) => writeFileSync(join(dir, 'a.txt'), 'one'), (dir) => {
    const path = join(dir, 'a.txt');
    const first = stampOf(path);
    const when = statSync(path).mtimeMs / 1000 + 5;
    writeFileSync(path, 'two');
    utimesSync(path, when, when);
    assert.notEqual(stampOf(path, first).hash, first.hash);
  });
});

test('the walk skips the trees that would cost more than the work the graph saves', () => {
  withTree((dir) => {
    writeFileSync(join(dir, 'a.txt'), 'a');
    for (const skipped of SKIPPED_DIRECTORIES) {
      mkdirSync(join(dir, skipped));
      writeFileSync(join(dir, skipped, 'b.txt'), 'b');
    }
    mkdirSync(join(dir, 'nested'));
    writeFileSync(join(dir, 'nested', 'c.txt'), 'c');
  }, (dir) => {
    assert.deepEqual(universe(dir), ['a.txt', 'nested/c.txt']);
  });
});

test('a digest is over the list, so a file appearing or leaving moves it with no content change', () => {
  withTree((dir) => {
    writeFileSync(join(dir, 'a.txt'), 'a');
    writeFileSync(join(dir, 'b.txt'), 'b');
  }, (dir) => {
    const paths = universe(dir);
    const before = digestOf(paths, stampAll(dir, paths));

    writeFileSync(join(dir, 'c.txt'), 'c');
    const after = universe(dir);
    assert.notEqual(digestOf(after, stampAll(dir, after)), before,
      'a gate walking a directory is sensitive to a file appearing and not only to one changing, '
      + 'and hashing the list rather than the contents is what carries that with no rule of its own');

    rmSync(join(dir, 'c.txt'));
    rmSync(join(dir, 'b.txt'));
    const fewer = universe(dir);
    assert.notEqual(digestOf(fewer, stampAll(dir, fewer)), before);
  });
});

test('a path that vanished between the walk and the stat leaves the universe rather than throwing', () => {
  withTree((dir) => writeFileSync(join(dir, 'a.txt'), 'a'), (dir) => {
    const stamps = stampAll(dir, ['a.txt', 'gone.txt']);
    assert.deepEqual([...stamps.keys()], ['a.txt']);
    assert.equal(digestOf(['a.txt', 'gone.txt'], stamps).length, 64,
      'a path with no stamp still occupies a row, so a file that leaves changes the digest');
  });
});
