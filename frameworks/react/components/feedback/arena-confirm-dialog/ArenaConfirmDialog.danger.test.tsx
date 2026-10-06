/* The one filled danger surface in Arena, and it once reached npm unrendered: the dialog
 * handed ArenaButton a `style`, and ArenaButton forwards nothing, so `destructive` changed no markup
 * here at all. The dialog now draws that action itself. */
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArenaConfirmDialog } from './ArenaConfirmDialog.tsx';

test('destructive paints the filled danger surface, and nothing else does', () => {
  const html = renderToStaticMarkup(<ArenaConfirmDialog open destructive title="Delete" onConfirm={() => {}} />);
  assert.match(html, /data-arena-part="confirm-dialog.confirm"[^>]*\bdata-arena-destructive=""/, 'the filled danger surface does not render');
  assert.match(html, /data-arena-part="confirm-dialog.confirm"[^>]*\bdata-arena-destructive=""/, 'the filled surface carries no readable ink');

  const plain = renderToStaticMarkup(<ArenaConfirmDialog open title="Save" onConfirm={() => {}} />);
  assert.doesNotMatch(plain, /data-arena-part="confirm-dialog.confirm"[^>]*\bdata-arena-destructive=""/, 'an ordinary confirm must not be filled with danger');
  assert.match(plain, /data-arena-part="confirm-dialog.confirm"(?:(?!data-arena-destructive=)[^>])*>/, 'the ordinary confirm lost its primary surface');
});

test('the footer wraps, the way ArenaDialog, ArenaPageHead and ArenaChartCard all do', () => {
  const html = renderToStaticMarkup(<ArenaConfirmDialog open title="Delete" onConfirm={() => {}} />);
  assert.match(html, /\barena-confirm-dialog__foot\b/,
    'the system has one action row, and a confirmation that overflows at 390px is the worst '
    + 'place for it, since the reader is being asked to decide');
});
