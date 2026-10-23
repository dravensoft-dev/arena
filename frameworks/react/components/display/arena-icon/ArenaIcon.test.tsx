import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
  assert.match(warnings[0] ?? '', /ArenaIcon/);
});

test('no sprite renders nothing and warns once, with the shared text', () => {
  capture();
  assert.equal(renderToStaticMarkup(<ArenaIcon icon="ph ph-bell" />), '');
  assert.equal(renderToStaticMarkup(<ArenaIcon icon="ph-bold ph-plus" />), '');
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0], `[arena] ${NO_SPRITE}`);
});

test('the server render holds no use and reads no document', () => {
  capture();
  const html = renderToStaticMarkup(<ArenaIcon icon="ph-bold ph-plus" />);
  assert.doesNotMatch(html, /<svg|<use/);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0], `[arena] ${NO_SPRITE}`);
  const layer = join(import.meta.dirname, '..', '..', '..');
  for (const file of ['ArenaIcons.ts', 'components/display/arena-icon/ArenaIcon.tsx']) {
    assert.doesNotMatch(readFileSync(join(layer, file), 'utf8'), /\b(document|window|fetch)\b/, `${file} reads the browser`);
  }
});
