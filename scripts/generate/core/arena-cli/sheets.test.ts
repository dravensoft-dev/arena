import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { componentMap, roleReferencesIn, pluginCss, COMPONENT_MAP, PLUGIN_LAYER_ORDER } from './sheets.ts';
import { LAYER_ORDER } from '../../../lib/tailwind/component-sheets.ts';
import { repoRoot } from '../../../lib/arena/repo-root.ts';
import { tokenCatalogue } from '../../../lib/arena/package-assembly.ts';
import { MAP } from './cli-fixtures.ts';

test('the map is read from beside the command, by the name both packages write it under', () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-installed-'));
  writeFileSync(join(root, COMPONENT_MAP), JSON.stringify(MAP));
  assert.deepEqual(componentMap(root), MAP);
  writeFileSync(join(root, COMPONENT_MAP), JSON.stringify({ nothing: true }));
  assert.equal(componentMap(root), null, 'a file of the right name and the wrong shape is no map');
  assert.equal(componentMap(join(tmpdir(), 'arena-nowhere')), null);
  rmSync(root, { recursive: true });
});

test('a colour reference is derived from the catalogue, because a consumer palette has to restate it', () => {
  assert.deepEqual(roleReferencesIn({
    tokens: {
      'fill-surface': 'var(--color-base-200)',
      'r-surface': '14px',
      'step-eyebrow': 'var(--dz-text-xs)',
    },
    roles: {},
  }), ['--fill-surface:var(--color-base-200);'],
  'only a colour reference is restated per palette. A dz reference is restated per DENSITY, which '
  + 'is another axis and another block, and a resolved length is right in every scope there is');
  assert.deepEqual(roleReferencesIn(null), []);
});

test('the shipped catalogue is the one this build actually assembles, not only a fixture', () => {
  const catalogue = tokenCatalogue(repoRoot);
  assert.ok(Object.keys(catalogue.roles).length > 0, 'found 0 roles, so nothing could be answered');
  assert.ok(Object.keys(catalogue.tokens).length > 0, 'found 0 tokens, so no alias could resolve');
  for (const [name, role] of Object.entries(catalogue.roles)) {
    const { type } = role as { type?: string };
    assert.ok(type, `${name} reaches a consumer with no type, so nothing can check an answer to it`);
  }
});

test('the root plugin\'s stylesheet is wrapped and its author never spells the layer', () => {
  assert.equal(
    pluginCss([{ name: 'shop', css: '[data-arena-part="card"] { border-radius: 0 }', root: true }]),
    `${PLUGIN_LAYER_ORDER}\n@layer arena-plugin {\n[data-arena-part="card"] { border-radius: 0 }\n}\n`,
    'the layer is the build\'s to declare, because a plugin author writing it could get it wrong '
    + 'in a way nothing reports',
  );
});

test('the sheet declares the layer order itself, so where a bundler puts it cannot matter', () => {
  const css = pluginCss([{ name: 'shop', css: '.x{}', root: true }]) ?? '';
  assert.ok(css.startsWith(PLUGIN_LAYER_ORDER), 'the order leads the file');
  assert.ok(
    css.indexOf('@layer theme, base, components, utilities, arena-plugin;')
    < css.indexOf('@layer arena-plugin {'),
    'a bare @layer arena-plugin block met before the order statement registers that name as the '
    + 'LOWEST layer, and every plugin rule contesting a component rule then loses in silence',
  );
  assert.equal(
    PLUGIN_LAYER_ORDER,
    LAYER_ORDER,
    'the consumer sheet and the prelude declare one order, or the two disagree about where the '
    + 'plugin layer sits',
  );
});

test('a plugin that is not the root is nested under its own class', () => {
  assert.equal(
    pluginCss([{ name: 'shop', css: '[data-arena-part="card"] { border-radius: 0 }' }]),
    `${PLUGIN_LAYER_ORDER}\n@layer arena-plugin {\n.arena-shop {\n[data-arena-part="card"] { border-radius: 0 }\n}\n}\n`,
    'a later plugin is a difference and paints where its class is, or it would paint the pages '
    + 'the root plugin is what looks like',
  );
});

test('several plugins concatenate in list order, so a later one wins by source order', () => {
  const css = pluginCss([{ name: 'a', css: '.x{}', root: true }, { name: 'b', css: '.y{}', root: true }]);
  assert.ok((css ?? '').indexOf('.x{}') < (css ?? '').indexOf('.y{}'));
});

test('no plugin carrying css writes no sheet at all', () => {
  assert.equal(pluginCss([]), null, 'an empty layer is a file a consumer imports for nothing');
});
