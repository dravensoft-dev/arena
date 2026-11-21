/* lineOf answers the number a reader opens the file at, so the first line is 1 and an offset
 * inside a line still belongs to it. The glob claims are the two the unification rests on: a
 * pattern with no `**` builds exactly what the narrower copy built, and a `*` stops at a
 * separator, which is what keeps ./css/* from reaching a file one directory down. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeRegExp, globToRegExp, lineOf } from './text.ts';

test('the first line is 1, and an offset inside a line belongs to that line', () => {
  const text = 'one\ntwo\nthree';
  assert.equal(lineOf(text, 0), 1);
  assert.equal(lineOf(text, 2), 1);
  assert.equal(lineOf(text, 4), 2);
  assert.equal(lineOf(text, text.length), 3);
});

test('escapeRegExp neutralises what a path or a pattern may hold', () => {
  assert.equal(escapeRegExp('a.b+c'), 'a\\.b\\+c');
  assert.match('a.b+c', new RegExp(`^${escapeRegExp('a.b+c')}$`));
  assert.doesNotMatch('axbxc', new RegExp(`^${escapeRegExp('a.b+c')}$`),
    'an unescaped dot would match any character, which is how a glob quietly matches too much');
});

test('a star stops at a separator, which is what a package export target means by one', () => {
  const rx = globToRegExp('css/components/*');
  assert.equal(rx.test('css/components/arena-badge.css'), true);
  assert.equal(rx.test('css/components/nested/arena-badge.css'), false);
  assert.equal(globToRegExp('css/*').test('css/components/arena-badge.css'), false);
});

test('a double star crosses separators, and a pattern without one reduces to the narrower build', () => {
  assert.equal(globToRegExp('frameworks/**/*.generated.js').test('frameworks/react/a.generated.js'), true);
  assert.equal(globToRegExp('frameworks/**/*.generated.js').test('frameworks/a/b/c.generated.js'), true);
  assert.equal(globToRegExp('a/**/*.generated.js').test('a/B.generated.js'), true);
  assert.equal(globToRegExp('a*b').source, '^a[^/]*b$',
    'no ** means one part, so the wider builder is the narrower one and the unification costs nothing');
});
