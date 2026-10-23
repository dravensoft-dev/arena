/* The manifest reads the real tree, so these hold the parts a mistake would move quietly: the
 * kebab normalisation that lets two layers keying the same map differently be compared at all,
 * the specimen with no <title>, and the URL of a page whose name carries a space. The absence
 * check is the reason the module exists, so it is asserted against the tree rather than a stub. */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { repoRoot } from './repo-root.ts';
import {
  DOMAIN, SITE_DIR, LAYERS, sinkNames, entryPoints, components,
  playgroundsOnDisk, missingPlaygrounds, playgroundSections, sinkPages, pages, indexedDirectories,
  modules, missingModules, titleOf, url, directoryUrl,
  treePages,
  COPIED_FILES, variantSinkNames, COPIED, SPRITE_FILE,
  adopterVerdict, publishedAdopter, adopterPages, adopterDirectories,
} from './site-pages.ts';

const made: string[] = [];
const track = (dir: string) => { made.push(dir); return dir; };
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

test('the site is built for one domain, named once, and every URL is spelled from it', () => {
  assert.equal(DOMAIN, 'arena.dravensoft.org');
  assert.equal(SITE_DIR, 'dist/site');
  assert.match(url('intro/x.html'), new RegExp(`^https://${DOMAIN}/`));
});

test('a page whose name carries a space is escaped once, and its slashes survive', () => {
  assert.equal(url('intro/Arena - Overview.html'), `https://${DOMAIN}/intro/Arena%20-%20Overview.html`);
});

test('every entry point the dev server prints is one the site publishes', () => {
  const entries = entryPoints();
  assert.ok(entries.length > 0, 'an empty list would print nothing and publish nothing');
  for (const { label, path, public: shown } of entries) {
    assert.ok(label.length > 0, 'an entry with no label is a line nobody can read');
    assert.ok(path.startsWith('/'), `${path} is not rooted at the site`);
    assert.equal(typeof shown, 'boolean');
  }
});

test('a sink names itself in its own fixture, so one added tomorrow is published without an edit', () => {
  const found = sinkNames();
  assert.ok(found.length > 0, 'found no sink fixture at all, which is a failure rather than a clean pass');
  assert.equal(new Set(found).size, found.length, 'and none of them is counted twice');
});

test('every component the packages ship draws a playground, in both layers', () => {
  assert.deepEqual(missingPlaygrounds(), []);
});

test('every module a page imports is one the tree holds, so the graph has no dead edge', () => {
  assert.deepEqual(missingModules(), []);
});

test('the graph reaches past the entry beside the page', () => {
  const carried = new Set(modules());
  assert.ok(carried.size > 0, 'an empty graph would publish nothing and report every page whole');
  for (const rel of carried) {
    assert.ok(existsSync(join(repoRoot, rel)), `${rel} is in the graph and not in the tree`);
    assert.ok(rel.endsWith('.js'), `${rel} is not JavaScript, so nothing imported it as a module`);
  }
  for (const rel of ['frameworks/react/playground/Playground.generated.js',
    'frameworks/react/ArenaStyles.generated.js',
    'frameworks/react/components/forms/arena-select/ArenaSelect.generated.js']) {
    assert.ok(carried.has(rel),
      `${rel} is reached only through an import, and a walk that stops at the entry misses it`);
  }
});

test('the two layers key that map differently, and both answer in kebab', () => {
  for (const layer of LAYERS) {
    const named = components(layer);
    assert.ok(named.length > 0, `${layer} maps no component`);
    for (const name of named) {
      assert.match(name, /^[a-z0-9-]+$/, `${name} is not kebab, so the two layers cannot be compared`);
    }
    assert.ok(playgroundsOnDisk(layer).size > 0, `${layer} has no playground on disk`);
  }
});

test('a sink stands for every layer times every fixture, and the list has no repeat in it', () => {
  const sinks = sinkPages();
  assert.equal(sinks.length, LAYERS.length * sinkNames().length);
  assert.equal(new Set(sinks).size, sinks.length);
});

