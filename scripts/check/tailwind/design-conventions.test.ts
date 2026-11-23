/* A manifest's colour is a token or it is not Arena, and a solid primary ground reads primary-fill,
 * the colour primary-content is measured on, while only a wash at a fraction stays on the accent
 * itself. Both are asserted once over the authored manifests, because a component renders its own
 * class names and a resolved class string is not there to read. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { layerManifests } from '../../lib/tailwind/tailwind-compile.ts';
import type { ComponentManifest } from '../../lib/tailwind/manifest-shapes.ts';

const manifests = layerManifests();

function everyClassString(manifest: ComponentManifest) {
  const out: { where: string; classes: string[] }[] = [];
  const eat = (value: unknown, where: string) => {
    if (typeof value === 'string') out.push({ where, classes: value.split(/\s+/).filter(Boolean) });
    else if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) eat(child, `${where}.${key}`);
  };
  eat(manifest.slots, `${manifest.component}.slots`);
  eat(manifest.variants, `${manifest.component}.variants`);
  eat((manifest.compoundVariants ?? []).map((c) => c.class), `${manifest.component}.compoundVariants`);
  return out;
}

test('every manifest is read, or these conventions are asserted over nothing', () => {
  assert.ok(manifests.size > 0);
});

test('no manifest introduces a raw hex, because a colour is a token or it is not Arena', () => {
  const offenders = [];
  for (const manifest of manifests.values()) {
    for (const { where, classes } of everyClassString(manifest)) {
      for (const cls of classes) {
        if (/#[0-9a-fA-F]{3,8}\b/.test(cls)) offenders.push(`${where}: ${cls}`);
      }
    }
  }
  assert.deepEqual(offenders, [], offenders.join('\n'));
});

test('a solid primary ground or its edge reads primary-fill, and only a wash reads primary', () => {
  const offenders = [];
  for (const manifest of manifests.values()) {
    for (const { where, classes } of everyClassString(manifest)) {
      for (const cls of classes) {
        if (/^(?:[a-z-]+:)*(?:bg|border)-primary$/.test(cls)) offenders.push(`${where}: ${cls}`);
      }
    }
  }
  assert.deepEqual(offenders, [],
    'primary-content is measured on primary-fill, so a ground of primary is a pair nothing measures');
});
