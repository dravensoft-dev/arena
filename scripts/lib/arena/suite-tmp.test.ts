import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { SUITE_TMP_PREFIX, leftoverLine, suiteTmp } from './suite-tmp.ts';

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

test('an empty root reads empty, and a root holding files and a directory reads each described, sorted by name', () => {
  const base = mkdtempSync(join(tmpdir(), 'arena-suite-tmp-base-'));
  try {
    const scratch = suiteTmp(base, {});
    assert.deepEqual(scratch.left(), []);
    mkdirSync(join(scratch.root, 'c-dir'));
    writeFileSync(join(scratch.root, 'a-file'), 'x\n"y"');
    writeFileSync(join(scratch.root, 'b-empty.tmp'), '');
    const [file, empty, dir] = scratch.left();
    assert.match(file ?? '', /^a-file \(file, 5 B, mtime \d{4}-\d\d-\d\dT[\d:.]+Z, starts "x\\n\\"y\\""\)$/);
    assert.match(empty ?? '', /^b-empty\.tmp \(file, 0 B, mtime \d{4}-\d\d-\d\dT[\d:.]+Z, empty\)$/,
      'what a leftover was is what it takes to find who wrote it, and an empty one is a different trail');
    assert.equal(dir, 'c-dir (directory)');
    assert.equal(scratch.left().length, 3);
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
