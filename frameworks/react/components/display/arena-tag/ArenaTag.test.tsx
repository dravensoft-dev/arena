import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaTag } from './ArenaTag.tsx';
import tailwind from './ArenaTag.manifest.generated.ts';

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

test('removable renders a dismiss button named by the remove word and the tag\'s own text', () => {
  const html = renderToStaticMarkup(<ArenaTag removable onRemove={() => {}}>Berlin</ArenaTag>);
  const [, close, text] = /<button[^>]* id="([^"]+)"[^>]*aria-labelledby="\1 ([^"]+)"/.exec(html) ?? [];
  assert.ok(close && text, 'the button names itself and the text, in that order');
  assert.match(html, new RegExp(`<span id="${text}" data-arena-boundary="">Berlin</span>`));
  assert.match(html, /<span class="[^"]*" data-arena-part="tag.close-label"[^>]*>Remove<\/span><\/button>/);
  assert.doesNotMatch(html, /aria-label=/, 'an aria-label would sit beside the name the references give');
});

test('not removable renders no dismiss button, even with onRemove passed', () => {
  const html = renderToStaticMarkup(<ArenaTag onRemove={() => {}}>x</ArenaTag>);
  assert.doesNotMatch(html, /<button/);
  assert.doesNotMatch(html, />Remove</);
});

test('tabStop false holds the remove button out of the Tab sequence, and the default writes nothing', () => {
  assert.doesNotMatch(renderToStaticMarkup(<ArenaTag removable>x</ArenaTag>), /tabindex/);
  assert.match(renderToStaticMarkup(<ArenaTag removable tabStop={false}>x</ArenaTag>), /<button[^>]*tabindex="-1"/);
  assert.match(renderToStaticMarkup(<ArenaTag removable disabled tabStop={false}>x</ArenaTag>), /<button[^>]*aria-disabled="true"[^>]*tabindex="-1"/);
});

test('two tags never share an id, so each button names its own text', () => {
  const html = renderToStaticMarkup(<><ArenaTag removable>Berlin</ArenaTag><ArenaTag removable>Lisbon</ArenaTag></>);
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
});

test('a tag keeps its word whole in a row, and still breaks it when the container is narrower than the label', () => {
  const root = tailwind.slots.root.split(/\s+/);
  assert.ok(root.includes('shrink-0'), tailwind.slots.root);
  assert.ok(root.includes('wrap-anywhere'), tailwind.slots.root);
});
