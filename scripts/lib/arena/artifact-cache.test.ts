/* Every case here is about the entry NOT being trusted. A hit has to be the value a miss would
 * have produced, so the digest covers each input's bytes and a rewrite of the same size and the
 * same mtime still invalidates -- which is the blind spot the graph's stat filter accepts and this
 * one may not. A version, a platform or an arch that disagrees is discarded rather than read, an
 * unparseable entry is a miss rather than a crash, and an answer the builder refused is not
 * written, so a verdict from a broken install re-runs instead of becoming permanent. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, statSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { VERSION, CACHE_DIR, cached, cachedReading, cachedReadingAsync, digestOf, entryPath, purge, read, write } from './artifact-cache.ts';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'arena-artifact-'));
  writeFileSync(join(root, 'a.txt'), 'first');
  writeFileSync(join(root, 'b.txt'), 'second');
  return root;
}

test('a cold call builds and a warm call does not, and both hand back the same answer', () => {
  const root = fixture();
  let built = 0;
  const run = () => cached('demo', ['a.txt', 'b.txt'], () => { built += 1; return { at: 'answer' }; }, root);

  assert.deepEqual(run(), { at: 'answer' });
  assert.deepEqual(run(), { at: 'answer' });
  assert.equal(built, 1);
  rmSync(root, { recursive: true, force: true });
});

test('a byte that moved invalidates, even rewritten to the same size and the same mtime', () => {
  const root = fixture();
  let built = 0;
  const run = () => cached('demo', ['a.txt'], () => { built += 1; return readFileSync(join(root, 'a.txt'), 'utf8'); }, root);

  assert.equal(run(), 'first');
  const pinned = new Date(0);
  utimesSync(join(root, 'a.txt'), pinned, pinned);
  assert.equal(run(), 'first');
  assert.equal(built, 1, 'a touch moves no byte, so it invalidates nothing');

  writeFileSync(join(root, 'a.txt'), 'FIRST');
  utimesSync(join(root, 'a.txt'), pinned, pinned);
  assert.equal(run(), 'FIRST', 'same size, same mtime: anything filtering on the stat hands back the old answer');
  assert.equal(built, 2);
  rmSync(root, { recursive: true, force: true });
});

test('an input that appears or goes moves the digest, so a list is not only its contents', () => {
  const root = fixture();
  const before = digestOf(['a.txt'], root);
  const after = digestOf(['a.txt', 'b.txt'], root);
  assert.notEqual(before.digest, after.digest);
  assert.equal(before.count, 1);
  assert.equal(after.count, 2);

  rmSync(join(root, 'b.txt'));
  assert.notEqual(digestOf(['a.txt', 'b.txt'], root).digest, after.digest,
    'a path with no file still occupies its row, which is what makes a deletion visible');
  rmSync(root, { recursive: true, force: true });
});

test('a version, a platform or an arch that disagrees is discarded rather than read', () => {
  const root = fixture();
  write('demo', ['a.txt'], 'held', root);
  assert.equal(read<string>('demo', root)?.value, 'held');

  const path = entryPath('demo', root);
  const held = JSON.parse(readFileSync(path, 'utf8'));
  writeFileSync(path, JSON.stringify({ ...held, version: VERSION + 1 }));
  assert.equal(read('demo', root), null);

  writeFileSync(path, JSON.stringify({ ...held, arch: 'a-machine-this-is-not' }));
  assert.equal(read('demo', root), null);
  rmSync(root, { recursive: true, force: true });
});

test('an entry that will not parse, or carries a shape this does not write, is a miss rather than a crash', () => {
  const root = fixture();
  mkdirSync(join(root, CACHE_DIR), { recursive: true });
  writeFileSync(entryPath('demo', root), '{ this is not json');

  assert.equal(read('demo', root), null);
  assert.equal(cached('demo', ['a.txt'], () => 'rebuilt', root), 'rebuilt');

  write('demo', ['a.txt'], 'a value from nowhere', root);
  assert.equal(cached('demo', ['a.txt'], () => 'rebuilt again', root), 'rebuilt again',
    'a hand-edited entry has no reach to fold in, and reading one off it would throw inside a gate');
  rmSync(root, { recursive: true, force: true });
});

test('an answer the builder refuses to keep is still returned, and still re-runs next time', () => {
  const root = fixture();
  let built = 0;
  const refuse = () => cachedReading('demo', ['a.txt'], () => {
    built += 1;
    return { value: { status: 1 }, read: ['b.txt'], keep: false };
  }, root);

  assert.deepEqual(refuse(), { status: 1 });
  assert.deepEqual(refuse(), { status: 1 });
  assert.equal(built, 2, 'a red verdict out of a broken install would otherwise be cached for ever');
  rmSync(root, { recursive: true, force: true });
});

test('cachedReading covers what the build turned out to read, not only what it was offered', () => {
  const root = fixture();
  let built = 0;
  const run = () => cachedReading('reach', ['a.txt'], () => {
    built += 1;
    return { value: { verdict: 'ok' }, read: ['b.txt'], keep: true };
  }, root);

  assert.deepEqual(run(), { verdict: 'ok' });
  assert.equal(built, 1);

  writeFileSync(join(root, 'b.txt'), 'moved');
  run();
  assert.equal(built, 2, 'b.txt was never a candidate, and the entry has to carry it or it goes stale unnoticed');
  rmSync(root, { recursive: true, force: true });
});

test('the async reading holds the same entry the sync one does: what it read, kept only when asked', async () => {
  const root = fixture();
  let built = 0;
  const run = (keep: boolean) => cachedReadingAsync('reach', ['a.txt'], async () => {
    built += 1;
    return { value: { verdict: keep ? 'ok' : 'red' }, read: ['b.txt'], keep };
  }, root);

  assert.deepEqual(await run(false), { verdict: 'red' });
  assert.deepEqual(await run(false), { verdict: 'red' });
  assert.equal(built, 2, 'an answer the builder refuses to keep re-runs');
  assert.deepEqual(await run(true), { verdict: 'ok' });
  assert.deepEqual(await run(true), { verdict: 'ok' });
  assert.equal(built, 3, 'a kept answer is held');
  assert.deepEqual(cachedReading('reach', ['a.txt'], () => { built += 1; return { value: { verdict: 'sync' }, read: [], keep: true }; }, root),
    { verdict: 'ok' }, 'the sync reading answers from the entry the async one wrote');
  writeFileSync(join(root, 'b.txt'), 'moved');
  await run(true);
  assert.equal(built, 4, 'what the build read is covered, not only the candidates');
  rmSync(root, { recursive: true, force: true });
});

test('purge empties the directory and reports what it held, which is what --force is for', () => {
  const root = fixture();
  write('one', ['a.txt'], 1, root);
  write('two', ['b.txt'], 2, root);

  assert.equal(purge(root), 2);
  assert.equal(read('one', root), null);
  assert.equal(purge(root), 0, 'purging a directory that is not there is 0 rather than a throw');
  rmSync(root, { recursive: true, force: true });
});

test('an entry is replaced through a rename, so two gates keeping one entry leave it whole', () => {
  const root = mkdtempSync(join(tmpdir(), 'artifact-cache-rename-'));
  try {
    write('tailwind-0123456789ab', [], { value: 1 }, root);
    const path = entryPath('tailwind-0123456789ab', root);
    const before = statSync(path).ino;
    write('tailwind-0123456789ab', [], { value: 1 }, root);
    assert.notEqual(statSync(path).ino, before);
    assert.deepEqual(readdirSync(join(root, CACHE_DIR)), ['tailwind-0123456789ab.json']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
