/* A case one layer measures, the other layer measures under the same title. Two files are
 * paired here, the skeleton render matrix and the table column key cases, and each pair must
 * list the same titles in the same order, so a case added to one layer and forgotten in the
 * other fails instead of leaving the layers describing different components. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';

export const PAIRS = [
  { name: 'skeleton matrix', minimum: 8, only: /^matrix: /,
    react: 'frameworks/react/components/display/arena-skeleton/ArenaSkeleton.matrix.dom.test.tsx',
    angular: 'frameworks/angular/components/display/arena-skeleton/ArenaSkeleton.dimensions.test.ts' },
  { name: 'table columns', minimum: 5, only: /./,
    react: 'frameworks/react/components/display/arena-table/ArenaTable.columns.dom.test.tsx',
    angular: 'frameworks/angular/components/display/arena-table/ArenaTable.columns.test.ts' },
];

export const titlesOf = (source: string, only: RegExp) =>
  [...source.matchAll(/^\s*test\((['`])(.*?)\1,/gm)].map((match) => match[2]!).filter((title) => only.test(title));

const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

for (const pair of PAIRS)
  test(`the ${pair.name} cases carry the same titles in both layers`, () => {
    const react = titlesOf(read(pair.react), pair.only);
    assert.ok(react.length >= pair.minimum, `${pair.react} lists ${react.length} titles, expected at least ${pair.minimum}`);
    assert.deepEqual(titlesOf(read(pair.angular), pair.only), react);
  });

test('a renamed title in one layer is a difference', () => {
  const react = read(PAIRS[0]!.react);
  const renamed = react.replace("matrix: lines of 0 is", "matrix: lines of zero is");
  assert.notEqual(renamed, react);
  assert.notDeepEqual(titlesOf(renamed, PAIRS[0]!.only), titlesOf(read(PAIRS[0]!.angular), PAIRS[0]!.only));
});

test('a source with no test title reads as none, so the zero-result guard has something to fail on', () => {
  assert.deepEqual(titlesOf('const a = 1;', /./), []);
  assert.deepEqual(titlesOf("test('a', () => {});\n  test(`b ${1}`, () => {});", /./), ['a', 'b ${1}']);
});
