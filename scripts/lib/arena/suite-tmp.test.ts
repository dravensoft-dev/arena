import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { SUITE_TMP_PREFIX, leftoverFails, leftoverLine, suiteTmp } from './suite-tmp.ts';

test('the root is made under the base it is given, and every temp variable points at it', () => {
  const base = mkdtempSync(join(tmpdir(), 'arena-suite-tmp-base-'));
  try {
    const one = suiteTmp(base, { KEEP: 'yes', TMPDIR: '/elsewhere' });
    const two = suiteTmp(base, {});
    assert.equal(dirname(one.root), base);
    assert.ok(basename(one.root).startsWith(SUITE_TMP_PREFIX));
    assert.notEqual(one.root, two.root, 'two steps share one root');
    assert.deepEqual([one.env.TMPDIR, one.env.TEMP, one.env.TMP], [one.root, one.root, one.root]);
    assert.equal(one.env.KEEP, 'yes', 'the rest of the environment is inherited');
    one.remove();
    two.remove();
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('the remover deletes the root with what a step left inside it, and a second call is quiet', () => {
  const base = mkdtempSync(join(tmpdir(), 'arena-suite-tmp-base-'));
  try {
    const scratch = suiteTmp(base, {});
    writeFileSync(join(scratch.root, 'left'), 'x');
    scratch.remove();
    assert.equal(existsSync(scratch.root), false);
    assert.doesNotThrow(() => scratch.remove());
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('an empty root reads empty, and a root holding a file and a directory reads both names, sorted', () => {
  const base = mkdtempSync(join(tmpdir(), 'arena-suite-tmp-base-'));
  try {
    const scratch = suiteTmp(base, {});
    assert.deepEqual(scratch.left(), []);
    mkdirSync(join(scratch.root, 'b-dir'));
    writeFileSync(join(scratch.root, 'a-file'), 'x');
    assert.deepEqual(scratch.left(), ['a-file', 'b-dir']);
    scratch.remove();
    assert.deepEqual(scratch.left(), [], 'a removed root reads empty');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('the leftover line names the step and the count, and shows twenty names before it counts the rest', () => {
  const names = Array.from({ length: 23 }, (_, i) => `entry-${String(i).padStart(2, '0')}`);
  assert.equal(leftoverLine('test (x)', ['one']), 'test (x) left 1 entry in its temp root: one');
  const line = leftoverLine('test (x)', names);
  assert.ok(line.startsWith('test (x) left 23 entries in its temp root: entry-00, '), line);
  assert.ok(line.includes('entry-19') && !line.includes('entry-20'), line);
  assert.ok(line.endsWith(', and 3 more'), line);
});

test('a leftover fails the step on linux and only warns on win32 and darwin', () => {
  assert.equal(leftoverFails('linux'), true);
  assert.equal(leftoverFails('win32'), false);
  assert.equal(leftoverFails('darwin'), false);
});
