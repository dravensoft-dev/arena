import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeAtomic } from './write-atomic.ts';

function inDir<T>(use: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), 'write-atomic-'));
  try {
    return use(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('the text lands whole and nothing is left beside it', () => {
  inDir((dir) => {
    const path = join(dir, 'entry.json');
    writeAtomic(path, '{"a":1}\n');
    assert.equal(readFileSync(path, 'utf8'), '{"a":1}\n');
    assert.deepEqual(readdirSync(dir), ['entry.json']);
  });
});

test('a second write replaces the file rather than rewriting it in place, so a reader holds old bytes or new', () => {
  inDir((dir) => {
    const path = join(dir, 'entry.json');
    writeFileSync(path, 'old\n');
    const before = statSync(path).ino;
    writeAtomic(path, 'new\n');
    assert.notEqual(statSync(path).ino, before,
      'the same inode means the bytes are rewritten in place, where a reader beside the writer can meet half of them');
    assert.equal(readFileSync(path, 'utf8'), 'new\n');
    assert.deepEqual(readdirSync(dir), ['entry.json']);
  });
});

test('a rename that fails throws and leaves no temporary file behind', () => {
  inDir((dir) => {
    const path = join(dir, 'entry.json');
    mkdirSync(path);
    writeFileSync(join(path, 'inside'), 'x');
    assert.throws(() => writeAtomic(path, 'new\n'), { syscall: 'rename' });
    assert.deepEqual(readdirSync(dir), ['entry.json']);
  });
});
