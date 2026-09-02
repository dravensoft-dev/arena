/* intro/styles.css is the one stylesheet in this tree that opens the plugin layer by hand.
 * Everything else carrying arena-plugin is generated: a component sheet imports the prelude,
 * and arena-to-prod writes the order ahead of a consumer's plugin sheet. A @layer met before
 * the order statement registers that name as the LOWEST layer of the document, so every plugin
 * rule contesting a compiled component rule loses at any specificity and nothing reports it:
 * the audit reads source text and counts the part as painted. This file is the only place the
 * order can be stated for the pages that link it, because it is the first sheet they link. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { LAYER_ORDER } from '../../lib/tailwind/component-sheets.ts';

const FILE = 'intro/styles.css';

const PLUGIN_IMPORT = /@import\s+"[^"]+"\s+layer\(arena-plugin\);/;

const css = readFileSync(join(root, FILE), 'utf8').replace(/\/\*[^]*?\*\//g, '');

test(`${FILE} opens the plugin layer, or every claim below is about nothing`, () => {
  assert.match(css, PLUGIN_IMPORT,
    `${FILE} imports no stylesheet into layer(arena-plugin), so the browsable pages carry a style `
    + 'plugin control with no plugin CSS behind it and this suite asserts nothing');
});

test(`${FILE} states the layer order, and states the same one the compiled sheets do`, () => {
  assert.ok(css.includes(LAYER_ORDER),
    `${FILE} does not carry LAYER_ORDER verbatim. It is repeated here rather than cited because a `
    + 'browser reads this file and not scripts/lib/tailwind/component-sheets.ts, and a second '
    + 'spelling of the order is a second order');
});

test('the order comes before every import, since an import can register a layer of its own', () => {
  const order = css.indexOf(LAYER_ORDER);
  const first = css.indexOf('@import');
  assert.ok(order >= 0 && order < first,
    `${FILE} imports at ${first} and states the layer order at ${order}. An @import naming a layer `
    + 'registers it where it sits, so a statement after one cannot move it: arena-plugin becomes the '
    + 'lowest layer of the document and every rule a style plugin paints loses to the component rule '
    + 'it contests, with every gate green');
});
