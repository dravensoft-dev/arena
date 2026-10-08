import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composite, darkenOklab, errorFill, FILL_FALLBACK_KEEP } from './oklab.ts';
import { contrast } from './validate-palette.mjs';

test('a level composited over a surface is the colour that ends up painted', () => {
  assert.equal(composite('#ffffff', '#000000', 100), '#ffffff');
  assert.equal(composite('#ffffff', '#000000', 0), '#000000');
  assert.equal(composite('#ffffff', '#000000', 50), '#808080');
});

test('darkening keeps a proportion of every oklab channel', () => {
  assert.equal(darkenOklab('#c0392f', FILL_FALLBACK_KEEP), '#9a2c24');
});

test('a fill derived against white content darkens, which is what Arena wears', () => {
  assert.equal(errorFill('#c0392f', '#ffffff'), '#9a2c24',
    'both Arena themes put white on the filled danger, so both derive downwards');
});

test('a fill derived against dark content moves away from it rather than toward it', () => {
  const error = '#ff7369';
  const content = '#191919';
  const derived = errorFill(error, content);
  assert.ok(contrast(derived, content) >= 4.5,
    `${derived} on ${content} is ${contrast(derived, content).toFixed(2)}:1; a palette whose `
    + 'error-content IS the dark page gets a fill pushed under AA by darkening');
});
