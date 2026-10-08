import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaSpinner } from './ArenaSpinner.tsx';

test('ArenaSpinner announces its label through an explicitly polite progressbar', () => {
  const html = renderToStaticMarkup(<ArenaSpinner label="Loading deploys" />);
  assert.match(html, /role="progressbar"/);
  assert.match(html, /aria-live="polite"/,
    'role="progressbar" carries no implicit live region, so dropping the explicit aria-live '
    + 'silently removes the announcement role="status" provides');
  assert.match(html, /aria-label="Loading deploys"/);
});

test('ArenaSpinner falls back to "Loading" when no label is given', () => {
  assert.match(renderToStaticMarkup(<ArenaSpinner />), /aria-label="Loading"/);
});

test('ArenaSpinner takes its size as a class', () => {
  assert.match(renderToStaticMarkup(<ArenaSpinner className="arena-size-lg" />), /\barena-size-lg\b/);
  assert.doesNotMatch(renderToStaticMarkup(<ArenaSpinner />), /data-arena-size/);
});

test('ArenaSpinner takes its accent as a class, and the ring takes it from the root', () => {
  assert.match(renderToStaticMarkup(<ArenaSpinner className="arena-accent-gold" />), /\bclass="[^"]*\barena-accent-gold\b[^"]*"[^>]*data-arena-part="spinner"/);
  assert.doesNotMatch(renderToStaticMarkup(<ArenaSpinner />), /data-arena-tone/);
  assert.match(renderToStaticMarkup(<ArenaSpinner />), /\barena-spinner__circle\b/,
    'the ring reads the tone off the root rather than naming a colour of its own');
});

test('the spin is the shared utility, so the reduced-motion slowdown is not a second copy', () => {
  const html = renderToStaticMarkup(<ArenaSpinner />);
  assert.match(html, /\barena-spinner__circle\b/,
    'motion reporting work in progress slows rather than stops, and the utility is where that is said');
});

test('ArenaSpinner drops a consumer style object and a consumer attribute, each independently', () => {
  const html = renderToStaticMarkup(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    <ArenaSpinner style={{ color: '#ff00ff' }} data-stray="x" />
  );
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root -- the {...rest} escape is back');
});
