// The Io a command speaks through: its voice prefix and the way it roots a path.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { voice, under } from './io.ts';
import { captureIo } from './cli-fixtures.ts';

test('voice prefixes every line with the command name', () => {
  const { io, out, err } = captureIo('/tmp/nowhere');
  const say = voice(io, 'build');
  say.out('wrote a');
  say.err('broke b');
  assert.deepEqual(out, ['arena build: wrote a']);
  assert.deepEqual(err, ['arena build: broke b']);
});

test("under keeps an absolute path and joins a relative one, and '.' keeps it relative", () => {
  const root = join('/tmp', 'arena-root');
  assert.equal(under(root, join(root, 'src')), join(root, 'src'));
  assert.equal(under(root, 'src'), join(root, 'src'));
  assert.equal(under('.', 'src'), 'src');
});
