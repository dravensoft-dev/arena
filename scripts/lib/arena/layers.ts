/* The framework layers and the two name shapes every gate reads them through.
 * LAYERS is an exhaustive enumeration rather than a walk of frameworks/, so a
 * layer renamed or removed wholesale becomes loud instead of leaving scope.
 * NON_LAYERS is the other half of that claim: a directory under frameworks/ is
 * one or the other, so a new one fails until somebody says which, rather than
 * being read as a layer no gate implements or a layer every gate skips.
 * emittedTree is anchored rather than a directory name: a walker skipping every
 * directory called build would also skip scripts/build/, the phase directory.
 * ComponentTree is readLayer's answer named: six readers were each casting an
 * Object.entries of it, so the shape is stated here instead of six times. */

import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { memoBy } from '../../utils/memo.ts';
import { repoRoot } from './repo-root.ts';

export const LAYERS = ['tailwind', 'angular', 'react'];

export const NON_LAYERS = new Map([
  ['demos', 'the playground fixtures: one fact per component that belongs to every layer and to none, so a copy per layer is a copy that can disagree'],
  ['kitchen-sink', 'the arrangement every component is drawn in: which sections a page holds and which components land in each, for every layer at once, so the pair check:pixel-parity compares cannot differ in how it was written'],
]);

export const emittedTree = (root = repoRoot) => join(root, 'frameworks', 'angular', 'build');

export type ComponentTree = Record<string, string[]>;

export const readLayer = memoBy((layer: string) => layer, (layer: string): ComponentTree => {
  const base = join(repoRoot, 'frameworks', layer, 'components');
  if (!existsSync(base)) return {};
  const out: ComponentTree = {};
  for (const cat of readdirSync(base, { withFileTypes: true })) {
    if (!cat.isDirectory()) continue;
    out[cat.name] = readdirSync(join(base, cat.name), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  }
  return out;
});
