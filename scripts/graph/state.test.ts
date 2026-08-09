import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import {
  FILES_PATH, STATE_PATH, VERSION, forget, readFiles, readState, recordGreen, writeFiles, writeState,
} from './state.ts';
import { arch, platform } from '../lib/arena/platform.ts';
import type { Fingerprint } from './fingerprint.ts';

const withRoot = (run: (root: string) => void) => {
  const root = mkdtempSync(join(tmpdir(), 'arena-state-'));
  try { run(root); } finally { rmSync(root, { recursive: true, force: true }); }
};

const entry = (fingerprint: string): Fingerprint => ({
  fingerprint,
  script: 'scripts/generate/arena/generate-tokens.ts',
  reads: { digest: 'rrrr', count: 6 },
  self: { 'scripts/generate/arena/generate-tokens.ts': 'ssss' },
  up: {},
  writes: ['contracts/design-generated/palette.generated.css'],
});

test('both files live under .cache/, which this tree ignores', () => {
  assert.match(FILES_PATH, /^\.cache[\\/]graph[\\/]files\.json$/);
  assert.match(STATE_PATH, /^\.cache[\\/]graph[\\/]state\.json$/);
});

test('nothing recorded reads as nothing recorded rather than as an error', () => {
  withRoot((root) => {
    assert.equal(readFiles(root).size, 0);
    assert.equal(readState(root).size, 0);
  });
});

test('what a green run writes is what the next run reads back', () => {
  withRoot((root) => {
    const stamps = new Map([['a.txt', { size: 3, mtimeMs: 1, hash: 'aaaa' }]]);
    writeFiles(stamps, root);
    assert.deepEqual([...readFiles(root)], [...stamps]);

    const state = recordGreen(new Map(), 'generate:tokens', entry('9f3a'), '2026-08-08T00:00:00.000Z');
    writeState(state, root);
    assert.equal(readState(root).get('generate:tokens')?.fingerprint, '9f3a');
    assert.equal(readState(root).get('generate:tokens')?.at, '2026-08-08T00:00:00.000Z');
  });
});

test('a state written by an older fingerprint is discarded whole rather than read', () => {
  withRoot((root) => {
    const path = join(root, STATE_PATH);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify({ version: VERSION + 1, nodes: { 'generate:tokens': entry('9f3a') } }));
    assert.equal(readState(root).size, 0,
      'a fingerprint means nothing across a change to what goes into it, and half a schema is worse '
      + 'than none: it would skip on a comparison whose terms have moved');
  });
});

test('a state written on another machine is discarded, because a fingerprint is local', () => {
  withRoot((root) => {
    const path = join(root, STATE_PATH);
    mkdirSync(dirname(path), { recursive: true });
    const held = { version: VERSION, platform, arch, nodes: { 'generate:tokens': entry('9f3a') } };

    writeFileSync(path, JSON.stringify(held));
    assert.equal(readState(root).size, 1, 'this machine reads back what this machine wrote');

    writeFileSync(path, JSON.stringify({ ...held, platform: 'sunos' }));
    assert.equal(readState(root).size, 0,
      'one tree can be reached by two operating systems -- a WSL2 clone under /mnt/c is visited by '
      + 'Windows-bun and Linux-bun in turn -- and a cache that answered for one would keep a step '
      + 'that has never run on the other');

    writeFileSync(path, JSON.stringify({ ...held, arch: 'loong64' }));
    assert.equal(readState(root).size, 0,
      'the prebuilt oxide, rollup and lightningcss binaries differ by architecture, so what a step '
      + 'produced on one is not what it produces on another at the same version');
  });
});

test('the machine is recorded, so a discard is a comparison rather than a guess', () => {
  withRoot((root) => {
    writeFiles(new Map([['a.txt', { size: 3, mtimeMs: 1, hash: 'aaaa' }]]), root);
    const held = JSON.parse(readFileSync(join(root, FILES_PATH), 'utf8'));
    assert.equal(held.platform, platform);
    assert.equal(held.arch, arch);
  });
});

test('a file that is not JSON is discarded rather than taken down the run with it', () => {
  withRoot((root) => {
    const path = join(root, FILES_PATH);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, 'not json');
    assert.equal(readFiles(root).size, 0);
  });
});

test('forgetting removes the entry outright, so nothing green is left behind a failure', () => {
  const state = recordGreen(new Map(), 'generate:tokens', entry('9f3a'), 'now');
  assert.equal(forget(state, 'generate:tokens').has('generate:tokens'), false,
    'a stale entry left after a failure is a node that skips next time on the strength of a run '
    + 'that did not pass');
});

test('entries are written in a stable order, so a diff of the cache reads as a change', () => {
  withRoot((root) => {
    const state = new Map();
    recordGreen(state, 'build:tailwind', entry('bbbb'), 'now');
    recordGreen(state, 'generate:tokens', entry('aaaa'), 'now');
    writeState(state, root);
    assert.deepEqual([...readState(root).keys()], ['build:tailwind', 'generate:tokens']);
  });
});
