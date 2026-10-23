/* The markup half of the copy button at rest: one icon button named the same in every state,
 * and a live region beside it that exists before it has anything to say. What a press does,
 * the clipboard, the swap and the clock, is behaviour and lives in the DOM suite beside this one. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIcons, symbols } from '../../../test/IconsHarness.tsx';
import React from 'react';
import { ArenaCopyButton, ARENA_COPY_CONFIRMATION, ARENA_COPY_GLYPHS } from './ArenaCopyButton.tsx';
import { ArenaLocaleProvider, ARENA_DEFAULT_LOCALE } from '../../../ArenaLocale.ts';
import { dismissConfirmation } from '../../../Tokens.generated.js';

const render = (element: React.ReactElement) => renderIcons(element);

test('at rest it is one icon button with the copy glyph, and a region that is there and empty', () => {
  const html = render(<ArenaCopyButton text="bun add @dravensoft/arena-react" label="Copy the install command" />);
  assert.match(html, /^<span class="[^"]*" data-arena-part="copy-button"/);
  assert.match(html, /<button type="button" aria-label="Copy the install command"/);
  assert.deepEqual(symbols(html), ['bold-copy']);
  assert.match(html, /<svg[^>]*aria-hidden="true"/);
  assert.match(html, /<span role="status" class="[^"]*" data-arena-part="copy-button\.announcement"[^>]*><\/span><\/span>$/,
    'a live region filled on first insertion is not reliably announced, so it is mounted empty');
  assert.doesNotMatch(html, /aria-pressed/, 'the confirmation is not a toggle, so nothing reads as one that is on');
});

test('with no label, or a blank one, the locale names the button', () => {
  assert.match(render(<ArenaCopyButton text="x" />), /aria-label="Copy"/);
  assert.match(render(<ArenaCopyButton text="x" label="   " />), /aria-label="Copy"/);
  const spanish = { ...ARENA_DEFAULT_LOCALE, copyButtonLabel: 'Copiar' };
  assert.match(render(<ArenaLocaleProvider value={spanish}><ArenaCopyButton text="x" /></ArenaLocaleProvider>), /aria-label="Copiar"/);
});

test('a blank text draws the button disabled instead of throwing, because there is nothing to copy', () => {
  for (const text of ['', '  ']) {
    const html = render(<ArenaCopyButton text={text} label="Copy the token" />);
    assert.match(html, /<button[^>]* disabled=""/, `${JSON.stringify(text)} left a button that copies nothing`);
  }
  assert.doesNotMatch(render(<ArenaCopyButton text="x" label="Copy the token" />), /disabled=""/);
  assert.match(render(<ArenaCopyButton text="x" label="Copy the token" disabled />), /disabled=""/);
});

test('showLabel draws the name beside the glyph, as the icon button it composes does', () => {
  assert.match(render(<ArenaCopyButton text="x" label="Copy the token" showLabel />), /data-arena-part="icon-button\.label"[^>]*>Copy the token<\/span>/);
});

test('the three glyphs are Arena\'s, and the window is the confirmation token', () => {
  assert.deepEqual({ ...ARENA_COPY_GLYPHS }, { rest: 'ph-bold ph-copy', copied: 'ph-bold ph-check', failed: 'ph-bold ph-warning' });
  assert.equal(ARENA_COPY_CONFIRMATION, dismissConfirmation);
});
