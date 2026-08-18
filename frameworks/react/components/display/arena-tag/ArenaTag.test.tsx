import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaTag } from './ArenaTag.tsx';

test('a tone renders its dot and the tone colour; default is neutral', () => {
  const html = renderToStaticMarkup(<ArenaTag tone="success">Shipped</ArenaTag>);
  assert.match(html, /Shipped/);
  assert.match(html, /\barena-tag__root--tone-success\b/);
  assert.match(html, /\barena-tag__root--tone-success\b/);
  assert.match(html, /\barena-tag__dot\b/, 'the dot takes the tone from the text colour and draws nothing of its own');
  const neutral = renderToStaticMarkup(<ArenaTag>Draft</ArenaTag>);
  assert.match(neutral, /\barena-tag__root--tone-neutral\b/);
  assert.match(neutral, /\barena-tag__root--tone-neutral\b/);
});

test('a colorId draws the identity arm and carries the ramp colour as a custom property', () => {
  const html = renderToStaticMarkup(<ArenaTag colorId={3}>Backend</ArenaTag>);
  assert.match(html, /\barena-tag__root--tone-identity\b/);
  assert.match(html, /--arena-tag-cat:\s*var\(--color-cat-3\)/);
});

test('a colorId replaces the tone rather than joining it, so one colour reaches the pill', () => {
  const html = renderToStaticMarkup(<ArenaTag tone="danger" colorId={5}>Backend</ArenaTag>);
  assert.match(html, /\barena-tag__root--tone-identity\b/);
  assert.doesNotMatch(html, /\barena-tag__root--tone-danger\b/);
});

test('no colorId leaves the tone alone and writes no custom property', () => {
  const html = renderToStaticMarkup(<ArenaTag tone="warning">Late</ArenaTag>);
  assert.match(html, /\barena-tag__root--tone-warning\b/);
  assert.doesNotMatch(html, /--arena-tag-cat/);
});

test('removable renders a labelled dismiss button that calls onRemove', () => {
  const html = renderToStaticMarkup(<ArenaTag removable onRemove={() => {}}>x</ArenaTag>);
  assert.match(html, /aria-label="Remove"/);
});

test('not removable renders no dismiss button, even with onRemove passed', () => {
  const html = renderToStaticMarkup(<ArenaTag onRemove={() => {}}>x</ArenaTag>);
  assert.doesNotMatch(html, /aria-label="Remove"/);
});
