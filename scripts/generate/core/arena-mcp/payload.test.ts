import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  manifestIn, payloadIn, installedPayload, resolvePayload, readIn, relPosix, walk,
  AGENT_DIR, MANIFEST, PACKAGES,
} from './payload.ts';

const RECORD = {
  name: 'arena', description: 'd', homepage: 'h', version: '10.2.2',
  package: '@dravensoft/arena-react', layer: 'react', router: 'skills/design/ROUTER.md',
};

function withPayload(at: string) {
  mkdirSync(at, { recursive: true });
  writeFileSync(join(at, MANIFEST), JSON.stringify(RECORD));
  return at;
}

test('a manifest is read from the payload, and an absent one is null rather than a throw', () => {
  const dir = withPayload(mkdtempSync(join(tmpdir(), 'arena-p-')));
  assert.deepEqual(manifestIn(dir), RECORD);
  assert.equal(manifestIn(join(dir, 'nowhere')), null);
  rmSync(dir, { recursive: true });
});

test('a directory is a payload whether it is the agent dir or one holding it', () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-p-'));
  const agent = withPayload(join(root, AGENT_DIR));
  assert.equal(payloadIn(root), agent);
  assert.equal(payloadIn(agent), agent);
  assert.equal(payloadIn(join(root, 'nothing')), null);
  rmSync(root, { recursive: true });
});

test('the walk climbs out of a nested directory to the project that installed Arena', () => {
  const project = mkdtempSync(join(tmpdir(), 'arena-p-'));
  const agent = withPayload(join(project, 'node_modules', '@dravensoft', 'arena-react', AGENT_DIR));
  const deep = join(project, 'src', 'features', 'billing');
  mkdirSync(deep, { recursive: true });
  assert.equal(installedPayload(deep), agent);
  rmSync(project, { recursive: true });
});

test('either layer answers, and neither installed is null rather than an empty catalogue', () => {
  const project = mkdtempSync(join(tmpdir(), 'arena-p-'));
  assert.equal(installedPayload(project, PACKAGES), null);
  const agent = withPayload(join(project, 'node_modules', '@dravensoft', 'arena-angular', AGENT_DIR));
  assert.equal(installedPayload(project), agent);
  rmSync(project, { recursive: true });
});

test('a named payload that is not one is an error naming what to point at', () => {
  const empty = mkdtempSync(join(tmpdir(), 'arena-p-'));
  const { error } = resolvePayload(empty, empty);
  assert.match(error ?? '', /carries no skill\.json/);
  rmSync(empty, { recursive: true });
});

test('nothing installed is an error that names what to install rather than a silent start', () => {
  const empty = mkdtempSync(join(tmpdir(), 'arena-p-'));
  const { error } = resolvePayload(null, empty);
  assert.match(error ?? '', /carries no copy of the language on purpose/);
  for (const name of PACKAGES) assert.ok(error?.includes(name), `${name} is not named`);
  rmSync(empty, { recursive: true });
});

test('a named payload wins over anything the walk would have found', () => {
  const project = mkdtempSync(join(tmpdir(), 'arena-p-'));
  withPayload(join(project, 'node_modules', '@dravensoft', 'arena-react', AGENT_DIR));
  const named = withPayload(join(project, 'vendored'));
  assert.equal(resolvePayload(named, project).payload, named);
  rmSync(project, { recursive: true });
});

test('the walk answers in a posix path whatever the host walked with', () => {
  const dir = withPayload(mkdtempSync(join(tmpdir(), 'arena-p-')));
  mkdirSync(join(dir, 'a', 'b'), { recursive: true });
  writeFileSync(join(dir, 'a', 'b', 'c.md'), 'c');
  const found = walk(dir).map((path) => relPosix(dir, path));
  assert.ok(found.includes('a/b/c.md'), found.join(', '));
  assert.equal(readIn(dir, 'a/b/c.md'), 'c');
  assert.equal(readIn(dir, 'a/b/gone.md'), null);
  rmSync(dir, { recursive: true });
});
