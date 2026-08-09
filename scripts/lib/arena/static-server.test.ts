import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, posix, win32 } from 'node:path';
import { contentType, resolveInRoot, startStaticServer } from './static-server.ts';

test('contentType maps the extensions the demo pages actually load', () => {
  assert.equal(contentType('/a/b.html'), 'text/html; charset=utf-8');
  assert.equal(contentType('/a/b.css'), 'text/css; charset=utf-8');
  assert.equal(contentType('/a/b.js'), 'text/javascript; charset=utf-8');
  assert.equal(contentType('/a/ArenaButton.jsx'), 'text/javascript; charset=utf-8');
  assert.equal(contentType('/a/tokens.json'), 'application/json; charset=utf-8');
  assert.equal(contentType('/a/mark.svg'), 'image/svg+xml');
  assert.equal(contentType('/a/face.woff2'), 'font/woff2');
});

test('contentType falls back to octet-stream for anything unlisted', () => {
  assert.equal(contentType('/a/b.bin'), 'application/octet-stream');
  assert.equal(contentType('/a/LICENSE'), 'application/octet-stream');
});

test('resolveInRoot resolves a normal path inside the root', () => {
  assert.equal(resolveInRoot('/repo', '/guidelines/icons.html', posix), '/repo/guidelines/icons.html');
});

test('resolveInRoot decodes percent-escapes, as the page URLs carry them', () => {
  assert.equal(resolveInRoot('/repo', '/Arena%20-%20Overview.html', posix), '/repo/Arena - Overview.html');
});

test('resolveInRoot refuses a path that escapes the root', () => {
  assert.equal(resolveInRoot('/repo', '/../../etc/passwd', posix), null);
});

test('the server serves a file, 404s a missing one, and stops cleanly', async () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-static-'));
  mkdirSync(join(root, 'sub'));
  writeFileSync(join(root, 'sub', 'page.html'), '<!doctype html><p>hi</p>');

  const server = await startStaticServer(root);
  assert.ok(server.port > 0);

  const ok = await fetch(`http://127.0.0.1:${server.port}/sub/page.html`);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.match(await ok.text(), /<p>hi<\/p>/);

  const missing = await fetch(`http://127.0.0.1:${server.port}/sub/nope.html`);
  assert.equal(missing.status, 404);
  await missing.text();

  await server.close();
});

test('a root given with a trailing slash still serves, rather than 403ing everything', () => {
  assert.equal(resolveInRoot('/repo/', '/guidelines/icons.html', posix), '/repo/guidelines/icons.html');
});

test('a sibling directory whose name merely starts with the root name is not inside it', () => {
  assert.equal(resolveInRoot('/repo', '/../repo-evil/x.html', posix), null);
});

test('a windows root resolves a nested page rather than refusing every one of them', () => {
  assert.equal(resolveInRoot('C:\\repo', '/guidelines/icons.html', win32),
    'C:\\repo\\guidelines\\icons.html',
    'the spelling this replaced compared startsWith(base + "/"), and resolve() hands back '
    + 'backslashes, so every nested request 403ed and the four gates that drive a browser '
    + 'through this server had nothing to load');
});

test('a windows root refuses the same escapes, spelled either way', () => {
  assert.equal(resolveInRoot('C:\\repo', '/../../Windows/System32/x', win32), null);
  assert.equal(resolveInRoot('C:\\repo', '/..\\..\\Windows\\x', win32), null,
    'a backslash reaches the pathname as a literal, so the leading-separator strip and the '
    + 'containment check both have to read it as a separator');
  assert.equal(resolveInRoot('C:\\repo', '/../repo-evil/x.html', win32), null);
});

test('a pathname that does not decode is a refusal and never a thrown request', () => {
  assert.equal(resolveInRoot('/repo', '/%ZZ'), null,
    'decodeURIComponent throws on a malformed escape, and serve.ts called it outside a try, '
    + 'so a client could take the dev server down with one request');
});
