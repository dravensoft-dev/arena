/* The gate reads a built output, so these drive its pure halves over trees written here: the
 * broken href that renders anyway, the declared page a build dropped, the page nobody declared,
 * the sitemap that forgot one, and a CNAME for another domain. The link half is the one that
 * matters, and its cases are the four shapes a static host answers differently from serve.ts: a
 * relative path, a root-relative one, a directory that has an index, and one that does not. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import {
  REFERENCE, OFF_SITE, AUTHORED, FORBIDDEN, referenced, resolves, htmlFiles,
  brokenLinkProblems, domainProblems, localhostProblems, zeroScanProblems, tokenProblems,
  missingModuleProblems, canonicalProblems, ownUrl, located, sitemapProblems, benchProblems,
} from './check-site.ts';
import {
  DOMAIN, BENCHES_DIR, BENCHES_MANIFEST, modules, pages, indexedDirectories,
} from '../../lib/arena/site-pages.ts';

function benchOut(halves: Record<string, string[]>) {
  const files: Record<string, string> = {
    [`${BENCHES_DIR}/${BENCHES_MANIFEST}`]: JSON.stringify({
      arena: '10.2.1',
      pairs: Object.keys(halves).map((product) => ({ product, skin: product })),
    }),
  };
  for (const [product, layers] of Object.entries(halves)) {
    for (const layer of layers) {
      files[`${BENCHES_DIR}/${product}/${layer}/index.html`] = '<html><head><base href="./"></head></html>';
    }
  }
  return out(files);
}

function out(files: Record<string, string>) {
  const base = mkdtempSync(join(tmpdir(), 'arena-site-'));
  for (const [rel, text] of Object.entries(files) as [string, string][]) {
    const path = join(base, rel);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, text);
  }
  return base;
}

test('a reference is every href and src the page carries, and nothing that leaves the site', () => {
  const html = '<link href="a.css"><script src="b.js"></script>'
    + '<a href="https://example.com/x">out</a><a href="#top">anchor</a>'
    + '<img src="data:image/png;base64,AAAA"><a href="mailto:x@y.z">mail</a>';
  assert.deepEqual(referenced(html), ['a.css', 'b.js']);
  for (const off of ['https://x/y', 'http://x', 'mailto:a@b', 'data:x', '#top', '//cdn/x']) {
    assert.ok(OFF_SITE.test(off), `${off} is off the site`);
  }
  assert.ok(REFERENCE.global, 'the pattern has to be global or it finds one link per page');
});

test('a relative path resolves against the page, and a root-relative one against the site', () => {
  const base = out({ 'a/b/page.html': 'x', 'a/style.css': 'y', 'top.css': 'z' });
  const page = join(base, 'a/b/page.html');
  assert.ok(resolves(base, page, '../style.css'));
  assert.ok(resolves(base, page, '/top.css'));
  assert.ok(!resolves(base, page, '../missing.css'));
});

test('a directory resolves only when an index stands in it, which is the shape a static host breaks', () => {
  const base = out({ 'page.html': 'x', 'listed/index.html': 'i', 'bare/thing.txt': 't' });
  const page = join(base, 'page.html');
  assert.ok(resolves(base, page, 'listed/'), 'a directory with an index is a page');
  assert.ok(!resolves(base, page, 'bare/'),
    'a directory without one is a listing serve.ts makes at request time and a host answers 404');
});

test('a path climbing out of the output never resolves, however many levels it takes', () => {
  const base = out({ 'a/page.html': 'x' });
  assert.ok(!resolves(base, join(base, 'a/page.html'), '../../../etc/passwd'));
});

test('a query and a fragment are not part of the file name', () => {
  const base = out({ 'page.html': 'x', 'style.css': 'y' });
  const page = join(base, 'page.html');
  assert.ok(resolves(base, page, 'style.css?v=2'));
  assert.ok(resolves(base, page, 'style.css#top'));
});

test('an escaped space resolves, because a page names a file the way a URL spells it', () => {
  const base = out({ 'page.html': 'x', 'Arena - Overview.html': 'y' });
  assert.ok(resolves(base, join(base, 'page.html'), 'Arena%20-%20Overview.html'));
});

test('a broken href is reported with why nothing else would have caught it', () => {
  const base = out({ 'page.html': '<link href="gone.css">' });
  const problems = brokenLinkProblems(base);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /fails silently in both directions/);
});

test('a CNAME for another domain is a site built for somewhere it will not be served', () => {
  assert.deepEqual(domainProblems(out({ CNAME: `${DOMAIN}\n` })), []);
  assert.equal(domainProblems(out({ CNAME: 'somewhere.else\n' })).length, 1);
  assert.equal(domainProblems(out({ 'page.html': 'x' })).length, 1, 'and no CNAME at all is one too');
});

test('an address that resolves on the build machine and nowhere a reader is fails', () => {
  for (const forbidden of FORBIDDEN) {
    const base = out({ 'page.html': `<a href="x">${forbidden}</a>` });
    assert.equal(localhostProblems(base).length, 1, `${forbidden} is caught`);
  }
});

test('a custom property nothing defines renders unstyled while every link still answers 200', () => {
  const base = out({
    'index.html': '<main style="padding:var(--sp-6)">x</main>',
    'tokens.css': ':root{--sp-6: 24px}',
  });
  assert.deepEqual(tokenProblems(base), [], 'a property the output defines is fine');

  const bad = out({
    'index.html': '<main style="padding:var(--sp-7)">x</main>',
    'tokens.css': ':root{--sp-6: 24px}',
  });
  const problems = tokenProblems(bad);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /renders unstyled/);
});

test('the token check reads the pages this build authors, and not the ones it copies', () => {
  const base = out({
    'copied/page.html': '<main style="color:var(--invented)">x</main>',
    'tokens.css': ':root{--real: 1px}',
  });
  assert.deepEqual(tokenProblems(base), [],
    'a page Arena generated elsewhere is held by the gate that generated it');
});

test('the pages this gate authors are the ones nothing else declares', () => {
  assert.deepEqual(AUTHORED, ['index.html', '404.html', 'og.html', 'hero.html']);
});

test('an empty walk is a clean-looking pass over an output nobody opened', () => {
  assert.equal(zeroScanProblems([]).length, 1);
  assert.deepEqual(zeroScanProblems(['page.html']), []);
  assert.deepEqual(htmlFiles(join(tmpdir(), 'arena-site-that-is-not-there')), []);
});

test('a module a page imports and the output dropped is a problem, and an empty output is all of them', () => {
  const empty = out({ 'placeholder.txt': 'x' });
  assert.deepEqual(missingModuleProblems(empty, empty), [],
    'a tree with no page imports nothing, so nothing is missing from an output carrying nothing');

  const problems = missingModuleProblems(empty);
  assert.equal(problems.length, modules().length,
    'an output carrying none of the graph is a problem per module and never a clean pass');
  assert.match(problems[0] ?? '', /renders nothing at all/,
    'the line has to say what a reader sees, since every href on that page still answers 200');
});

test('a directory index is addressed by its directory, and every other page by its own path', () => {
  assert.equal(ownUrl('index.html'), `https://${DOMAIN}/`);
  assert.equal(ownUrl('intro/guidelines/index.html'), `https://${DOMAIN}/intro/guidelines/`);
  assert.equal(ownUrl('intro/Arena - Overview.html'), `https://${DOMAIN}/intro/Arena%20-%20Overview.html`);
});

test('a page pointing its canonical at another page is the shape every index page shipped in', () => {
  const canonical = (href: string) => `<html><head><link rel="canonical" href="${href}"></head></html>`;
  const base = out({
    'intro/guidelines/index.html': canonical(`https://${DOMAIN}/`),
    'index.html': canonical(`https://${DOMAIN}/`),
  });
  const problems = canonicalProblems(base);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /intro\/guidelines\/index\.html/);
  assert.match(problems[0] ?? '', /not its own address/);
});

test('a page declaring no canonical is not a page declaring the wrong one, which is what a 404 owes', () => {
  const base = out({ '404.html': '<html><head><meta name="robots" content="noindex"></head></html>' });
  assert.deepEqual(canonicalProblems(base), []);
});

test('the sitemap owes the index pages a visitor lands on, and not only the leaves under them', () => {
  const every = located();
  for (const directory of indexedDirectories()) assert.ok(every.includes(directory === '' ? `https://${DOMAIN}/` : `https://${DOMAIN}/${directory}/`));
  assert.equal(every.length, indexedDirectories().length + pages().length);
});

test('a sitemap naming a longer path does not stand in for the directory above it', () => {
  const entry = (loc: string) => `<url><loc>${loc}</loc></url>`;
  const base = out({
    'sitemap.xml': `<urlset>${located().filter((loc) => loc !== `https://${DOMAIN}/intro/guidelines/`).map(entry).join('')}</urlset>`,
  });
  const problems = sitemapProblems(base);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /intro\/guidelines\//);
});

test('an output declaring pairs and carrying every half of them is the passing shape', () => {
  const base = benchOut({ etsy: ['react', 'angular'], notion: ['react', 'angular'] });
  assert.deepEqual(benchProblems(base), []);
});

test('an output declaring none and carrying none passes, which is what a clone builds', () => {
  assert.deepEqual(benchProblems(out({ 'index.html': '<html></html>' })), [],
    'a developer run has no benches, so the absent case is the one this must not turn red');
});

test('a declared half with nothing behind it fails, which is how fifteen reads', () => {
  const base = benchOut({ etsy: ['react'], notion: ['react', 'angular'] });
  const problems = benchProblems(base);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /web-benches\/etsy\/angular\/index\.html/);
  assert.match(problems[0] ?? '', /nothing to compare/);
});

test('a half nothing declares fails, since the index links every pair it knows', () => {
  const base = benchOut({ etsy: ['react', 'angular'] });
  mkdirSync(join(base, BENCHES_DIR, 'clickup', 'react'), { recursive: true });
  writeFileSync(join(base, BENCHES_DIR, 'clickup', 'react', 'index.html'), '<html></html>');
  const problems = benchProblems(base);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /clickup\/react/);
});

test('applications with no manifest beside them is the asymmetry this closes', () => {
  const base = benchOut({ etsy: ['react', 'angular'] });
  rmSync(join(base, BENCHES_DIR, BENCHES_MANIFEST));
  assert.equal(benchProblems(base).length, 2,
    'a copy that landed without its manifest declares nothing and carries two halves, and without '
    + 'this the absent case passes by proving nothing');
});

test('a bench half is declared as a page, so the orphan check does not meet it as one', () => {
  const base = benchOut({ etsy: ['react', 'angular'] });
  const declared = pages(repoRoot, base);
  assert.ok(declared.includes('web-benches/etsy/react/index.html'));
  assert.ok(indexedDirectories(repoRoot, base).includes(BENCHES_DIR));
});
