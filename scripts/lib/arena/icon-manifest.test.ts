/* Covers icon-manifest.ts. The case that matters is the one a text search gets wrong: a glyph
 * named in a doc comment is a sentence about the API and not a thing any render draws, and the
 * comment ships inside the package, so a consumer scanning it was sent a rule for it. */

import test from 'node:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './repo-root.ts';
import assert from 'node:assert/strict';
import { withoutComments, serialise, iconManifest, MANIFEST_FILE } from './icon-manifest.ts';
import { kebab } from '../../utils/case.ts';
import { scan } from '../../generate/core/arena-cli/icon-css.ts';
import { shippedNames, iconNames } from '../../generate/core/arena-cli/icon-css.ts';

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

test('the manifest is keyed by component', () => {
  const react = iconManifest('react');
  assert.ok(react.components['ArenaAlert']?.pairs['fill']?.includes('ph-info'));
  assert.deepEqual(react.components['ArenaTag']?.pairs['bold'], ['ph-x']);
  assert.ok(!('ArenaButton' in react.components && react.components['ArenaButton']?.pairs['fill']?.includes('ph-info')));
  assert.deepEqual(react.fills, ['ArenaBottomNavItem', 'ArenaSideNavItem']);
  const angular = iconManifest('angular');
  assert.ok(angular.components['arena-alert']?.pairs['fill']?.includes('ph-info'));
  assert.deepEqual(angular.fills, ['arena-bottom-nav-item', 'arena-side-nav-item']);
});

test('both layers draw the same glyphs, which is the claim a consumer sheet rests on', () => {
  const react = iconManifest('react');
  const angular = iconManifest('angular');
  const byName = (map: ReturnType<typeof iconManifest>) => Object.fromEntries(Object.entries(map.components)
    .map(([key, icons]) => [kebab(key), icons]));
  assert.deepEqual(byName(react), byName(angular),
    'a glyph one layer draws and the other does not is a component that differs, and a consumer '
    + 'swapping layers would be sent a different subset for the same screens');
  assert.ok(shippedNames(react).size > 0, 'an empty manifest is a failure rather than a clean pass');
});

test('Arena names a weight beside every glyph it draws, so loose is the consumer\'s alone', () => {
  for (const layer of ['react', 'angular']) {
    assert.deepEqual(Object.values(iconManifest(layer).components).flatMap((one) => one.loose), [],
      `${layer}: a render here spells the weight class beside the glyph, which is what lets a `
      + 'consumer\'s own loose names stay the only ones broadcast into every weight in use');
  }
});

test('the file name is the one arena build looks for, spelled once', () => {
  assert.equal(MANIFEST_FILE, 'icons.json');
});

test('a file directly under a category that names a glyph throws, and one that names none is skipped', () => {
  const root = join(repoRoot, '.cache', 'plan-1.29', 'manifest-stray');
  const category = join(root, 'frameworks', 'react', 'components', 'display');
  rmSync(root, { recursive: true, force: true });
  mkdirSync(category, { recursive: true });
  try {
    writeFileSync(join(category, 'Quiet.tsx'), "export const quiet = 'no glyph here';\n");
    assert.deepEqual(iconManifest('react', root), { components: {}, fills: [] });
    writeFileSync(join(category, 'Stray.tsx'), "export const stray = 'ph-bold ph-bell';\n");
    assert.throws(() => iconManifest('react', root), /display\/Stray\.tsx names glyphs and sits directly under its category/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
