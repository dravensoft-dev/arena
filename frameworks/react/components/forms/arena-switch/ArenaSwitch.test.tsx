import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaSwitch } from './ArenaSwitch.tsx';

test('on renders iconOn and aria-checked="true"', () => {
  const html = renderToStaticMarkup(<ArenaSwitch state iconOn="ph-bold ph-sun" iconOff="ph-bold ph-moon" label="Dark theme" />);
  assert.match(html, /aria-checked="true"/);
  assert.match(html, /ph-bold ph-sun/);
  assert.doesNotMatch(html, /ph-bold ph-moon/);
});

test('off renders iconOff and aria-checked="false"', () => {
  const html = renderToStaticMarkup(<ArenaSwitch state={false} iconOn="ph-bold ph-sun" iconOff="ph-bold ph-moon" label="Dark theme" />);
  assert.match(html, /aria-checked="false"/);
  assert.match(html, /ph-bold ph-moon/);
  assert.doesNotMatch(html, /ph-bold ph-sun/);
});

test('the track footprint and the knob travel are two composite variants, not a size table', () => {
  const off = renderToStaticMarkup(<ArenaSwitch label="Dark theme" />);
  assert.match(off, /data-arena-part="switch.track"[^>]*\bdata-arena-footprint="horizontal-md"/);
  assert.match(off, /data-arena-part="switch.track"[^>]*\bdata-arena-footprint="horizontal-md"/);
  assert.match(off, /data-arena-part="switch.knob"[^>]*\bdata-arena-thumb="off-horizontal"/);
  assert.match(off, /data-arena-part="switch.track"(?:(?!data-arena-state=)[^>])*>/);

  const on = renderToStaticMarkup(<ArenaSwitch state label="Dark theme" />);
  assert.match(on, /data-arena-part="switch.knob"[^>]*\bdata-arena-thumb="on-horizontal"/);
  assert.match(on, /data-arena-part="switch.track"[^>]*\bdata-arena-state=""/);

  const tall = renderToStaticMarkup(<ArenaSwitch label="Dark theme" orientation="vertical" size="lg" />);
  assert.match(tall, /data-arena-part="switch.track"[^>]*\bdata-arena-footprint="vertical-lg"/);
  assert.match(tall, /data-arena-part="switch.track"[^>]*\bdata-arena-footprint="vertical-lg"/);
  assert.match(tall, /data-arena-part="switch.knob"[^>]*\bdata-arena-thumb="off-vertical"/, 'a vertical knob travels on the other axis');
});
