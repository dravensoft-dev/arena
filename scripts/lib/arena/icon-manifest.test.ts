/* Covers icon-manifest.ts. The case that matters is the one a text search gets wrong: a glyph
 * named in a doc comment is a sentence about the API and not a thing any render draws, and the
 * comment ships inside the package, so a consumer scanning it was sent a rule for it. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { withoutComments, serialise, iconManifest, MANIFEST_FILE } from './icon-manifest.ts';
import { scan } from '../../generate/core/arena-to-prod/icon-css.ts';
import { shippedNames } from '../../generate/core/arena-to-prod/icon-css.ts';

const scanned = (source: string) => serialise(scan(withoutComments(source, 'A.ts')));

test('a glyph named in a doc comment reaches no weight, because nothing draws it', () => {
  const source = "/** Phosphor class name, e.g. 'ph-bold ph-plus'. */\nexport const icon = 'ph-bold ph-bell';";
  assert.deepEqual(scanned(source), { pairs: { bold: ['ph-bell'] }, loose: [] });
});

test('a line comment is prose too, and so is a block one between two renders', () => {
  const source = "// draws 'ph-bold ph-plus'\nconst a = 'ph-bold ph-bell';\n/* or 'ph-fill ph-sun' */\nconst b = 'ph-fill ph-moon';";
  assert.deepEqual(scanned(source), { pairs: { bold: ['ph-bell'], fill: ['ph-moon'] }, loose: [] });
});

test('a glyph beside no weight class still lands loose, because a render may swap the weight', () => {
  assert.deepEqual(scanned("const a = 'ph-bell';"), { pairs: {}, loose: ['ph-bell'] });
});

test('the shape is sorted, so a file walked in another order emits the same bytes', () => {
  const once = scanned("const a = 'ph-bold ph-sun ph-bell';");
  const twice = scanned("const a = 'ph-bold ph-bell ph-sun';");
  assert.deepEqual(once, twice);
  assert.deepEqual(once.pairs.bold, ['ph-bell', 'ph-sun']);
});

test('both layers draw the same glyphs, which is the claim a consumer sheet rests on', () => {
  const react = iconManifest('react');
  const angular = iconManifest('angular');
  assert.deepEqual(react, angular,
    'a glyph one layer draws and the other does not is a component that differs, and a consumer '
    + 'swapping layers would be sent a different subset for the same screens');
  assert.ok(shippedNames(react).size > 0, 'an empty manifest is a failure rather than a clean pass');
});

test('Arena names a weight beside every glyph it draws, so loose is the consumer\'s alone', () => {
  for (const layer of ['react', 'angular']) {
    assert.deepEqual(iconManifest(layer).loose, [],
      `${layer}: a render here spells the weight class beside the glyph, which is what lets a `
      + 'consumer\'s own loose names stay the only ones broadcast into every weight in use');
  }
});

test('the file name is the one arena-to-prod looks for, spelled once', () => {
  assert.equal(MANIFEST_FILE, 'icons.json');
});
