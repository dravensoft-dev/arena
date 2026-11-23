/* The destructive confirm button. The dialog draws the destructive action itself, because
 * ArenaButton forwards nothing but the four trigger attributes and a `style` handed to it would
 * change no markup. */
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArenaConfirmDialog } from './ArenaConfirmDialog.tsx';

test('destructive marks the confirm button, and a plain confirm carries no mark', () => {
  const html = renderToStaticMarkup(<ArenaConfirmDialog open destructive title="Delete" onConfirm={() => {}} />);
  assert.match(html, /data-arena-part="confirm-dialog.confirm"[^>]*\bdata-arena-destructive=""/, 'the destructive confirm does not render');

  const plain = renderToStaticMarkup(<ArenaConfirmDialog open title="Save" onConfirm={() => {}} />);
  assert.doesNotMatch(plain, /data-arena-part="confirm-dialog.confirm"[^>]*\bdata-arena-destructive=""/, 'an ordinary confirm carries the destructive mark');
  assert.match(plain, /data-arena-part="confirm-dialog.confirm"(?:(?!data-arena-destructive=)[^>])*>/, 'the ordinary confirm lost its primary surface');
});

test('the footer draws its foot slot class', () => {
  const html = renderToStaticMarkup(<ArenaConfirmDialog open title="Delete" onConfirm={() => {}} />);
  assert.match(html, /\barena-confirm-dialog__foot\b/, 'the footer row did not draw its foot slot class');
});
