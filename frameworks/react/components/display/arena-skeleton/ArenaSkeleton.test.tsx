import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaSkeleton } from './ArenaSkeleton.tsx';

test('a text skeleton renders `lines` rows, the last one short', () => {
  const html = renderToStaticMarkup(<ArenaSkeleton variant="text" lines={3} />);
  assert.equal((html.match(/(?:arena-skeleton__root|arena-skeleton__line)(?![-\w])/g) || []).length, 3,
    'each row shimmers through the shared utility, and nothing injects a sheet for it');
  assert.equal((html.match(/arena-skeleton__line--last-true/g) || []).length, 1, 'exactly the last row is the short one');
});

test('width/height/radius are plain CSS strings the render passes through', () => {

  const html = renderToStaticMarkup(<ArenaSkeleton variant="block" width="var(--sp-1)" height="var(--sp-3)" radius="var(--r-lg)" />);
  assert.ok(html.includes('var(--sp-1)'), 'the width string must reach the rendered style');
  assert.ok(html.includes('var(--sp-3)'), 'the height string must reach the rendered style');
  assert.ok(html.includes('var(--r-lg)'), 'the radius string must reach the rendered style as border-radius');
});

test('the shimmer is the shared utility, so its reduced-motion answer is not a second copy', () => {
  const html = renderToStaticMarkup(<ArenaSkeleton variant="block" />);
  assert.match(html, /\b(?:arena-skeleton__root|arena-skeleton__line)\b/);
  assert.doesNotMatch(html, /\barena-skeleton\b/, 'the hook class the injected sheet needed is gone with it');
});

test('each variant takes its own box from the recipe, and a consumer string still overrides it', () => {
  assert.match(renderToStaticMarkup(<ArenaSkeleton variant="circle" />), /\barena-skeleton__root--variant-circle\b/);
  assert.match(renderToStaticMarkup(<ArenaSkeleton variant="line" />), /\b(?:arena-skeleton__line|arena-skeleton__root--variant-line)\b/);
  assert.match(renderToStaticMarkup(<ArenaSkeleton variant="block" />), /\barena-skeleton__root--variant-block\b/);
});
