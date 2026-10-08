/* arena clean: it deletes the sheets arena build writes, by name, inside --out, and nothing else. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from './command-clean.ts';
import { OUTPUT_SHEETS } from './sources.ts';
import { captureIo } from './cli-fixtures.ts';

const root = () => mkdtempSync(join(tmpdir(), 'arena-clean-'));

test('removes exactly the three output sheets in --out and leaves a sibling file', () => {
  const dir = root();
  for (const name of OUTPUT_SHEETS) writeFileSync(join(dir, name), 'x');
  writeFileSync(join(dir, 'keep.css'), 'x');
  const { io, out, err } = captureIo(dir);
  assert.equal(run(['--out', '.'], io), 0);
  assert.deepEqual(readdirSync(dir), ['keep.css']);
  assert.deepEqual(err, []);
  assert.equal(out.length, OUTPUT_SHEETS.size);
  for (const name of OUTPUT_SHEETS) assert.ok(out.includes(`arena clean: removed ${join(dir, name)}`));
});

test('an empty or absent out prints "nothing to remove" and exits 0', () => {
  const dir = root();
  const { io, out } = captureIo(dir);
  assert.equal(run(['-o', '.'], io), 0);
  assert.deepEqual(out, [`arena clean: nothing to remove in ${dir}`]);
  const missing = join(dir, 'absent');
  const again = captureIo(dir);
  assert.equal(run(['-o', missing], again.io), 0);
  assert.deepEqual(again.out, [`arena clean: nothing to remove in ${missing}`]);
  assert.equal(existsSync(missing), false);
});

test('--config exits 2 with the neighbour message', () => {
  const { io, out, err } = captureIo(root());
  assert.equal(run(['--config', 'a.json'], io), 2);
  assert.deepEqual(out, []);
  assert.match(err[0]!, /^arena clean: --config is not a flag of arena clean; arena clean reads no config/);
});

test('a sheet it cannot delete exits 2 naming it, after removing the ones it can', () => {
  const dir = root();
  const [blocked, ...rest] = [...OUTPUT_SHEETS];
  mkdirSync(join(dir, blocked!));
  for (const name of rest) writeFileSync(join(dir, name), 'x');
  const { io, out, err } = captureIo(dir);
  assert.equal(run(['-o', '.'], io), 2);
  assert.deepEqual(readdirSync(dir), [blocked]);
  assert.equal(err.length, 1);
  assert.ok(err[0]!.startsWith(`arena clean: cannot delete ${join(dir, blocked!)}: `), err.join('\n'));
  for (const name of rest) assert.ok(out.includes(`arena clean: removed ${join(dir, name)}`));
});
