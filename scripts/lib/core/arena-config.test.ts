/* The example config a consumer copies has to be a config that builds. Angular inlines every
 * external stylesheet during a production build, so a font URL Google answers with 400 is not a
 * missing face: it is the consumer's build failing, with Arena named in the error. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arenaConfig, fontEntries, fontWeights, googleFontsUrl, GOOGLE_FONTS } from './arena-config.ts';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../arena/repo-root.ts';

test('a family is asked for the weights Arena declares, one by one', () => {
  assert.equal(
    googleFontsUrl('Familjen Grotesk', [400, 700]),
    `${GOOGLE_FONTS}?family=Familjen+Grotesk:wght@400;700&display=swap`,
  );
});

test('the weight query is a list and never a range, because a range outside a family\'s axis is a 400', () => {
  const weights = fontWeights(repoRoot);
  assert.ok(weights.length > 1, 'typography.json declares one weight or none, so the query proves nothing');
  assert.doesNotMatch(googleFontsUrl('Archivo', weights), /wght@\d+\.\.\d+/,
    'Google serves a range only when it lies inside the family\'s own wght axis and answers 400 otherwise, '
    + 'while a list is clamped to the nearest weight the family has, so it holds for every family Arena declares.');
  assert.ok(googleFontsUrl('Archivo', weights).includes(`wght@${weights.join(';')}`));
});

test('every font the example config names is a woff2 beside the config, with the weights its record holds', () => {
  const { fonts } = arenaConfig(repoRoot);
  const roles = Object.keys(fonts);
  assert.ok(roles.length > 0, 'the example config names no font at all');
  const record = readJson(join(repoRoot, 'assets', 'fonts', 'Fonts.generated.json'));

  for (const role of roles) {
    const font = fonts[role] as { family: string; src: string; weight: string };
    assert.ok(font.family, `fonts.${role} has no family`);
    assert.match(font.src, /^\.\/fonts\/[\w-]+\.woff2$/, `fonts.${role}.src is not a path under ./fonts`);
    const file = font.src.slice('./fonts/'.length);
    assert.ok(existsSync(join(repoRoot, 'assets', 'fonts', file)), `${file} is not in assets/fonts`);
    assert.equal(record[file].family, font.family);
    assert.equal(font.weight, record[file].weights.join(' '));
  }
});