test('no page is published twice, which would put a repeat in the sitemap', () => {
  const all = pages(repoRoot, adopterOut(null));
  assert.equal(new Set(all).size, all.length);
});

test('a directory a visitor can land on gets an index, since serve.ts lists it and a host does not', () => {
  const directories = indexedDirectories(repoRoot, adopterOut(null));
  assert.ok(directories.includes(''), 'the site root is one of them');
  assert.ok(directories.includes('intro/guidelines'));
  assert.equal(new Set(directories).size, directories.length);
});

test('a specimen with no title is named by its @dsCard header rather than by its filename', () => {
  const specimen = pages(repoRoot, adopterOut(null)).find((rel) => rel.startsWith('intro/guidelines/'));
  assert.ok(specimen, 'the guidelines publish at least one specimen');
  assert.ok(!titleOf(specimen).endsWith('.html'), `${specimen} fell back to its filename`);
});

test('the site ships the repo sprite and no Phosphor font', async () => {
  const site = await import('./site-pages.ts');
  for (const gone of ['PHOSPHOR', 'PHOSPHOR_KEEP', 'PHOSPHOR_FORMATS', 'phosphorKeeps', 'phosphorDrops', 'phosphorFiles']) {
    assert.ok(!(gone in site), `${gone} is the site's Phosphor copy, which D20 removes`);
  }
  assert.equal(SPRITE_FILE, 'assets/Icons.generated.svg');
  assert.ok(COPIED.includes('assets') || COPIED_FILES.includes(SPRITE_FILE) || existsSync(join(repoRoot, SPRITE_FILE)),
    'the sprite travels with the site');
});

test('the index of a layer names every playground it publishes, exactly once', () => {
  for (const layer of LAYERS) {
    const drawn = playgroundsOnDisk(layer);
    const listed = playgroundSections(layer).flatMap(({ links }) => links);
    const named = new Set(listed.map(({ href }) => href));
    assert.equal(named.size, listed.length, 'a playground named twice is one a reader meets twice');
    assert.equal(listed.length, drawn.size,
      `${layer} publishes ${drawn.size} playground(s) and its index offers ${listed.length}`);
    for (const rel of drawn.values()) {
      const href = rel.slice(`frameworks/${layer}/components/`.length);
      assert.ok(named.has(href), `${rel} is published and no index names it, so nothing links to it`);
    }
  }
});

test('a section is a category the tree already has, headed and never empty', () => {
  for (const layer of LAYERS) {
    const sections = playgroundSections(layer);
    assert.ok(sections.length > 1, 'one section is a flat list wearing a heading');
    for (const { heading, links } of sections) {
      assert.ok((heading ?? '').length > 0, 'a section nothing heads is one a reader cannot skip');
      assert.ok(links.length > 0, 'an empty section is a category the walk invented');
      for (const { href, label } of links) {
        assert.ok(!href.startsWith('/'), `${href} is rooted at the site and the index is not`);
        assert.ok(label.startsWith('Arena'), `${label} is not what the component is called`);
      }
    }
  }
});

test('every public entry point lands on a page the site publishes or a directory it indexes', () => {
  const bare = adopterOut(null);
  const published = new Set(pages(repoRoot, bare).map((rel) => `/${rel}`));
  const indexed = new Set(indexedDirectories(repoRoot, bare).map((dir) => (dir === '' ? '/' : `/${dir}/`)));
  for (const { label, path } of entryPoints().filter((entry) => entry.public)) {
    const target = decodeURIComponent(path);
    assert.ok(published.has(target) || indexed.has(target),
      `${label} points at ${path}, which the site neither publishes nor indexes, so the one list `
      + 'the landing page and the dev server both read offers a dead end');
  }
});

test('a directory is addressed with the trailing slash a host serves its index at', () => {
  assert.equal(directoryUrl(''), `https://${DOMAIN}/`);
  assert.equal(directoryUrl('intro/guidelines'), `https://${DOMAIN}/intro/guidelines/`);
  for (const directory of indexedDirectories(repoRoot, adopterOut(null))) assert.match(directoryUrl(directory), /\/$/);
});

