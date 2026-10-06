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
  assert.match(off, /\barena-switch__track--footprint-horizontal-md\b/);
  assert.match(off, /\barena-switch__track--footprint-horizontal-md\b/);
  assert.match(off, /\barena-switch__knob--thumb-off-horizontal\b/);
  assert.match(off, /\barena-switch__track--state-false\b/);

  const on = renderToStaticMarkup(<ArenaSwitch state label="Dark theme" />);
  assert.match(on, /\barena-switch__knob--thumb-on-horizontal\b/);
  assert.match(on, /\barena-switch__track--state-true\b/);

  const tall = renderToStaticMarkup(<ArenaSwitch label="Dark theme" orientation="vertical" size="lg" />);
  assert.match(tall, /\barena-switch__track--footprint-vertical-lg\b/);
  assert.match(tall, /\barena-switch__track--footprint-vertical-lg\b/);
  assert.match(tall, /\barena-switch__knob--thumb-off-vertical\b/, 'a vertical knob travels on the other axis');
});
