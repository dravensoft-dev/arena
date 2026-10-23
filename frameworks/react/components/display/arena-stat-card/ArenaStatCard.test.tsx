import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIcons, symbols } from '../../../test/IconsHarness.tsx';
import React from 'react';
import { ArenaStatCard } from './ArenaStatCard.tsx';

test('a delta with a value renders the pill', () => {
  const html = renderIcons(
    <ArenaStatCard label="Deploys" value="128" delta={{ value: '+12%', direction: 'up', tone: 'positive' }} />,
  );
  assert.match(html, /\+12%/, 'the delta value itself must render');
  assert.deepEqual(symbols(html), ['bold-arrow-up'], 'the pill\'s direction glyph must render');
});

test('a delta with a tone and direction but an empty value renders no pill at all', () => {
  const html = renderIcons(
    <ArenaStatCard label="Deploys" value="128" delta={{ value: '', direction: 'up', tone: 'positive' }} />,
  );
  assert.deepEqual(symbols(html), [], 'no direction glyph in either direction -- the pill must not render at all');
});

test('no delta at all renders no pill either -- the same gate, at its other edge', () => {
  const html = renderIcons(<ArenaStatCard label="Deploys" value="128" />);
  assert.deepEqual(symbols(html), []);
});

test('an icon renders the glyph Arena draws, inside the aria-hidden wrapper', () => {
  const html = renderIcons(<ArenaStatCard label="Deploys" value="128" icon="ph-bold ph-rocket" />);
  assert.match(html, /aria-hidden="true"/);
  assert.deepEqual(symbols(html), ['bold-rocket']);
});

test('no icon renders no wrapper at all -- not an empty one', () => {
  const html = renderIcons(<ArenaStatCard label="Deploys" value="128" />);
  assert.doesNotMatch(html, /aria-hidden="true"/);
});

test('throws when a required member is absent', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderIcons(<ArenaStatCard value="128" />), /label.*required/);
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderIcons(<ArenaStatCard label="Deploys" />), /value.*required/);
});
