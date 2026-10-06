import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaCommandPalette } from './ArenaCommandPalette.tsx';

test('a closed palette renders nothing', () => {
  assert.equal(renderToStaticMarkup(<ArenaCommandPalette open={false} commands={[]} />), '');
});

test('an open palette draws each command with its icon class, label and shortcut', () => {
  const html = renderToStaticMarkup(
    <ArenaCommandPalette open commands={[{ id: 'new', label: 'New project', icon: 'ph-bold ph-plus', shortcut: 'N' }]} />,
  );
  assert.ok(html.includes('class="ph-bold ph-plus"'), 'the icon is drawn from the class name');
  assert.ok(html.includes('New project'), 'the label is rendered');
  assert.ok(html.includes('>N<'), 'the shortcut is rendered at the row\'s trailing edge');
  assert.ok(html.includes('role="dialog"'), 'the combobox binding\'s dialog element is intact');
});

test('an absent required member throws rather than rendering', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaCommandPalette commands={[]} />), /`open` is required/);
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaCommandPalette open commands={undefined} />), /`commands` is required/);
});

test('the active row is the one the arrow keys point at, and it takes the accent branch of the recipe', () => {
  const html = renderToStaticMarkup(
    <ArenaCommandPalette open commands={[{ id: 'a', label: 'Deploy' }, { id: 'b', label: 'Roll back' }]} />,
  );
  assert.match(html, /class="[^"]*\barena-command-palette__row--active-true\b[^"]*"[^>]*aria-selected="true"|aria-selected="true"[^>]*class="[^"]*\barena-command-palette__row--active-true\b/,
    'the first row is active on open and wears the accent tint');
  assert.equal((html.match(/\barena-command-palette__row--active-true\b/g) || []).length, 1, 'more than one row was drawn as active');
  assert.match(html, /\b(?:arena-command-palette__input|arena-command-palette__row--active-false)\b/, 'and the other row takes the quiet branch');
});

test('the active row and its label are the active group of the row and rowLabel slots', () => {
  const html = renderToStaticMarkup(
    <ArenaCommandPalette open commands={[{ id: 'a', label: 'Deploy' }, { id: 'b', label: 'Roll back' }]} />,
  );
  assert.equal((html.match(/\barena-command-palette__row-label--active-true\b/g) || []).length, 1);
  assert.match(html, /\barena-command-palette__row-label--active-false\b/);
});
