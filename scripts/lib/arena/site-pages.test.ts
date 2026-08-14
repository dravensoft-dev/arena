/* The manifest reads the real tree, so these hold the parts a mistake would move quietly: the
 * kebab normalisation that lets two layers keying the same map differently be compared at all,
 * the specimen with no <title>, and the URL of a page whose name carries a space. The absence
 * check is the reason the module exists, so it is asserted against the tree rather than a stub. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DOMAIN, SITE_DIR, LAYERS, PHOSPHOR_KEEP, phosphorKeeps, extensions, entryPoints, components,
  playgroundsOnDisk, missingPlaygrounds, sinkPages, pages, indexedDirectories, titleOf, url,
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

test('the voices come from the contracts, so a voice added tomorrow is published without an edit', () => {
  const found = extensions();
  assert.ok(found.includes('none'), 'the default voice is one of them');
  assert.equal(new Set(found).size, found.length, 'and none of them is counted twice');
});

test('every component the packages ship draws a playground, in both layers', () => {
  assert.deepEqual(missingPlaygrounds(), []);
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

test('a sink stands for every layer times every voice, and the list has no repeat in it', () => {
  const sinks = sinkPages();
  assert.equal(sinks.length, LAYERS.length * extensions().length);
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
