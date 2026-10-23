import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArenaIcon } from './ArenaIcon.tsx';
import { ArenaIconsProvider } from '../../../ArenaIcons.ts';
import { forgetArenaWarnings } from '../../../WarnOnce.ts';

const NO_SPRITE = 'ArenaIcon has no sprite: hand the URL of the icons-<hash>.svg arena build writes to ArenaIconsProvider (React) or provideArenaIcons (Angular).';

const realWarn = console.warn;
let warnings: string[] = [];
function capture() {
  warnings = [];
  forgetArenaWarnings();
  console.warn = (...args: unknown[]) => { warnings.push(args.join(' ')); };
}
afterEach(() => { console.warn = realWarn; });

test('no glyph token renders nothing and warns once', () => {
  capture();
  const tree = <ArenaIconsProvider href="/a/icons-1.svg"><ArenaIcon icon="ph-bold" /></ArenaIconsProvider>;
  assert.equal(renderToStaticMarkup(tree), '');
  assert.equal(renderToStaticMarkup(tree), '');
  assert.equal(warnings.length, 1, 'the second render warns again, so the warning is not once');
  assert.match(warnings[0], /ArenaIcon/);
});

test('no sprite renders nothing and warns once, with the shared text', () => {
  capture();
  assert.equal(renderToStaticMarkup(<ArenaIcon icon="ph ph-bell" />), '');
  assert.equal(renderToStaticMarkup(<ArenaIcon icon="ph-bold ph-plus" />), '');
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0], `[arena] ${NO_SPRITE}`);
});

test('the server render holds no use and reads no document', () => {
  const doc = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const win = Object.getOwnPropertyDescriptor(globalThis, 'window');
  let reads = 0;
  const trap = { configurable: true, get() { reads += 1; return undefined; } };
  Object.defineProperty(globalThis, 'document', trap);
  Object.defineProperty(globalThis, 'window', trap);
  let html = '';
  try {
    html = renderToStaticMarkup(<ArenaIconsProvider href="/a/icons-1.svg"><ArenaIcon icon="ph-bold ph-plus" /></ArenaIconsProvider>);
    capture();
    renderToStaticMarkup(<ArenaIcon icon="ph-bold ph-plus" />);
  } finally {
    if (doc) Object.defineProperty(globalThis, 'document', doc); else delete (globalThis as { document?: unknown }).document;
    if (win) Object.defineProperty(globalThis, 'window', win); else delete (globalThis as { window?: unknown }).window;
  }
  assert.equal(reads, 0, 'a render touched document or window');
  assert.ok(html.includes(`<use href="/a/icons-1.svg#${['ph', 'bold', 'plus'].join('-')}"></use>`));
  assert.match(html, /<svg [^>]*aria-hidden="true"/);
  assert.equal(warnings.length, 1, 'the render with no sprite warns, and draws no use');
});
