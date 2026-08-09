/* The union the two copies had drifted into: a raw path comparison, and a symlinked entry
 * resolved through realpathSync, which is what an npm bin/ link is. Neither an absent argv[1]
 * nor one pointing at nothing is this module, because a guard that throws at import time takes
 * down every script carrying it, and it carries at the top level where nothing catches. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { isMainModule } from './main-module.ts';

function withArgv(entry: string | undefined, run: () => void) {
  const before = process.argv[1];
  if (entry === undefined) process.argv.splice(1, 1);
  else process.argv[1] = entry;
  try { run(); } finally { process.argv[1] = before ?? ''; }
}

test('a module run by its own path is the program', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-main-'));
  try {
    const path = join(dir, 'gate.ts');
    writeFileSync(path, '');
    withArgv(path, () => assert.equal(isMainModule(pathToFileURL(path).href), true));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a module something else imported is not the program', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-main-'));
  try {
    for (const name of ['gate.ts', 'other.ts']) writeFileSync(join(dir, name), '');
    withArgv(join(dir, 'other.ts'),
      () => assert.equal(isMainModule(pathToFileURL(join(dir, 'gate.ts')).href), false));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('an entry reached through a symlink is still the program, which is what an npm bin is', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-main-'));
  try {
    const real = join(dir, 'command.ts');
    const link = join(dir, 'linked.ts');
    writeFileSync(real, '');
    try {
      symlinkSync(real, link);
    } catch (err) {
      t.skip(`this host will not create a symlink (${(err as Error).message}). The capability is `
        + 'what is asked about rather than the platform, because a util suite may import no '
        + 'Arena module and so cannot ask which one it is running on; on the host where this '
        + 'fails, Windows without Developer Mode, an npm bin link is a .CMD shim and not a link.');
      return;
    }
    withArgv(link, () => assert.equal(isMainModule(pathToFileURL(real).href), true,
      'the raw comparison misses this one, and it is the whole reason the second half exists'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('an argv[1] pointing at nothing answers false rather than throwing at import time', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-main-'));
  try {
    const path = join(dir, 'gate.ts');
    writeFileSync(path, '');
    withArgv(join(dir, 'gone.ts'), () => assert.equal(isMainModule(pathToFileURL(path).href), false));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a run with no entry at all is not this module', () => {
  withArgv(undefined, () => assert.equal(isMainModule(pathToFileURL('/tmp/gate.ts').href), false));
});
