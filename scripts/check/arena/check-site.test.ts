/* The gate reads a built output, so these drive its pure halves over trees written here: the
 * broken href that renders anyway, the declared page a build dropped, the page nobody declared,
 * the sitemap that forgot one, and a CNAME for another domain. The link half is the one that
 * matters, and its cases are the four shapes a static host answers differently from serve.ts: a
 * relative path, a root-relative one, a directory that has an index, and one that does not. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  REFERENCE, OFF_SITE, AUTHORED, FORBIDDEN, referenced, resolves, htmlFiles,
  brokenLinkProblems, domainProblems, localhostProblems, zeroScanProblems, tokenProblems,
  missingModuleProblems,
} from './check-site.ts';
import { DOMAIN, modules } from '../../lib/arena/site-pages.ts';

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
  assert.deepEqual(AUTHORED, ['index.html', '404.html', 'og.html']);
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
