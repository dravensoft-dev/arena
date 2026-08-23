import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  rebase, frontmatter, banner, record, targetsIn, unresolved, relPosix, locationsFor, copyTree,
  readManifest, routerBase, installedAt, dirnameOf, SKILL_NAME, SKILL_DIR, RECORD, AGENT_DIR,
  MANIFEST, PACKAGE_PAGE, DEFAULT_LOCATIONS, type Manifest,
} from './skill.ts';

const MANIFEST_FIXTURE: Manifest = {
  name: 'arena',
  description: 'the language, in one sentence',
  homepage: 'https://arena.dravensoft.org',
  version: '10.2.2',
  package: '@dravensoft/arena-react',
  layer: 'react',
  router: 'skills/design/ROUTER.md',
};

function payload(files: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'arena-skill-'));
  const all = { [`${AGENT_DIR}/${MANIFEST}`]: JSON.stringify(MANIFEST_FIXTURE), ...files };
  for (const [rel, body] of Object.entries(all)) {
    const at = join(dir, ...rel.split('/'));
    mkdirSync(join(at, '..'), { recursive: true });
    writeFileSync(at, body);
  }
  return dir;
}

test('a relative target is rebased onto the payload and an absolute one is left alone', () => {
  const base = '../../../node_modules/@dravensoft/arena-react/agent/skills/design';
  const out = rebase('[a](./references/page.md) [b](https://x/y) `../../frameworks/INDEX.md`', base);
  assert.match(out, /\(\.\.\/\.\.\/\.\.\/node_modules\/@dravensoft\/arena-react\/agent\/skills\/design\/references\/page\.md\)/);
  assert.match(out, /\(https:\/\/x\/y\)/);
  assert.match(out, /`\.\.\/\.\.\/\.\.\/node_modules\/@dravensoft\/arena-react\/agent\/frameworks\/INDEX\.md`/);
});

test('a base of . leaves every target where it was', () => {
  assert.equal(rebase('[a](./references/page.md)', '.'), '[a](./references/page.md)');
});

test('the frontmatter stamps the version and the package it came from', () => {
  const front = frontmatter(MANIFEST_FIXTURE);
  assert.match(front, /^---\nname: arena\n/);
  assert.match(front, /\n {2}version: 10\.2\.2\n/);
  assert.match(front, /\n {2}package: "@dravensoft\/arena-react"\n/);
  assert.match(front, /\ndescription: "the language, in one sentence"\n/);
});

test('the banner names the command that wrote it and the one that reads it back', () => {
  const line = banner(MANIFEST_FIXTURE, 'arena-to-prod --skill');
  assert.match(line, /arena-to-prod --skill/);
  assert.match(line, /@dravensoft\/arena-react@10\.2\.2/);
  assert.match(line, /--skill-check/);
});

test('the record is the frontmatter, the banner and the router rebased, in that order', () => {
  const out = record('# Arena\n\n[a](./references/page.md)\n', MANIFEST_FIXTURE, 'agent/skills/design', 'c');
  const [front, rest] = [out.slice(0, out.indexOf('---', 4) + 3), out.slice(out.indexOf('---', 4) + 3)];
  assert.match(front, /name: arena/);
  assert.match(rest, /^\n<!-- Written by/);
  assert.match(rest, /\(agent\/skills\/design\/references\/page\.md\)/);
});

test('a link target is judged even when rebasing left it with no leading dot', () => {
  assert.deepEqual(targetsIn('[a](README.md)'), ['README.md']);
  assert.deepEqual(targetsIn('[a](https://x/y) [b](#z)'), []);
});

test('a target that is not there is reported, and one that is passes', () => {
  const dir = payload({ 'references/page.md': 'x' });
  assert.deepEqual(unresolved('[a](./references/page.md)', dir), []);
  assert.deepEqual(unresolved('[a](./references/gone.md)', dir), ['./references/gone.md']);
  rmSync(dir, { recursive: true });
});

test('a placeholder is not a path, so it is never called missing', () => {
  const dir = payload();
  assert.deepEqual(unresolved('[a](./frameworks/<layer>/INDEX.md) [b](./intro/*.html)', dir), []);
  rmSync(dir, { recursive: true });
});

test('the manifest is read from the payload, and an absent one is null rather than a throw', () => {
  const dir = payload();
  assert.deepEqual(readManifest(dir), MANIFEST_FIXTURE);
  assert.equal(readManifest(join(dir, 'nowhere')), null);
  rmSync(dir, { recursive: true });
});

test('the base points into the package when routing and beside the record when vendored', () => {
  const arena = payload();
  const into = join(arena, 'project', '.agents', 'skills', SKILL_NAME);
  mkdirSync(into, { recursive: true });
  assert.match(routerBase(arena, into, false), /^(\.\.\/)+.*agent\/skills\/design$/);
  assert.equal(routerBase(arena, into, true), 'agent/skills/design');
  rmSync(arena, { recursive: true });
});

test('the logical node_modules path wins over the one a symlink resolves to', () => {
  const project = mkdtempSync(join(tmpdir(), 'arena-proj-'));
  const logical = join(project, 'node_modules', '@dravensoft', 'arena-react');
  mkdirSync(join(logical, AGENT_DIR), { recursive: true });
  writeFileSync(join(logical, AGENT_DIR, MANIFEST), JSON.stringify(MANIFEST_FIXTURE));
  assert.equal(installedAt(project, '@dravensoft/arena-react', '/elsewhere'), logical);
  assert.equal(installedAt(project, '@dravensoft/arena-angular', '/elsewhere'), '/elsewhere');
  rmSync(project, { recursive: true });
});

test('the default location is the one every scanner reads, and a named one takes the skill name', () => {
  assert.deepEqual(locationsFor([], false, '/p'), [join('/p', SKILL_DIR)]);
  assert.deepEqual(locationsFor(['.github/skills'], false, '/p'), [join('/p', '.github/skills', SKILL_NAME)]);
  assert.equal(DEFAULT_LOCATIONS[0], '.agents/skills');
});

test('global writes under the home directory and never inside the project', () => {
  const [only] = locationsFor([], true, '/p');
  assert.ok(only !== undefined && !only.startsWith('/p'), 'a global record is not a project file');
  assert.ok(only?.endsWith(join('.agents', 'skills', SKILL_NAME)));
});

test('the tree copy carries every file and every directory under it', () => {
  const from = payload({ 'a/b/c.md': 'c', 'a/d.md': 'd' });
  const to = mkdtempSync(join(tmpdir(), 'arena-copy-'));
  copyTree(from, to);
  assert.equal(readFileSync(join(to, 'a', 'b', 'c.md'), 'utf8'), 'c');
  assert.equal(readFileSync(join(to, 'a', 'd.md'), 'utf8'), 'd');
  rmSync(from, { recursive: true });
  rmSync(to, { recursive: true });
});

test('the record name and the page a vendored tree takes are the ones the scanners expect', () => {
  assert.equal(RECORD, 'SKILL.md');
  assert.equal(PACKAGE_PAGE, 'README.md');
  assert.equal(dirnameOf('skills/design/ROUTER.md'), 'skills/design');
  assert.equal(dirnameOf('ROUTER.md'), '');
  assert.equal(relPosix('/a/b', '/a/b'), '.');
});
