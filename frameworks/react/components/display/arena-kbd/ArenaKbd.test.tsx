/* A key is named, never bound, so the markup is the whole question: one <kbd> for the combination
 * and one inside it per key, which is how HTML spells a key as it appears on a keyboard, the
 * separator drawn between caps and never heard, and a label that replaces the caps for a reader
 * when their glyphs would be read badly. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaKbd } from './ArenaKbd.tsx';

const render = (element: React.ReactElement) => renderToStaticMarkup(element);
const caps = (html: string) => [...html.matchAll(/<kbd[^>]*data-arena-part="kbd\.key"[^>]*>([^<]*)<\/kbd>/g)].map((m) => m[1]);

test('one key is an outer kbd holding one inner kbd', () => {
  const html = render(<ArenaKbd keys={['Esc']} />);
  assert.match(html, /^<kbd [^>]*data-arena-part="kbd"[^>]*><kbd [^>]*data-arena-part="kbd\.key"[^>]*>Esc<\/kbd><\/kbd>$/,
    'one structure for any length: the combination, then a cap per key');
  assert.doesNotMatch(html, /data-arena-part="kbd\.separator"/, 'a separator is drawn between caps, never before the first');
});

test('a combination draws its caps in the order pressed, with the separator between them and hidden', () => {
  const html = render(<ArenaKbd keys={['Ctrl', 'Shift', 'P']} />);
  assert.deepEqual(caps(html), ['Ctrl', 'Shift', 'P'], 'each key is one text run of its own, in order');
  const separators = [...html.matchAll(/<span aria-hidden="true"[^>]*data-arena-part="kbd\.separator"[^>]*>\+<\/span>/g)];
  assert.equal(separators.length, 2, 'a reader hears the keys, not the plus signs between them');
});

test('an empty separator glues the caps, as a Mac shortcut is printed', () => {
  const html = render(<ArenaKbd keys={['⌘', 'K']} separator="" />);
  assert.deepEqual(caps(html), ['⌘', 'K']);
  assert.doesNotMatch(html, /kbd\.separator/);
});

test('a label hides the caps from a reader and is the one spoken text', () => {
  const html = render(<ArenaKbd keys={['⌘', 'K']} label="Command K" />);
  const hidden = [...html.matchAll(/<kbd aria-hidden="true"[^>]*data-arena-part="kbd\.key"/g)];
  assert.equal(hidden.length, 2, 'a cap left audible is read twice, once as a glyph and once as the label');
  assert.match(html, /<span class="[^"]*" data-arena-part="kbd\.name"[^>]*>Command K<\/span>/);
  assert.doesNotMatch(render(<ArenaKbd keys={['K']} />), /aria-hidden="true"[^>]*data-arena-part="kbd\.key"/,
    'with no label the caps are what a reader hears, so none of them is hidden');
});

test('a blank label is no label, so the caps stay audible and no name is drawn', () => {
  const html = render(<ArenaKbd keys={['⌘', 'K']} label="  " />);
  assert.doesNotMatch(html, /aria-hidden="true"[^>]*data-arena-part="kbd\.key"/, 'a blank label hid every cap behind an empty name');
  assert.doesNotMatch(html, /kbd\.name/);
});

test('an empty list and a blank entry are refused, because a cap with nothing on it is not a key', () => {
  assert.throws(() => render(<ArenaKbd keys={[]} />), /^Error: ArenaKbd: `keys` is required/);
  assert.throws(() => render(<ArenaKbd keys={['Ctrl', '  ']} />), /^Error: ArenaKbd: `keys` is required/);
  // @ts-expect-error the contract requires it, and the guard is what this asserts
  assert.throws(() => render(<ArenaKbd />), /^Error: ArenaKbd: `keys` is required/);
});
