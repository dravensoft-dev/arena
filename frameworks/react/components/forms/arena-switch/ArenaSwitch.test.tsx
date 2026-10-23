import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIcons, symbols } from '../../../test/IconsHarness.tsx';
import React from 'react';
import { ArenaSwitch } from './ArenaSwitch.tsx';

test('on renders iconOn and aria-checked="true"', () => {
  const html = renderIcons(<ArenaSwitch state iconOn="ph-bold ph-sun" iconOff="ph-bold ph-moon" label="Dark theme" />);
  assert.match(html, /aria-checked="true"/);
  assert.deepEqual(symbols(html), ['bold-sun']);
});

test('off renders iconOff and aria-checked="false"', () => {
  const html = renderIcons(<ArenaSwitch state={false} iconOn="ph-bold ph-sun" iconOff="ph-bold ph-moon" label="Dark theme" />);
  assert.match(html, /aria-checked="false"/);
  assert.deepEqual(symbols(html), ['bold-moon']);
});

test('the state alone decides the track and the knob, and size and orientation are classes', () => {
  const off = renderIcons(<ArenaSwitch label="Dark theme" />);
  assert.doesNotMatch(off, /data-arena-(footprint|thumb|size|orientation)/);
  assert.match(off, /data-arena-part="switch.track"(?:(?!data-arena-state=)[^>])*>/);

  const on = renderIcons(<ArenaSwitch state label="Dark theme" />);
  assert.match(on, /data-arena-part="switch.track"[^>]*\bdata-arena-state=""/);
  assert.match(on, /data-arena-part="switch.knob"[^>]*\bdata-arena-state=""/);

  const tall = renderIcons(<ArenaSwitch label="Dark theme" className="arena-orientation-vertical" />);
  assert.match(tall, /\barena-orientation-vertical\b/);
});
