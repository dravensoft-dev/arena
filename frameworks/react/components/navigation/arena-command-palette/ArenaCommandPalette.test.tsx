import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIcons, symbols } from '../../../test/IconsHarness.tsx';
import React from 'react';
import { ArenaCommandPalette } from './ArenaCommandPalette.tsx';

test('a closed palette renders nothing', () => {
  assert.equal(renderIcons(<ArenaCommandPalette open={false} commands={[]} />), '');
});

test('an open palette draws each command with its icon class, label and shortcut', () => {
  const html = renderIcons(
    <ArenaCommandPalette open commands={[{ id: 'new', label: 'New project', icon: 'ph-bold ph-plus', shortcut: 'N' }]} />,
  );
  assert.deepEqual(symbols(html).filter((id) => id === 'bold-plus'), ['bold-plus'], 'the icon is drawn from the class name');
  assert.ok(html.includes('New project'), 'the label is rendered');
  assert.ok(html.includes('>N<'), 'the shortcut is rendered at the row\'s trailing edge');
  assert.ok(html.includes('role="dialog"'), 'the combobox binding\'s dialog element is intact');
});

test('an absent required member throws rather than rendering', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderIcons(<ArenaCommandPalette commands={[]} />), /`open` is required/);
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderIcons(<ArenaCommandPalette open commands={undefined} />), /`commands` is required/);
});

test('the active row is the one the arrow keys point at, and it takes the accent branch of the recipe', () => {
  const html = renderIcons(
    <ArenaCommandPalette open commands={[{ id: 'a', label: 'Deploy' }, { id: 'b', label: 'Roll back' }]} />,
  );
  assert.match(html, /aria-selected="true"[^>]*data-arena-part="command-palette.row"[^>]*\bdata-arena-active=""/,
    'the first row is active on open and wears the accent tint');
  assert.equal((html.match(/data-arena-part="command-palette.row"[^>]*\bdata-arena-active=""/g) || []).length, 1, 'more than one row was drawn as active');
  assert.match(html, /data-arena-part="command-palette.row"(?:(?!data-arena-active=)[^>])*>/, 'and the other row takes the quiet branch');
});

test('the active row and its label are the active group of the row and rowLabel slots', () => {
  const html = renderIcons(
    <ArenaCommandPalette open commands={[{ id: 'a', label: 'Deploy' }, { id: 'b', label: 'Roll back' }]} />,
  );
  assert.equal((html.match(/data-arena-part="command-palette.row-label"[^>]*\bdata-arena-active=""/g) || []).length, 1);
  assert.match(html, /data-arena-part="command-palette.row-label"(?:(?!data-arena-active=)[^>])*>/);
});

test('the escape cap and every shortcut are kbd elements, printed as given', () => {
  const html = renderIcons(
    <ArenaCommandPalette open commands={[{ id: 'deploy', label: 'Deploy to production', shortcut: '⌘D' }]} />,
  );
  assert.match(html, /<kbd [^>]*data-arena-part="command-palette\.esc"[^>]*>ESC<\/kbd>/,
    'the escape cap is a span, so the one cap Arena already drew is not keyboard input to a reader');
  assert.match(html, /<kbd [^>]*data-arena-part="command-palette\.shortcut"[^>]*>⌘D<\/kbd>/,
    'the shortcut is a span, or it was split: the string is printed whole, as the type field holds it');
});

test('the empty line sits in the panel after the listbox, not inside it', () => {
  const html = renderIcons(<ArenaCommandPalette open commands={[]} />);
  const voids = new Set(['input', 'br', 'img', 'hr', 'meta', 'link']);
  const stack: string[] = [];
  let parentOfEmpty: string | null = null;
  let emptyInListbox = false;
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*)>/g)) {
    const close = m[1] ?? '';
    const tag = m[2] ?? '';
    const attrs = m[3] ?? '';
    if (close) { stack.pop(); continue; }
    if (/data-arena-part="command-palette\.empty"/.test(attrs)) {
      parentOfEmpty = stack[stack.length - 1] ?? null;
      emptyInListbox = stack.some((open) => /role="listbox"/.test(open));
    }
    if (!attrs.endsWith('/') && !voids.has(tag.toLowerCase())) stack.push(attrs);
  }
  assert.ok(parentOfEmpty !== null, 'no empty line was drawn');
  assert.match(parentOfEmpty ?? '', /data-arena-part="command-palette\.panel"/, 'the empty line\'s parent is not the panel');
  assert.equal(emptyInListbox, false, 'the listbox holds the empty line');
});
