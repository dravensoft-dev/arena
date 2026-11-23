import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaSpinner } from './ArenaSpinner.tsx';

test('ArenaSpinner names itself by its label', () => {
  const html = renderToStaticMarkup(<ArenaSpinner label="Loading deploys" />);
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

test('the spinner draws its circle slot class', () => {
  const html = renderToStaticMarkup(<ArenaSpinner />);
  assert.match(html, /\barena-spinner__circle\b/, 'the circle did not draw its slot class');
});
