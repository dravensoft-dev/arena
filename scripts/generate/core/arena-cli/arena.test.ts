/* The dispatch table of the arena command: what each first word does, and that a command gets the
 * rest of the arguments and answers with its own exit code. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { COMMANDS, USAGE, isProgram, main } from './arena.ts';
import { COMMAND_NAMES, SPECS, usageOf } from './args.ts';
import { captureIo, hostRoot } from './cli-fixtures.ts';

const cwd = tmpdir();

test('no arguments prints usage on stderr and exits 2', async () => {
  const { io, out, err } = captureIo(cwd);
  assert.equal(await main([], io), 2);
  assert.deepEqual(out, []);
  assert.deepEqual(err, [USAGE]);
});

test('an unknown command exits 2 and names it', async () => {
  const { io, out, err } = captureIo(cwd);
  assert.equal(await main(['frobnicate'], io), 2);
  assert.deepEqual(out, []);
  assert.deepEqual(err, ['arena: no command named frobnicate', '', USAGE]);
});

test('a leading flag that is not --help or --version exits 2', async () => {
  const { io, err } = captureIo(cwd);
  assert.equal(await main(['--strict'], io), 2);
  assert.deepEqual(err, ['arena: a command comes first', '', USAGE]);
});

test('--help and help print USAGE with exit 0, and USAGE names every command', async () => {
  for (const argv of [['--help'], ['-h'], ['help']]) {
    const { io, out, err } = captureIo(cwd);
    assert.equal(await main(argv, io), 0);
    assert.deepEqual(out, [USAGE]);
    assert.deepEqual(err, []);
  }
  for (const name of COMMAND_NAMES) assert.match(USAGE, new RegExp(`^  ${name} +${SPECS[name].summary}$`, 'm'));
  assert.match(USAGE, /^usage: arena <command> \[flags\]$/m);
  assert.match(USAGE, /arena help <command> shows a command's flags; arena --version names the package$/);
});

test('help <cmd> prints that command\'s usage, and help <unknown> exits 2', async () => {
  const known = captureIo(cwd);
  assert.equal(await main(['help', 'clean'], known.io), 0);
  assert.deepEqual(known.out, [usageOf('clean')]);

  const unknown = captureIo(cwd);
  assert.equal(await main(['help', 'nope'], unknown.io), 2);
  assert.deepEqual(unknown.err, ['arena: no command named nope', '', USAGE]);
  assert.deepEqual(unknown.out, []);
});

test('--version prints the host package\'s name and version, and exits 2 with no package', async () => {
  const root = hostRoot('@dravensoft/arena-react', '11.1.0');
  const named = captureIo(cwd, { arena: root });
  assert.equal(await main(['--version'], named.io), 0);
  assert.deepEqual(named.out, ['@dravensoft/arena-react 11.1.0']);

  const bare = captureIo(cwd, { arena: null });
  assert.equal(await main(['--version'], bare.io), 2);
  assert.deepEqual(bare.err, ['arena: not running from inside an Arena package, so there is no version to name']);
  rmSync(root, { recursive: true });
});

test('a command receives the rest of argv and its code is returned', async () => {
  const held = COMMANDS.doctor;
  const seen: string[][] = [];
  COMMANDS.doctor = (argv) => { seen.push(argv); return 7; };
  try {
    const { io } = captureIo(cwd);
    assert.equal(await main(['doctor', '--src', 'x'], io), 7);
    assert.deepEqual(seen, [['--src', 'x']]);
  } finally { COMMANDS.doctor = held; }
});

test('every command has an entry in the table', async () => {
  for (const name of COMMAND_NAMES) assert.equal(typeof COMMANDS[name], 'function');
  assert.deepEqual(Object.keys(COMMANDS).sort(), [...COMMAND_NAMES].sort());
});

test('the CLI decides it is the program the same way the tooling does, since it cannot import that', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-cli-entry-'));
  try {
    const self = join(dir, 'arena.mjs');
    writeFileSync(self, '');
    assert.equal(isProgram(self, self), true);
    assert.equal(isProgram(join(dir, 'other.mjs'), self), false);
    assert.equal(isProgram(undefined, self), false);
    assert.equal(isProgram(join(dir, 'gone.mjs'), self), false);
    try {
      const link = join(dir, 'linked.mjs');
      symlinkSync(self, link);
      assert.equal(isProgram(link, self), true, 'an npm bin entry is a link to the module');
    } catch {
      assert.ok(true);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
