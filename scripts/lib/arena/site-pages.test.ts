/* The manifest reads the real tree, so these hold the parts a mistake would move quietly: the
 * kebab normalisation that lets two layers keying the same map differently be compared at all,
 * the specimen with no <title>, and the URL of a page whose name carries a space. The absence
 * check is the reason the module exists, so it is asserted against the tree rather than a stub. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './repo-root.ts';
import {
  DOMAIN, SITE_DIR, LAYERS, PHOSPHOR_KEEP, phosphorKeeps, sinkNames, entryPoints, components,
  playgroundsOnDisk, missingPlaygrounds, playgroundSections, sinkPages, pages, indexedDirectories,
  modules, missingModules, titleOf, url, directoryUrl,
} from './site-pages.ts';

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

test('the graph reaches past the entry beside the page, which is where it used to stop', () => {
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
  const all = pages();
  assert.equal(new Set(all).size, all.length);
});

test('a directory a visitor can land on gets an index, since serve.ts lists it and a host does not', () => {
  const directories = indexedDirectories();
  assert.ok(directories.includes(''), 'the site root is one of them');
  assert.ok(directories.includes('intro/guidelines'));
  assert.equal(new Set(directories).size, directories.length);
});

test('a specimen with no title is named by its @dsCard header rather than by its filename', () => {
  const specimen = pages().find((rel) => rel.startsWith('intro/guidelines/'));
  assert.ok(specimen, 'the guidelines publish at least one specimen');
  assert.ok(!titleOf(specimen).endsWith('.html'), `${specimen} fell back to its filename`);
});

test('only the sheet and the font binaries of a Phosphor weight travel, never the sources', () => {
  assert.deepEqual(PHOSPHOR_KEEP, ['style.css', '.woff2', '.woff']);
  assert.ok(phosphorKeeps('style.css'));
  assert.ok(phosphorKeeps('Phosphor-Bold.woff2'));
  assert.ok(!phosphorKeeps('Phosphor-Bold.ttf'));
  assert.ok(!phosphorKeeps('selection.json'));
  assert.ok(!phosphorKeeps('style.css.map'));
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
  const published = new Set(pages().map((rel) => `/${rel}`));
  const indexed = new Set(indexedDirectories().map((dir) => (dir === '' ? '/' : `/${dir}/`)));
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
  for (const directory of indexedDirectories()) assert.match(directoryUrl(directory), /\/$/);
});
