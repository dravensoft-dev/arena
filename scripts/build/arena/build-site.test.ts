import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { retargetPages, adopterBuild, adopterSection, adopterClash, adopterDeclares, landingPage, placeAdopter } from './build-site.ts';
import { repositoryBase, version } from '../../lib/arena/package-assembly.ts';

test('a published Markdown page points what the output lacks at the release tag and keeps the rest', () => {
  const out = mkdtempSync(join(tmpdir(), 'arena-site-'));
  mkdirSync(join(out, 'intro'), { recursive: true });
  mkdirSync(join(out, 'frameworks'), { recursive: true });
  writeFileSync(join(out, 'frameworks', 'INDEX.md'), '# index\n');
  const page = join(out, 'intro', 'AGENTS.md');
  writeFileSync(page, '[a](../AGENTS.md) [b](../frameworks/INDEX.md) [c](../frameworks/GONE.md#x) [d](../nowhere/MISSING.md)\n');
  retargetPages(out, [page, join(out, 'frameworks', 'INDEX.md')]);
  const tag = repositoryBase();
  assert.equal(
    readFileSync(page, 'utf8'),
    `[a](${tag}/AGENTS.md) [b](../frameworks/INDEX.md) [c](../frameworks/GONE.md#x) [d](../nowhere/MISSING.md)\n`,
  );
  rmSync(out, { recursive: true });
});

const made: string[] = [];
const track = (dir: string) => { made.push(dir); return dir; };
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

const manifest = (over: object = {}) => ({
  arena: version(), name: 'gallery', title: 'Gallery', description: 'A <gallery> & more', repository: 'https://example.org/gallery',
  sections: [
    { heading: 'Pages', links: [{ label: 'First', href: 'first/' }, { label: 'Second', href: 'second/deep/' }] },
    { heading: 'Notes', links: [{ label: 'Third', href: 'third/' }] },
  ], ...over,
});

function adopterOut(over: object | null = manifest()) {
  const out = track(mkdtempSync(join(tmpdir(), 'arena-adopter-')));
  mkdirSync(join(out, 'gallery'), { recursive: true });
  if (over !== null) writeFileSync(join(out, 'gallery', 'arena-adopter.json'), JSON.stringify(over));
  return out;
}

test('no adopter build named, or an empty name, is silence', () => {
  assert.equal(adopterBuild({}), null);
  assert.equal(adopterBuild({ ARENA_ADOPTER_BUILD: '' }), null);
});

test('an adopter build named at a missing directory is a refusal with a line, never a throw', () => {
  const dir = join(tmpdir(), 'arena-adopter-absent');
  const named = adopterBuild({ ARENA_ADOPTER_BUILD: dir });
  assert.equal(named?.dir, dir);
  assert.equal(named?.verdict.publish, false);
  assert.ok(named?.verdict.line.includes(dir));
});

test('an adopter build declaring this tree\'s version is published', () => {
  const dir = join(adopterOut(), 'gallery');
  const named = adopterBuild({ ARENA_ADOPTER_BUILD: dir });
  assert.equal(named?.verdict.publish, true);
  assert.equal(adopterBuild({ ARENA_ADOPTER_BUILD: join(adopterOut(manifest({ arena: '0.0.0' })), 'gallery') })?.verdict.publish, false);
});

test('the adopter section names the title and every link, and is empty without an adopter', () => {
  const html = adopterSection(adopterOut());
  assert.match(html, /<h2[^>]*>Gallery<\/h2>/);
  assert.match(html, /A &lt;gallery&gt; &amp; more/);
  for (const href of ['first/', 'second/deep/', 'third/']) assert.ok(html.includes(`href="./gallery/${href}"`), href);
  for (const label of ['Pages', 'Notes', 'First', 'Second', 'Third']) assert.ok(html.includes(label), label);
  assert.ok(html.includes(`Built against Arena ${version()}`));
  assert.ok(html.includes('href="https://example.org/gallery"'));
  assert.equal(adopterSection(adopterOut(null)), '');
});

test('the landing page links no adopter repository when no adopter is published', () => {
  const without = landingPage(repoRoot, adopterOut(null));
  assert.ok(!without.includes('./gallery/') && !without.includes('example.org/gallery'));
  const withOne = landingPage(repoRoot, adopterOut());
  assert.ok(withOne.includes('./gallery/first/') && withOne.includes('href="https://example.org/gallery"'));
});

test('an adopter whose name an Arena entry already holds, or that carries its own index, is refused', () => {
  const out = track(mkdtempSync(join(tmpdir(), 'arena-adopter-')));
  mkdirSync(join(out, 'intro'));
  const dir = track(mkdtempSync(join(tmpdir(), 'arena-adopter-')));
  assert.match(adopterClash(out, dir, 'intro') ?? '', /intro/);
  assert.equal(adopterClash(out, dir, 'gallery'), null);
  writeFileSync(join(dir, 'index.html'), '<html></html>');
  assert.match(adopterClash(out, dir, 'gallery') ?? '', /index\.html/);
});

