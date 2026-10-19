import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { SUITE_TMP_PREFIX, suiteTmp } from './suite-tmp.ts';

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
