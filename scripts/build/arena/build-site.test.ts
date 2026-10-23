import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { retargetPages, adopterBuild, adopterSection, adopterClash, landingPage } from './build-site.ts';
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
  assert.ok(!landingPage(repoRoot, adopterOut(null)).includes('github.com/dravensoft-dev/arena-web'));
  assert.ok(landingPage(repoRoot, adopterOut()).includes('./gallery/first/'));
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
