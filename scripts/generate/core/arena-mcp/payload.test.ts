import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  manifestIn, payloadIn, installedArena, bundledPayload, resolvePayload, disagreement,
  layerOf, versionIn, readIn, relPosix, walk,
  AGENT_DIR, MANIFEST, PACKAGES, LAYERS,
} from './payload.ts';

const RECORD = {
  name: 'arena', description: 'd', homepage: 'h', version: '11.0.0',
  package: '@dravensoft/arena-mcp', layer: 'react', router: 'skills/design/ROUTER.md',
};

function withPayload(at: string, record = RECORD) {
  mkdirSync(at, { recursive: true });
  writeFileSync(join(at, MANIFEST), JSON.stringify(record));
  return at;
}

function withInstalled(project: string, name: string, version: string) {
  const at = join(project, 'node_modules', ...name.split('/'));
  mkdirSync(at, { recursive: true });
  writeFileSync(join(at, 'package.json'), JSON.stringify({ name, version }));
  return at;
}

function withCorpus(layers = LAYERS) {
  const root = mkdtempSync(join(tmpdir(), 'arena-c-'));
  for (const layer of layers) withPayload(join(root, AGENT_DIR, layer), { ...RECORD, layer });
  return root;
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

test('a package name says which layer it is', () => {
  assert.equal(layerOf('@dravensoft/arena-react'), 'react');
  assert.equal(layerOf('@dravensoft/arena-angular'), 'angular');
});

test('the walk climbs out of a nested directory to the project that installed Arena', () => {
  const project = mkdtempSync(join(tmpdir(), 'arena-p-'));
  const at = withInstalled(project, '@dravensoft/arena-react', '11.0.0');
  const deep = join(project, 'src', 'features', 'billing');
  mkdirSync(deep, { recursive: true });
  const found = installedArena(deep);
  assert.equal(found?.dir, at);
  assert.equal(found?.layer, 'react');
  assert.equal(found?.version, '11.0.0');
  assert.equal(versionIn(at), '11.0.0');
  rmSync(project, { recursive: true });
});

test('either layer answers, and neither installed is null rather than a wrong guess', () => {
  const project = mkdtempSync(join(tmpdir(), 'arena-p-'));
  assert.equal(installedArena(project, PACKAGES), null);
  withInstalled(project, '@dravensoft/arena-angular', '11.0.0');
  assert.equal(installedArena(project)?.layer, 'angular');
  rmSync(project, { recursive: true });
});

test('the corpus this package carries is found per layer, and a missing one is null', () => {
  const root = withCorpus();
  assert.equal(bundledPayload('react', root), join(root, AGENT_DIR, 'react'));
  assert.equal(bundledPayload('angular', root), join(root, AGENT_DIR, 'angular'));
  assert.equal(bundledPayload('svelte', root), null);
  rmSync(root, { recursive: true });
});

test('the installed layer picks the half served, with no configuration', () => {
  const root = withCorpus();
  const project = mkdtempSync(join(tmpdir(), 'arena-p-'));
  withInstalled(project, '@dravensoft/arena-angular', '11.0.0');
  const { payload, installed } = resolvePayload(null, project, null, root);
  assert.equal(payload, join(root, AGENT_DIR, 'angular'));
  assert.equal(installed?.package, '@dravensoft/arena-angular');
  rmSync(project, { recursive: true });
  rmSync(root, { recursive: true });
});

test('a named layer answers where nothing is installed, rather than refusing to serve', () => {
  const root = withCorpus();
  const empty = mkdtempSync(join(tmpdir(), 'arena-p-'));
  assert.equal(resolvePayload(null, empty, 'react', root).payload, join(root, AGENT_DIR, 'react'));
  rmSync(empty, { recursive: true });
  rmSync(root, { recursive: true });
});

test('a named payload that is not one is an error naming what to point at', () => {
  const empty = mkdtempSync(join(tmpdir(), 'arena-p-'));
  const { error } = resolvePayload(empty, empty);
  assert.match(error ?? '', /carries no skill\.json/);
  rmSync(empty, { recursive: true });
});

test('nothing installed and no layer named is an error that says both ways out', () => {
  const root = withCorpus();
  const empty = mkdtempSync(join(tmpdir(), 'arena-p-'));
  const { error } = resolvePayload(null, empty, null, root);
  assert.match(error ?? '', /no layer to serve/);
  for (const name of PACKAGES) assert.ok(error?.includes(name), `${name} is not named`);
  assert.ok(error?.includes('--layer'), 'the flag that answers it is not named');
  rmSync(empty, { recursive: true });
  rmSync(root, { recursive: true });
});

test('a layer this package carries no corpus for reports an incomplete install', () => {
  const root = withCorpus(['react']);
  const empty = mkdtempSync(join(tmpdir(), 'arena-p-'));
  const { error } = resolvePayload(null, empty, 'angular', root);
  assert.match(error ?? '', /carries no corpus for the angular layer/);
  rmSync(empty, { recursive: true });
  rmSync(root, { recursive: true });
});

test('a named payload wins over anything the walk would have found', () => {
  const root = withCorpus();
  const project = mkdtempSync(join(tmpdir(), 'arena-p-'));
  withInstalled(project, '@dravensoft/arena-react', '11.0.0');
  const named = withPayload(join(project, 'vendored'));
  assert.equal(resolvePayload(named, project, null, root).payload, named);
  rmSync(project, { recursive: true });
  rmSync(root, { recursive: true });
});

test('a corpus and the components beside it are compared, and only a real gap is reported', () => {
  const react = { package: '@dravensoft/arena-react', layer: 'react', dir: '/x' };
  assert.equal(disagreement(RECORD, null), null);
  assert.equal(disagreement(RECORD, { ...react, version: '11.0.0' }), null);
  assert.equal(disagreement(RECORD, { ...react, version: '' }), null);
  assert.equal(disagreement({ ...RECORD, version: '' }, { ...react, version: '10.2.4' }), null);
  const said = disagreement(RECORD, { ...react, version: '10.2.4' }) ?? '';
  assert.match(said, /11\.0\.0/);
  assert.match(said, /10\.2\.4/);
  assert.match(said, /the components are right and this text is old/);
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
