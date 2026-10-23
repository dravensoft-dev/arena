import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArenaIconsProvider, useArenaIcons } from './ArenaIcons.ts';

function Probe() {
  return <span>{String(useArenaIcons())}</span>;
}

test('with no provider a component reads no sprite', () => {
  assert.equal(renderToStaticMarkup(<Probe />), '<span>null</span>');
});

test('the nearest provider answers its href', () => {
  const html = renderToStaticMarkup(
    <ArenaIconsProvider href="/a.svg"><ArenaIconsProvider href="/b.svg"><Probe /></ArenaIconsProvider></ArenaIconsProvider>,
  );
  assert.equal(html, '<span>/b.svg</span>');
});
