import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nodeBin } from './node-bin.ts';

const withTree = (build: (root: string) => void, run: (root: string) => void) => {
  const root = mkdtempSync(join(tmpdir(), 'arena-node-bin-'));
  try { build(root); run(root); } finally { rmSync(root, { recursive: true, force: true }); }
};

function install(root: string, pkg: string, bin: unknown, files: string[] = []) {
  const home = join(root, 'node_modules', ...pkg.split('/'));
  mkdirSync(home, { recursive: true });
  writeFileSync(join(home, 'package.json'), JSON.stringify({ name: pkg, bin }));
  for (const file of files) {
    mkdirSync(join(home, file, '..'), { recursive: true });
    writeFileSync(join(home, file), '');
  }
  return home;
}

test('the entry comes from the package manifest, not from node_modules/.bin', () => {
  withTree((root) => install(root, 'ng-packagr', { 'ng-packagr': './src/cli/main.js' }, ['src/cli/main.js']),
    (root) => {
      assert.equal(nodeBin('ng-packagr', undefined, root),
        join(root, 'node_modules', 'ng-packagr', 'src', 'cli', 'main.js'),
        'the shim in .bin is an extensionless shell script on POSIX and a .CMD plus a .ps1 on '
        + 'Windows, with nothing plainly named, so spawning it by path is a file-not-found there');
    });
});

test('a scoped package resolves through its own directory', () => {
  withTree((root) => install(root, '@tailwindcss/cli', { tailwindcss: './dist/index.mjs' }, ['dist/index.mjs']),
    (root) => {
      assert.equal(nodeBin('@tailwindcss/cli', undefined, root),
        join(root, 'node_modules', '@tailwindcss', 'cli', 'dist', 'index.mjs'));
    });
});

test('a bin given as a bare string is the one command', () => {
  withTree((root) => install(root, 'solo', './cli.js', ['cli.js']),
    (root) => assert.equal(nodeBin('solo', undefined, root), join(root, 'node_modules', 'solo', 'cli.js')));
});

test('a package with several commands has to be asked for one by name', () => {
  withTree((root) => install(root, 'many', { a: './a.js', b: './b.js' }, ['a.js', 'b.js']), (root) => {
    assert.throws(() => nodeBin('many', undefined, root), /asked for one by name/,
      'guessing which of them was meant is how a build silently runs the wrong tool');
    assert.equal(nodeBin('many', 'b', root), join(root, 'node_modules', 'many', 'b.js'));
    assert.throws(() => nodeBin('many', 'c', root), /there is no c/);
  });
});

test('a package that is not installed says so and says what to run', () => {
  withTree(() => {  }, (root) => assert.throws(() => nodeBin('absent', undefined, root), /bun install/));
});

test('a manifest naming an entry that is not there is a throw and never a spawn', () => {
  withTree((root) => install(root, 'stale', { stale: './gone.js' }), (root) => {
    assert.throws(() => nodeBin('stale', undefined, root), /nothing is there/);
  });
});

test('the two commands this tree actually spawns resolve in the real tree', () => {
  for (const [pkg, expected] of [['ng-packagr', 'main.js'], ['@tailwindcss/cli', 'index.mjs']] as const) {
    const entry = nodeBin(pkg);
    assert.ok(existsSync(entry), `${pkg} resolved to ${entry}, which is not there`);
    assert.ok(entry.endsWith(expected), `${pkg} resolved to ${entry}`);
  }
});