test('the declares command appends publish=true or publish=false to the output file it is handed', () => {
  const file = join(track(mkdtempSync(join(tmpdir(), 'arena-adopter-'))), 'output');
  assert.equal(adopterDeclares(join(adopterOut(), 'gallery'), file).publish, true);
  assert.equal(adopterDeclares(join(adopterOut(manifest({ arena: '0.0.0' })), 'gallery'), file).publish, false);
  assert.equal(readFileSync(file, 'utf8'), 'publish=true\npublish=false\n');
  assert.equal(adopterDeclares(join(adopterOut(), 'gallery')).publish, true, 'no output file is no write');
});

test('an empty, missing or option-shaped directory is a refusal and never reads the working directory', () => {
  const file = join(track(mkdtempSync(join(tmpdir(), 'arena-adopter-'))), 'output');
  for (const dir of [undefined, '', '--other']) {
    const verdict = adopterDeclares(dir, file);
    assert.equal(verdict.publish, false);
    assert.match(verdict.line, /needs a directory/);
  }
  assert.equal(readFileSync(file, 'utf8'), 'publish=false\npublish=false\npublish=false\n');
});

function placed() {
  const out = track(mkdtempSync(join(tmpdir(), 'arena-site-')));
  mkdirSync(join(out, 'intro'), { recursive: true });
  const page = join(out, 'intro', 'AGENTS.md');
  writeFileSync(page, '[a](../AGENTS.md)\n');
  const dir = join(adopterOut(), 'gallery');
  writeFileSync(join(dir, 'notes.md'), '[a](../AGENTS.md)\n');
  return { out, page, dir };
}

test('an adopter\'s Markdown is placed byte for byte, after the pages that are rewritten', () => {
  const { out, page, dir } = placed();
  const arena = [page];
  retargetPages(out, arena);
  const mine = placeAdopter(out, { ARENA_ADOPTER_BUILD: dir });
  assert.equal(readFileSync(join(out, 'gallery', 'notes.md'), 'utf8'), '[a](../AGENTS.md)\n');
  assert.notEqual(readFileSync(page, 'utf8'), '[a](../AGENTS.md)\n', 'Arena\'s own page is rewritten');
  assert.ok(mine.includes(join(out, 'gallery', 'notes.md')));
  assert.ok(mine.every((file) => !arena.includes(file)), 'the adopter\'s files are never in the list retargetPages reads');
  retargetPages(out, arena);
  assert.equal(readFileSync(join(out, 'gallery', 'notes.md'), 'utf8'), '[a](../AGENTS.md)\n');
});

test('an adopter whose name the site holds leaves the site unchanged', () => {
  const { out, dir } = placed();
  const manifestPath = join(dir, 'arena-adopter.json');
  writeFileSync(manifestPath, JSON.stringify(manifest({ name: 'intro' })));
  writeFileSync(join(out, 'intro', 'x'), 'kept');
  assert.deepEqual(placeAdopter(out, { ARENA_ADOPTER_BUILD: dir }), []);
  assert.equal(readFileSync(join(out, 'intro', 'x'), 'utf8'), 'kept');
  assert.ok(!existsSync(join(out, 'intro', 'notes.md')));
});

test('a copy that throws leaves nothing of the adopter and does not stop the build', () => {
  const { out, dir } = placed();
  symlinkSync(join(dir, 'absent'), join(dir, 'dangling'));
  assert.deepEqual(placeAdopter(out, { ARENA_ADOPTER_BUILD: dir }), []);
  assert.ok(!existsSync(join(out, 'gallery')));
});

test('the output file is told published, or refused, and nothing when no adopter is named', () => {
  const file = join(track(mkdtempSync(join(tmpdir(), 'arena-adopter-'))), 'output');
  const { out, dir } = placed();
  placeAdopter(out, { GITHUB_OUTPUT: file });
  assert.ok(!existsSync(file), 'no adopter named, no line');
  placeAdopter(out, { ARENA_ADOPTER_BUILD: dir, GITHUB_OUTPUT: file });
  placeAdopter(out, { ARENA_ADOPTER_BUILD: dir, GITHUB_OUTPUT: file });
  placeAdopter(out, { ARENA_ADOPTER_BUILD: join(tmpdir(), 'arena-adopter-absent'), GITHUB_OUTPUT: file });
  assert.equal(readFileSync(file, 'utf8'), 'adopter=published\nadopter=refused\nadopter=refused\n');
});

test('an adopter build holding only its manifest is published all the same', () => {
  const file = join(track(mkdtempSync(join(tmpdir(), 'arena-adopter-'))), 'output');
  const { out, dir } = placed();
  rmSync(join(dir, 'notes.md'));
  placeAdopter(out, { ARENA_ADOPTER_BUILD: dir, GITHUB_OUTPUT: file });
  assert.equal(readFileSync(file, 'utf8'), 'adopter=published\n');
});
