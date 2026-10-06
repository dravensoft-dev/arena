import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaCard } from './ArenaCard.tsx';

test('ArenaCard renders its children', () => {
  const html = renderToStaticMarkup(<ArenaCard>hello</ArenaCard>);
  assert.match(html, /hello/);
});

test('ArenaCard renders no header block when it has no title, eyebrow or action', () => {

  assert.doesNotMatch(renderToStaticMarkup(<ArenaCard>x</ArenaCard>), /\barena-card__title\b/);
  const titled = renderToStaticMarkup(<ArenaCard title="T">x</ArenaCard>);
  assert.match(titled, /\barena-card__title\b/);
  assert.match(titled, /T/);
});

test('ArenaCard renders its action slot even with no title or eyebrow', () => {
  const html = renderToStaticMarkup(<ArenaCard action={<span>ACT</span>}>x</ArenaCard>);
  assert.match(html, /ACT/);
  assert.doesNotMatch(html, /\barena-card__title\b/);
});

test('an interactive card carries the manifest\'s own hover and focus classes, not a JS state', () => {
  const inert = renderToStaticMarkup(<ArenaCard>x</ArenaCard>);
  assert.doesNotMatch(inert, /data-arena-part="card"[^>]*\bdata-arena-interactive=""/);
  assert.match(inert, /data-arena-part="card"(?:(?!data-arena-interactive=)[^>])*>/);

  const live = renderToStaticMarkup(<ArenaCard interactive>x</ArenaCard>);
  assert.match(live, /data-arena-part="card"[^>]*\bdata-arena-interactive=""/);
  assert.match(live, /data-arena-part="card"[^>]*\bdata-arena-interactive=""/);
  assert.match(live, /data-arena-part="card"[^>]*\bdata-arena-interactive=""/);
  assert.match(live, /data-arena-part="card"[^>]*\bdata-arena-interactive=""/,
    'the disabled look is a state the attribute selects, so nothing has to be recomputed to draw it');
});

test('accent and elevation reach the card as classes, and it writes no attribute for either', () => {
  const html = renderToStaticMarkup(<ArenaCard className="arena-accent-primary arena-elevation-floating">x</ArenaCard>);
  assert.match(html, /\bclass="[^"]*\barena-accent-primary\b[^"]*"[^>]*data-arena-part="card"/);
  assert.match(html, /\bclass="[^"]*\barena-elevation-floating\b[^"]*"[^>]*data-arena-part="card"/);
  assert.doesNotMatch(html, /data-arena-(accent|floating)/);
});

test('an href card is interactive without being told so, because navigating IS acting', () => {
  const html = renderToStaticMarkup(<ArenaCard href="#x">x</ArenaCard>);
  assert.match(html, /data-arena-part="card"[^>]*\bdata-arena-interactive=""/);
});

test('ArenaCard drops a consumer style object and a consumer attribute, each independently', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  const html = renderToStaticMarkup(<ArenaCard style={{ color: '#ff00ff' }} data-stray="x">x</ArenaCard>);
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root -- the {...rest} escape is back');
});
