/* The win32 half is the reason this module exists, and no runner here will ever show it, so
 * every case below injects the platform, the environment, the path module and the probe. What
 * the real filesystem holds is irrelevant to all of them on purpose. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { posix, win32 } from 'node:path';
import { WINDOWS_DEFAULT_PATHEXT, candidateNames, hostBinary } from './host-binary.ts';

const on = (present: string[]) => (path: string) => present.includes(path);

test('a posix name is looked for exactly, in PATH order', () => {
  const found = hostBinary('git', 'to read the tree', {
    env: { PATH: '/usr/local/bin:/usr/bin' },
    on: 'linux',
    path: posix,
    exists: on(['/usr/bin/git', '/usr/local/bin/git']),
  });
  assert.equal(found, '/usr/local/bin/git', 'the first PATH entry wins, as a shell would resolve it');
});

test('a windows name gains the extensions PATHEXT names, because there is no bare git there', () => {
  const found = hostBinary('git', 'to read the tree', {
    env: { PATH: 'C:\\tools;C:\\Program Files\\Git\\cmd', PATHEXT: '.COM;.EXE;.CMD' },
    on: 'win32',
    path: win32,
    exists: on(['C:\\Program Files\\Git\\cmd\\git.exe']),
  });
  assert.equal(found, 'C:\\Program Files\\Git\\cmd\\git.exe',
    'spawning the bare name is a coin toss on Windows: the file is git.exe, and which suffixes '
    + 'count is PATHEXT answer rather than node one');
});

test('a windows PATH is split on semicolons, since a colon is inside every entry', () => {
  const found = hostBinary('node', 'to run the CLI', {
    env: { PATH: 'C:\\a;C:\\b', PATHEXT: '.EXE' },
    on: 'win32',
    path: win32,
    exists: on(['C:\\b\\node.exe']),
  });
  assert.equal(found, 'C:\\b\\node.exe');
});

test('PATHEXT is defaulted rather than assumed present, and a named extension is left alone', () => {
  assert.deepEqual(candidateNames('git', {}, 'win32'),
    WINDOWS_DEFAULT_PATHEXT.split(';').map((ext) => `git${ext.toLowerCase()}`));
  assert.deepEqual(candidateNames('taskkill.exe', {}, 'win32'), ['taskkill.exe'],
    'a name that already carries an extension is the name, not a stem to suffix');
  assert.deepEqual(candidateNames('git', { PATHEXT: '.EXE' }, 'linux'), ['git'],
    'PATHEXT means nothing off Windows, whatever the environment happens to carry');
});

test('a binary that is not there throws, naming it, the reason, and what was looked for', () => {
  assert.throws(
    () => hostBinary('git', 'to read what the tree tracks', {
      env: { PATH: '/usr/bin' }, on: 'linux', path: posix, exists: () => false,
    }),
    (err: Error) => {
      assert.match(err.message, /git/);
      assert.match(err.message, /to read what the tree tracks/,
        'ENOENT from a bare spawn names neither which binary nor why Arena wanted it');
      assert.match(err.message, /1 PATH entry/);
      return true;
    });
});

test('an empty PATH is a throw rather than a silent miss', () => {
  assert.throws(() => hostBinary('git', 'to read the tree',
    { env: {}, on: 'linux', path: posix, exists: () => true }), /not on PATH/);
});
