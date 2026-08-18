/* A color-mix a component builds in JS carries a percentage, and that percentage is a design
 * decision with a token family of its own: tint in contracts/design/effects.json, which both
 * layers already import as tintArea, tintSoft and tintEdge. One spelled inline is a second
 * answer to a question the token answers, and it escapes every gate around it: check:dimensions
 * reads a value only for the props it lists and these are colour props, and
 * check:duplicate-constants reads module-level NAMED constants, which an inline one is not. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { walkFiles } from '../../utils/walk-files.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { relPosix } from '../../utils/posix-path.ts';

const LAYERS = ['react', 'angular'];

const SKIP = new Set(['dist', 'build', 'vendor', 'node_modules']);

const MIX_PERCENT = /color-mix\([^`'"]*?\s(\d+(?:\.\d+)?)%/g;

export function sourcesOf(layer: string) {
  const at = join(repoRoot, 'frameworks', layer);
  return walkFiles(at, { skip: (name) => SKIP.has(name) })
    .filter((file) => /\.tsx?$/.test(file) && !file.includes('.generated.') && !/\.test\.tsx?$/.test(file));
}

test('a color-mix a layer builds takes its percentage from a token, never a literal', () => {
  const found: string[] = [];
  for (const layer of LAYERS) {
    for (const file of sourcesOf(layer)) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(MIX_PERCENT)) {
        found.push(`${relPosix(repoRoot, file)}: color-mix at ${match[1]}%`);
      }
    }
  }
  assert.deepEqual(found, [],
    'the tint family answers how much of an identity colour a surface keeps, and a percentage '
    + 'written here is a second answer at a different number over a different ground:\n'
    + `${found.join('\n')}`);
});
