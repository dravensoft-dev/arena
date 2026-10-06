import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaBadge } from './ArenaBadge.tsx';

test('ArenaBadge renders its content slot', () => {
  assert.match(renderToStaticMarkup(<ArenaBadge>DRAFT</ArenaBadge>), /DRAFT/);
});

test('ArenaBadge renders the tone it was given, not the neutral default', () => {
  const danger = renderToStaticMarkup(<ArenaBadge tone="danger">X</ArenaBadge>);
  assert.match(danger, /data-arena-part="badge"[^>]*\bdata-arena-tone="danger"/);
  assert.doesNotMatch(danger, /data-arena-part="badge"[^>]*\bdata-arena-tone="neutral"/);
  assert.match(renderToStaticMarkup(<ArenaBadge tone="gold">X</ArenaBadge>), /data-arena-part="badge"[^>]*\bdata-arena-tone="gold"/);
});

test('an unknown tone falls back to neutral rather than drawing no tone at all', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.match(renderToStaticMarkup(<ArenaBadge tone="chartreuse">X</ArenaBadge>), /data-arena-part="badge"[^>]*\bdata-arena-tone="neutral"/);
});

test('ArenaBadge draws the dot only when asked', () => {
  assert.doesNotMatch(renderToStaticMarkup(<ArenaBadge>X</ArenaBadge>), /\barena-badge__dot\b/);
  assert.match(renderToStaticMarkup(<ArenaBadge dot>X</ArenaBadge>), /\barena-badge__dot\b/);
});

test('ArenaBadge drops a consumer style object and a consumer attribute, each independently', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  const html = renderToStaticMarkup(<ArenaBadge style={{ color: '#ff00ff' }} data-stray="x">X</ArenaBadge>);
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root -- the {...rest} escape is back');
});