test('an adopter page is declared beside the tree pages and never instead of one', () => {
  const out = adopterOut(adopterManifest());
  assert.deepEqual(pages(repoRoot, out), [...treePages(repoRoot), ...adopterPages(out)]);
  assert.deepEqual(pages(repoRoot, adopterOut(null)), treePages(repoRoot),
    'with no manifest the declaration is the tree\'s own, which is what a developer run builds');
  assert.deepEqual(indexedDirectories(repoRoot, out).slice(-1), ['gallery']);
});

test('an adopter\'s own subdirectories are not indexed, or the build overwrites a page of its own', () => {
  const out = adopterOut(adopterManifest());
  for (const directory of indexedDirectories(repoRoot, out)) {
    assert.equal(/^gallery\/./.test(directory), false,
      'an indexed directory is handed a generated index.html, and that file is the adopter\'s own');
  }
});

test('the identity template and its worked answer are pages the site declares, and no other file beside them', () => {
  assert.deepEqual(COPIED_FILES, [
    'arena-from-scratch/identity.html', 'arena-from-scratch/identity.example.html',
  ]);
  const base = track(mkdtempSync(join(tmpdir(), 'arena-identity-')));
  try {
    mkdirSync(join(base, 'arena-from-scratch'), { recursive: true });
    for (const rel of [...COPIED_FILES, 'arena-from-scratch/AGENTS.md']) writeFileSync(join(base, rel), 'x');
    const declared = treePages(base);
    for (const rel of COPIED_FILES) assert.ok(declared.includes(rel), `${rel} is declared`);
    assert.equal(declared.includes('arena-from-scratch/AGENTS.md'), false);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('the tree carries each page the site declares from arena-from-scratch', () => {
  for (const rel of COPIED_FILES) assert.ok(existsSync(join(repoRoot, rel)), `${rel} exists`);
});

test('the arrangement of chart variants is told from the style plugins by its items, and only it', () => {
  assert.deepEqual(variantSinkNames(), ['charts', 'palettes']);
  assert.ok(sinkNames().includes('charts') && sinkNames().includes('default'));
});

test('pages and indexedDirectories require the output they read and default to none', () => {
  assert.equal(pages.length, 2);
  assert.equal(indexedDirectories.length, 2);
});

test('the site copies the repo sprite, since a page hands it to ArenaIcon by a path relative to itself', () => {
  assert.equal(SPRITE_FILE, 'assets/Icons.generated.svg');
  assert.ok(COPIED.some((tree) => SPRITE_FILE.startsWith(`${tree}/`)), 'no copied tree holds the sprite');
});

const adopterManifest = (over: object = {}) => ({
  arena: '12.1.1', name: 'gallery', title: 'Gallery', description: 'A gallery', repository: 'https://example.org/gallery',
  sections: [{ heading: 'Pages', links: [{ label: 'First', href: 'first/' }] }], ...over,
});

function adopterOut(manifest: object | null, name = 'gallery') {
  const out = track(mkdtempSync(join(tmpdir(), 'arena-adopter-')));
  mkdirSync(join(out, name), { recursive: true });
  if (manifest !== null) writeFileSync(join(out, name, 'arena-adopter.json'), JSON.stringify(manifest));
  return out;
}

test('the module graph is walked from the tree alone, so an adopter page loading a module changes nothing', () => {
  const before = [...modules()];
  const out = adopterOut(adopterManifest());
  mkdirSync(join(out, 'gallery', 'first'), { recursive: true });
  writeFileSync(join(out, 'gallery', 'first', 'index.html'), '<script type="module" src="./entry.js"></script>');
  assert.ok(pages(repoRoot, out).includes('gallery/first/index.html'), 'the output holds the adopter');
  assert.deepEqual(modules(), before);
});

test('an adopter build declaring this tree\'s version is published, and one declaring another is not', () => {
  const dir = join(adopterOut(adopterManifest()), 'gallery');
  assert.equal(adopterVerdict(dir, '12.1.1').publish, true);
  const other = adopterVerdict(dir, '13.0.0');
  assert.equal(other.publish, false);
  assert.match(other.line, /12\.1\.1/);
  assert.match(other.line, /13\.0\.0/);
});

test('no manifest, broken JSON or a missing field is a refusal with a line, never a throw', () => {
  const none = join(adopterOut(null), 'gallery');
  const broken = track(mkdtempSync(join(tmpdir(), 'arena-adopter-')));
  writeFileSync(join(broken, 'arena-adopter.json'), '{ not json');
  const { title: _title, ...missing } = adopterManifest();
  const lacking = join(adopterOut(missing), 'gallery');
  for (const dir of [none, broken, lacking]) {
    const verdict = adopterVerdict(dir, '12.1.1');
    assert.equal(verdict.publish, false);
    assert.ok(verdict.line.includes(dir), verdict.line);
  }
});

test('an href outside the adopter\'s own directory is refused', () => {
  for (const href of ['/abs/', '../up/', 'x', 'a/./', 'a?b/']) {
    const dir = join(adopterOut(adopterManifest({ sections: [{ heading: 'Pages', links: [{ label: 'L', href }] }] })), 'gallery');
    assert.equal(adopterVerdict(dir, '12.1.1').publish, false, href);
  }
});

test('a repository that is not an http(s) address is refused', () => {
  for (const repository of ['', 'javascript:alert(1)', 'example.org/gallery', 'file:///x']) {
    const dir = join(adopterOut(adopterManifest({ repository })), 'gallery');
    assert.equal(adopterVerdict(dir, '12.1.1').publish, false, repository);
  }
});

test('a name that is not a plain directory name is refused', () => {
  for (const name of ['Web Gallery', 'a/b', '']) {
    const dir = join(adopterOut(adopterManifest({ name })), 'gallery');
    assert.equal(adopterVerdict(dir, '12.1.1').publish, false, name);
  }
});

test('the published adopter is read off the output alone', () => {
  assert.equal(publishedAdopter(adopterOut(adopterManifest()))?.name, 'gallery');
  assert.equal(publishedAdopter(adopterOut(adopterManifest({ name: 'other' }))), null);
  assert.equal(publishedAdopter(track(mkdtempSync(join(tmpdir(), 'arena-adopter-')))), null);
  assert.equal(publishedAdopter(join(tmpdir(), 'arena-adopter-absent')), null);
});

test('a directory named for a name the pattern refuses is not a published adopter', () => {
  const out = track(mkdtempSync(join(tmpdir(), 'arena-adopter-')));
  mkdirSync(join(out, 'Web Gallery'), { recursive: true });
  writeFileSync(join(out, 'Web Gallery', 'arena-adopter.json'), JSON.stringify(adopterManifest({ name: 'Web Gallery' })));
  assert.equal(publishedAdopter(out), null);
});

test('an output that is a file, not a directory, publishes no adopter and does not throw', () => {
  const out = track(mkdtempSync(join(tmpdir(), 'arena-adopter-')));
  const file = join(out, 'plain');
  writeFileSync(file, 'x');
  assert.equal(publishedAdopter(file), null);
  assert.deepEqual(adopterPages(file), []);
});

test('an adopter\'s declared pages are its links under its name', () => {
  const out = adopterOut(adopterManifest({
    sections: [{ heading: 'Pages', links: [{ label: 'B', href: 'second/deep/' }, { label: 'A', href: 'first/' }, { label: 'A again', href: 'first/' }] }],
  }));
  assert.deepEqual(adopterPages(out), ['gallery/first/index.html', 'gallery/second/deep/index.html']);
  assert.deepEqual(adopterDirectories(out), ['gallery']);
  const empty = track(mkdtempSync(join(tmpdir(), 'arena-adopter-')));
  assert.deepEqual(adopterPages(empty), []);
  assert.deepEqual(adopterDirectories(empty), []);
});
