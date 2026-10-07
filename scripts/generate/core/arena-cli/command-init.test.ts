/* arena init: the config it copies, the scripts it wires, and what it leaves alone. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from './command-init.ts';
import { captureIo, hostRoot } from './cli-fixtures.ts';

const REACT = '@dravensoft/arena-react';
const ANGULAR = '@dravensoft/arena-angular';
const EXAMPLE = '{\n  "palettes": [],\n  "x": 1\n}\n';

function setup(name = REACT, pkg: string | null = '{}\n') {
  const arena = hostRoot(name, '1.0.0', { 'arena.config.example.json': EXAMPLE });
  const cwd = mkdtempSync(join(tmpdir(), 'arena-init-'));
  if (pkg !== null) writeFileSync(join(cwd, 'package.json'), pkg);
  const captured = captureIo(cwd, { arena });
  return { arena, cwd, ...captured };
}

const scriptsOf = (cwd: string) => JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')).scripts;

test('React: an empty {} package.json gains prebuild, predev, arena:check and arena:audit with the exact texts', () => {
  const { cwd, io, out } = setup();
  assert.equal(run([], io), 0);
  assert.deepEqual(scriptsOf(cwd), {
    prebuild: 'arena build',
    predev: 'arena build',
    'arena:check': 'arena check --strict=components,glyph,markers',
    'arena:audit': 'arena audit --strict',
  });
  assert.ok(out.includes('arena init: added prebuild, predev, arena:check, arena:audit to package.json'));
});

test('Angular: prebuild and prestart', () => {
  const { cwd, io } = setup(ANGULAR);
  assert.equal(run([], io), 0);
  assert.deepEqual(Object.keys(scriptsOf(cwd)), ['prebuild', 'prestart', 'arena:check', 'arena:audit']);
  assert.equal(scriptsOf(cwd).prestart, 'arena build');
});

test('the config is a byte copy of the package\'s example', () => {
  const { cwd, io, out } = setup();
  run([], io);
  assert.equal(readFileSync(join(cwd, 'arena.config.json'), 'utf8'), EXAMPLE);
  assert.ok(out.includes(`arena init: wrote ${join(cwd, 'arena.config.json')}, a copy of the example this package carries`));
});

test('an existing config is never overwritten', () => {
  const { cwd, io, out } = setup();
  writeFileSync(join(cwd, 'arena.config.json'), 'mine');
  run([], io);
  assert.equal(readFileSync(join(cwd, 'arena.config.json'), 'utf8'), 'mine');
  assert.ok(!out.some((line) => line.includes('wrote')));
});

test('an existing identical script is not rewritten', () => {
  const pkg = JSON.stringify({ scripts: { prebuild: 'arena build' } }, null, 2) + '\n';
  const { cwd, io } = setup(REACT, pkg);
  run([], io);
  assert.deepEqual(Object.keys(scriptsOf(cwd)), ['prebuild', 'predev', 'arena:check', 'arena:audit']);
  const again = setup(REACT, JSON.stringify({ scripts: { prebuild: 'arena build', predev: 'arena build',
    'arena:check': 'arena check --strict=components,glyph,markers', 'arena:audit': 'arena audit --strict' } }));
  writeFileSync(join(again.cwd, 'arena.config.json'), 'x');
  const before = readFileSync(join(again.cwd, 'package.json'), 'utf8');
  run([], again.io);
  assert.equal(readFileSync(join(again.cwd, 'package.json'), 'utf8'), before);
});

test('a foreign prebuild is kept and the "make it" line names the text to add', () => {
  const { cwd, io, out } = setup(REACT, JSON.stringify({ scripts: { prebuild: 'tsc -b' } }));
  assert.equal(run([], io), 0);
  assert.equal(scriptsOf(cwd).prebuild, 'tsc -b');
  assert.ok(out.includes('arena init: package.json already runs "tsc -b" as prebuild, so init left it; make it "arena build && tsc -b"'));
  assert.equal(scriptsOf(cwd).predev, 'arena build');
});

test('a prebuild already running arena build counts as wired', () => {
  const { cwd, io, out } = setup(REACT, JSON.stringify({ scripts: { prebuild: 'arena build && tsc -b' } }));
  run([], io);
  assert.equal(scriptsOf(cwd).prebuild, 'arena build && tsc -b');
  assert.ok(!out.some((line) => line.includes('so init left it')));
});

test('a second run prints "nothing to do" and leaves package.json byte-identical', () => {
  const { cwd, io, out } = setup();
  run([], io);
  const before = readFileSync(join(cwd, 'package.json'), 'utf8');
  out.length = 0;
  assert.equal(run([], io), 0);
  assert.equal(readFileSync(join(cwd, 'package.json'), 'utf8'), before);
  assert.deepEqual(out, ['arena init: nothing to do']);
});

test('a kept arena:check is reported', () => {
  const { cwd, io, out } = setup(REACT, JSON.stringify({ scripts: { 'arena:check': 'arena check' } }));
  run([], io);
  assert.equal(scriptsOf(cwd)['arena:check'], 'arena check');
  assert.ok(out.includes('arena init: kept arena:check, which reads "arena check"'));
});

test('the original indent and trailing newline are kept', () => {
  const { cwd, io } = setup(REACT, '{\n\t"name": "app"\n}\n');
  run([], io);
  const text = readFileSync(join(cwd, 'package.json'), 'utf8');
  assert.match(text, /^\{\n\t"name": "app",\n\t"scripts": \{\n\t\t"prebuild"/);
  assert.ok(text.endsWith('}\n'));
  const bare = setup(REACT, '{"name":"app"}');
  run([], bare.io);
  assert.ok(readFileSync(join(bare.cwd, 'package.json'), 'utf8').endsWith('}'));
  assert.match(readFileSync(join(bare.cwd, 'package.json'), 'utf8'), /\n  "scripts"/);
});

test('a non-default --config is appended to every script it writes', () => {
  const { cwd, io } = setup();
  assert.equal(run(['--config', 'config/arena.json'], io), 0);
  assert.deepEqual(scriptsOf(cwd), {
    prebuild: 'arena build --config config/arena.json',
    predev: 'arena build --config config/arena.json',
    'arena:check': 'arena check --strict=components,glyph,markers --config config/arena.json',
    'arena:audit': 'arena audit --strict --config config/arena.json',
  });
  assert.equal(readFileSync(join(cwd, 'config', 'arena.json'), 'utf8'), EXAMPLE);
});

test('no package exits 2', () => {
  const { cwd } = setup();
  const { io, err } = captureIo(cwd, { arena: null });
  assert.equal(run([], io), 2);
  assert.deepEqual(err, ['arena init: arena init copies the example config an Arena package carries, and no Arena package is around this command']);
});

test('an unknown package exits 2 naming it', () => {
  const { io, err } = setup('@dravensoft/arena-vue');
  assert.equal(run([], io), 2);
  assert.deepEqual(err, ['arena init: @dravensoft/arena-vue is not a package arena init knows how to wire']);
});

test('no example exits 2', () => {
  const { arena, cwd, io, err } = setup();
  rmSync(join(arena, 'arena.config.example.json'));
  assert.equal(run([], io), 2);
  assert.deepEqual(err, [`arena init: ${join(arena, 'arena.config.example.json')} is not there`]);
  assert.ok(!existsSync(join(cwd, 'arena.config.json')));
});

test('no package.json exits 2', () => {
  const { cwd, io, err } = setup(REACT, null);
  assert.equal(run([], io), 2);
  assert.deepEqual(err, [`arena init: no package.json in ${cwd}; arena init adds scripts to the one your project has`]);
  assert.ok(!existsSync(join(cwd, 'arena.config.json')));
});

test('bad JSON exits 2', () => {
  const { cwd, io, err } = setup(REACT, '{nope');
  assert.equal(run([], io), 2);
  assert.match(err[0] as string, new RegExp(`^arena init: cannot read ${join(cwd, 'package.json').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: `));
  assert.ok(!existsSync(join(cwd, 'arena.config.json')));
});
