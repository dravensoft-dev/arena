/* Covers markdown-prose.ts. The interesting cases are the two a regex gets
 * wrong: a code span that closes lines below where it opened, and a fence that
 * only a longer-or-equal run of its own character closes. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { proseSegments, fencedLines } from './markdown-prose.ts';

const texts = (source: string) => proseSegments(source).map((s) => s.text);

test('a plain paragraph is one segment per line', () => {
  assert.deepEqual(proseSegments('one\ntwo\n'), [
    { line: 1, column: 1, text: 'one' },
    { line: 2, column: 1, text: 'two' },
  ]);
});

test('a blank line yields no segment', () => {
  assert.deepEqual(texts('one\n\n\ntwo\n'), ['one', 'two']);
});

test('an inline code span is skipped and the prose around it survives', () => {
  assert.deepEqual(texts('call `a — b` now'), ['call ', ' now']);
});

test('a segment carries the column it starts at', () => {
  const after = proseSegments('call `code` now').at(-1);
  assert.deepEqual(after, { line: 1, column: 12, text: ' now' });
});

test('a code span closes only on a run of its own length', () => {
  assert.deepEqual(texts('``a ` b`` tail'), [' tail']);
});

test('a code span that closes on a later line takes the lines between it', () => {
  assert.deepEqual(texts('lead `open\nmiddle — here\nclose` tail'), ['lead ', ' tail']);
});

test('an unclosed backtick is literal prose, not an open span', () => {
  assert.deepEqual(texts('a lone ` backtick — here'), ['a lone ` backtick — here']);
});

test('a code span never crosses a blank line', () => {
  assert.deepEqual(texts('open `here\n\nprose — kept`\n'), ['open `here', 'prose — kept`']);
});

test('a fenced block is skipped, fences included', () => {
  assert.deepEqual(texts('lead\n```js\ncode — here\n```\ntail\n'), ['lead', 'tail']);
});

test('a tilde fence is a fence', () => {
  assert.deepEqual(texts('lead\n~~~\ncode — here\n~~~\ntail\n'), ['lead', 'tail']);
});

test('a fence is closed only by its own character', () => {
  assert.deepEqual(texts('```\ncode\n~~~\nstill — code\n```\ntail\n'), ['tail']);
});

test('a shorter run does not close a longer fence', () => {
  assert.deepEqual(texts('````\ncode\n```\nstill — code\n````\ntail\n'), ['tail']);
});

test('a longer run closes a shorter fence', () => {
  assert.deepEqual(texts('```\ncode\n`````\ntail — here\n'), ['tail — here']);
});

test('an unterminated fence swallows the rest of the document', () => {
  assert.deepEqual(texts('lead\n```\ncode — here\nmore\n'), ['lead']);
});

test('a fence indented four or more spaces is not a fence', () => {
  assert.deepEqual(texts('    ```\n'), ['    ```']);
});

test('backticks inside a fenced block never open a span outside it', () => {
  assert.deepEqual(texts('```\na ` b\n```\ntail — here\n'), ['tail — here']);
});

test('a line inside a table keeps its cells as prose', () => {
  assert.deepEqual(texts('| `a` | b — c |'), ['| ', ' | b — c |']);
});

test('a segment reports the line it starts on after a fenced block', () => {
  assert.deepEqual(proseSegments('```\nx\n```\ntail'), [{ line: 4, column: 1, text: 'tail' }]);
});

test('an empty document yields nothing', () => {
  assert.deepEqual(proseSegments(''), []);
});

test('a fenced block yields its own lines, and the fences themselves are not among them', () => {
  assert.deepEqual(fencedLines('lead\n```html\n<x />\n```\ntail'), [{ line: 3, text: '<x />' }]);
});

test('a code span is not a fenced line, which is how a foil survives its own rule', () => {
  assert.deepEqual(fencedLines('that is `MatDialog` wearing Arena'), []);
});

test('a fence closes only on a run of its own character at least as long', () => {
  assert.deepEqual(fencedLines('````\n```\nstill code\n````\nout'), [
    { line: 2, text: '```' },
    { line: 3, text: 'still code' },
  ]);
});

test('an unclosed fence runs to the end of the document', () => {
  assert.deepEqual(fencedLines('```\na\nb'), [{ line: 2, text: 'a' }, { line: 3, text: 'b' }]);
});

test('a document with no fence yields no lines', () => {
  assert.deepEqual(fencedLines('one\ntwo'), []);
});
