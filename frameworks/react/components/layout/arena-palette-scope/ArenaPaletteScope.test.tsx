import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { getArenaTheme, initArenaTheme } from '../../../Theme.ts';
import { ArenaPaletteScope, useArenaPalette } from './ArenaPaletteScope.tsx';

function Reader({ label }: { label: string }) {
  return <i data-reader={label}>{useArenaPalette()}</i>;
}

test("paints the island's ground", () => {
  const html = renderToStaticMarkup(<ArenaPaletteScope palette="light">x</ArenaPaletteScope>);
  const root = /<div class="([^"]*)"/.exec(html)?.[1]?.split(/\s+/) ?? [];
  assert.ok(root.includes('arena-light'), `the root carries arena-light: ${html}`);
  assert.ok(root.includes('arena-palette-scope__root'), `the root carries the root slot class: ${html}`);
  assert.match(html, /data-arena-part="palette-scope"/);
});

test("provides the nearest scope's palette", () => {
  const html = renderToStaticMarkup(
    <ArenaPaletteScope palette="dark">
      <Reader label="outer" />
      <ArenaPaletteScope palette="light"><Reader label="inner" /></ArenaPaletteScope>
    </ArenaPaletteScope>,
  );
  assert.match(html, /<i data-reader="inner">light<\/i>/);
  assert.match(html, /<i data-reader="outer">dark<\/i>/);
});

test('answers the page theme outside any scope, before initArenaTheme and with no document', () => {
  assert.equal(typeof document, 'undefined');
  assert.doesNotThrow(() => renderToStaticMarkup(<Reader label="bare" />));
  assert.equal(getArenaTheme(), 'dark');
  assert.match(renderToStaticMarkup(<Reader label="bare" />), new RegExp(`<i data-reader="bare">${getArenaTheme()}</i>`));
});

test('refuses a palette the theme config does not declare, once initArenaTheme has run', () => {
  initArenaTheme();
  assert.throws(
    () => renderToStaticMarkup(<ArenaPaletteScope palette="sepia">x</ArenaPaletteScope>),
    /ArenaPaletteScope: no palette named "sepia"; the declared palettes are dark, light; the registered palettes are none/,
  );
});

test('the default palette is an island too', () => {
  const html = renderToStaticMarkup(<ArenaPaletteScope palette="dark">x</ArenaPaletteScope>);
  assert.match(html, /class="[^"]*\barena-dark\b/);
});
