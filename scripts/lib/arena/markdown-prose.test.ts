/* Covers markdown-prose.ts. The interesting cases are the two a regex gets
 * wrong: a code span that closes lines below where it opened, and a fence that
 * only a longer-or-equal run of its own character closes. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { proseSegments, fencedLines } from './markdown-prose.ts';

const texts = (source: string) => proseSegments(source).map((s) => s.text);

const SPANS: { name: string; read: (source: string) => unknown; source: string; expected: unknown }[] = [
  {
    name: 'a plain paragraph is one segment per line',
    read: proseSegments,
    source: 'one\ntwo\n',
    expected: [
      { line: 1, column: 1, text: 'one' },
      { line: 2, column: 1, text: 'two' },
    ],
  },
  { name: 'a blank line yields no segment', read: texts, source: 'one\n\n\ntwo\n', expected: ['one', 'two'] },
  {
    name: 'an inline code span is skipped and the prose around it survives',
    read: texts,
    source: 'call `a — b` now',
    expected: ['call ', ' now'],
  },
  {
    name: 'a segment carries the column it starts at',
    read: (source) => proseSegments(source).at(-1),
    source: 'call `code` now',
    expected: { line: 1, column: 12, text: ' now' },
  },
  { name: 'a code span closes only on a run of its own length', read: texts, source: '``a ` b`` tail', expected: [' tail'] },
  {
    name: 'a code span that closes on a later line takes the lines between it',
    read: texts,
    source: 'lead `open\nmiddle — here\nclose` tail',
    expected: ['lead ', ' tail'],
  },
  {
    name: 'an unclosed backtick is literal prose, not an open span',
    read: texts,
    source: 'a lone ` backtick — here',
    expected: ['a lone ` backtick — here'],
  },
  {
    name: 'a code span never crosses a blank line',
    read: texts,
    source: 'open `here\n\nprose — kept`\n',
    expected: ['open `here', 'prose — kept`'],
  },
  {
    name: 'a line inside a table keeps its cells as prose',
    read: texts,
    source: '| `a` | b — c |',
    expected: ['| ', ' | b — c |'],
  },
  { name: 'an empty document yields nothing', read: proseSegments, source: '', expected: [] },
];

test('a prose segment is the text a code span leaves, with the line and column it starts at', () => {
  assert.ok(SPANS.length > 0, 'the table has rows');
  for (const row of SPANS) assert.deepEqual(row.read(row.source), row.expected, row.name);
});

const FENCES: { name: string; read: (source: string) => unknown; source: string; expected: unknown }[] = [
  { name: 'a fenced block is skipped, fences included', read: texts, source: 'lead\n```js\ncode — here\n```\ntail\n', expected: ['lead', 'tail'] },
  { name: 'a tilde fence is a fence', read: texts, source: 'lead\n~~~\ncode — here\n~~~\ntail\n', expected: ['lead', 'tail'] },
  { name: 'a fence is closed only by its own character', read: texts, source: '```\ncode\n~~~\nstill — code\n```\ntail\n', expected: ['tail'] },
  { name: 'a shorter run does not close a longer fence', read: texts, source: '````\ncode\n```\nstill — code\n````\ntail\n', expected: ['tail'] },
  { name: 'a longer run closes a shorter fence', read: texts, source: '```\ncode\n`````\ntail — here\n', expected: ['tail — here'] },
  { name: 'an unterminated fence swallows the rest of the document', read: texts, source: 'lead\n```\ncode — here\nmore\n', expected: ['lead'] },
  { name: 'a fence indented four or more spaces is not a fence', read: texts, source: '    ```\n', expected: ['    ```'] },
  { name: 'backticks inside a fenced block never open a span outside it', read: texts, source: '```\na ` b\n```\ntail — here\n', expected: ['tail — here'] },
  {
    name: 'a segment reports the line it starts on after a fenced block',
    read: proseSegments,
    source: '```\nx\n```\ntail',
    expected: [{ line: 4, column: 1, text: 'tail' }],
  },
  {
    name: 'a fenced block yields its own lines, and the fences themselves are not among them',
    read: fencedLines,
    source: 'lead\n```html\n<x />\n```\ntail',
    expected: [{ line: 3, text: '<x />' }],
  },
  {
    name: 'a code span is not a fenced line, which is how a foil survives its own rule',
    read: fencedLines,
    source: 'that is `MatDialog` wearing Arena',
    expected: [],
  },
  {
    name: 'a fence closes only on a run of its own character at least as long',
    read: fencedLines,
    source: '````\n```\nstill code\n````\nout',
    expected: [
      { line: 2, text: '```' },
      { line: 3, text: 'still code' },
    ],
  },
  {
    name: 'an unclosed fence runs to the end of the document',
    read: fencedLines,
    source: '```\na\nb',
    expected: [{ line: 2, text: 'a' }, { line: 3, text: 'b' }],
  },
  { name: 'a document with no fence yields no lines', read: fencedLines, source: 'one\ntwo', expected: [] },
];

test('a fence hides what it holds, and closes only on a run of its own character at least as long', () => {
  assert.ok(FENCES.length > 0, 'the table has rows');
  for (const row of FENCES) assert.deepEqual(row.read(row.source), row.expected, row.name);
});
