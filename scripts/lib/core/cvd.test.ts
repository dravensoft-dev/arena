import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CVD_KINDS, MACHADO, simulatedLightness } from './cvd.ts';
import { repoRoot as root } from '../arena/repo-root.ts';

test('the matrices are the ones the vendored validator holds, kind by kind and row by row', () => {
  const vendored = readFileSync(join(root, 'scripts/lib/core/validate-palette.mjs'), 'utf8');
  for (const kind of CVD_KINDS) {
    const found = new RegExp(`${kind}:\\s*(\\[\\[[^;]*?\\]\\])`).exec(vendored);
    assert.ok(found, `${kind}: validate-palette.mjs holds a matrix literal`);
    assert.deepEqual(JSON.parse(found[1] as string), MACHADO[kind], `${kind}: the same rows in the same order`);
  }
});

test('every deficiency keeps black and white where they are', () => {
  for (const kind of CVD_KINDS) {
    assert.ok(Math.abs(simulatedLightness('#000000', kind)) < 1e-6, `${kind}: black stays at L 0`);
    assert.ok(Math.abs(simulatedLightness('#ffffff', kind) - 1) < 1e-3, `${kind}: white stays at L 1`);
  }
});

test('a grey reads the same under every deficiency, because the simulation moves hue and not lightness', () => {
  const grey = CVD_KINDS.map((kind) => simulatedLightness('#808080', kind));
  for (const one of grey) assert.ok(Math.abs(one - grey[0]!) < 0.01);
});

test('protan darkens a red, which is the deficiency the simulation exists to show', () => {
  assert.ok(simulatedLightness('#ff0000', 'protan') < simulatedLightness('#ff0000', 'deutan'));
});
