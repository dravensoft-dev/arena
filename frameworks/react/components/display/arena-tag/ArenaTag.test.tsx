import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaTag } from './ArenaTag.tsx';

test('a tone renders its dot and the tone colour; default is neutral', () => {
  const html = renderToStaticMarkup(<ArenaTag tone="success">Shipped</ArenaTag>);
  assert.match(html, /Shipped/);
  assert.match(html, /data-arena-part="tag"[^>]*\bdata-arena-tone="success"/);
  assert.match(html, /data-arena-part="tag"[^>]*\bdata-arena-tone="success"/);
  assert.match(html, /\barena-tag__dot\b/, 'the dot takes the tone from the text colour and draws nothing of its own');
  const neutral = renderToStaticMarkup(<ArenaTag>Draft</ArenaTag>);
  assert.match(neutral, /data-arena-part="tag"[^>]*\bdata-arena-tone="neutral"/);
  assert.match(neutral, /data-arena-part="tag"[^>]*\bdata-arena-tone="neutral"/);
});

test('a colorId renders its slot as an attribute, clamped to 1..8 and rounded, and writes no custom property', () => {
  const html = renderToStaticMarkup(<ArenaTag colorId={3}>Backend</ArenaTag>);
  assert.match(html, /data-arena-part="tag"[^>]*\bdata-arena-color-id="3"/);
  assert.doesNotMatch(html, /--arena-tag-cat/);
  assert.doesNotMatch(html, /data-arena-tone="identity"/);
  assert.match(renderToStaticMarkup(<ArenaTag colorId={9 as never}>x</ArenaTag>), /data-arena-color-id="8"/);
  assert.match(renderToStaticMarkup(<ArenaTag colorId={2.6 as never}>x</ArenaTag>), /data-arena-color-id="3"/);
});

test('a colorId replaces the tone rather than joining it, so one colour reaches the pill', () => {
  const html = renderToStaticMarkup(<ArenaTag tone="danger" colorId={5}>Backend</ArenaTag>);
  assert.match(html, /data-arena-part="tag"[^>]*\bdata-arena-color-id="5"/);
  assert.doesNotMatch(html, /data-arena-tone="danger"/);
});

test('no colorId leaves the tone alone and writes no colour attribute', () => {
  const html = renderToStaticMarkup(<ArenaTag tone="warning">Late</ArenaTag>);
  assert.match(html, /data-arena-part="tag"[^>]*\bdata-arena-tone="warning"/);
  assert.doesNotMatch(html, /data-arena-color-id|--arena-tag-cat/);
});

test('removable renders a labelled dismiss button that calls onRemove', () => {
  const html = renderToStaticMarkup(<ArenaTag removable onRemove={() => {}}>x</ArenaTag>);
  assert.match(html, /aria-label="Remove"/);
});

test('not removable renders no dismiss button, even with onRemove passed', () => {
  const html = renderToStaticMarkup(<ArenaTag onRemove={() => {}}>x</ArenaTag>);
  assert.doesNotMatch(html, /aria-label="Remove"/);
});
