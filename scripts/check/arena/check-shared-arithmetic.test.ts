/* The gate reads two real trees; these drive its verdict with hand-built pairs. The stale-entry
 * case is the one that matters: a declared difference that has been reconciled has to fail, or
 * the map becomes a list of things nobody rechecked, which is what it exists to prevent. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DIVERGENT, PAIRED, collect, exportedFunctions, normalise, pairProblems, staleEntries,
} from './check-shared-arithmetic.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

const fns = (src: string) => exportedFunctions(src);

test('a body is compared with its whitespace normalised, so a reflow is not a drift', () => {
  const one = fns('export function f(a) {\n  return a + 1;\n}');
  const other = fns('export function f(a: number) {\n\n  return a + 1;\n\n}');
  assert.equal(one.get('f'), other.get('f'));
  assert.equal(normalise('{  a\n  b }'), '{ a b }');
});

test('a signature may differ while the body may not, which is the whole distinction', () => {
  const react = fns('export function f(a: number[]) {\n  return a.length;\n}');
  const angular = fns('export function f(a: readonly number[]) {\n  return a.length;\n}');
  assert.deepEqual(pairProblems('X.ts', react, angular, new Map()).problems, []);
});

test('two bodies that differ and are not declared fail, naming the pair and the function', () => {
  const react = fns('export function f() {\n  return 1;\n}');
  const angular = fns('export function f() {\n  return 2;\n}');
  const { problems } = pairProblems('X.ts', react, angular, new Map());
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /X\.ts:f: the two layers' copies of this function have drifted apart/);
});

test('a declared difference is clean, and is what the map buys', () => {
  const react = fns('export function f() {\n  return 1;\n}');
  const angular = fns('export function f() {\n  return 2;\n}');
  const declared = new Map([['X.ts:f', 'a reason']]);
  const { problems, claimed } = pairProblems('X.ts', react, angular, declared);
  assert.deepEqual(problems, []);
  assert.deepEqual(claimed, ['X.ts:f']);
});

test('a declared difference that has been reconciled FAILS, so an exception cannot outlive it', () => {
  const same = 'export function f() {\n  return 1;\n}';
  const { problems } = pairProblems('X.ts', fns(same), fns(same), new Map([['X.ts:f', 'a reason']]));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /the two bodies are identical now — delete the entry/);
});

test('a pair that shares no function name compares nothing, and says so rather than passing', () => {
  const { problems } = pairProblems('X.ts', fns('export function a() {\n  return 1;\n}'),
    fns('export function b() {\n  return 1;\n}'), new Map());
  assert.match(problems[0] ?? '', /export no function under the same name/);
});

test('an entry naming a function no pair exports is stale', () => {
  assert.match(staleEntries([], new Map([['X.ts:gone', 'r']]))[0] ?? '',
    /DIVERGENT names X\.ts:gone, and no pair exports a function under that name/);
});

test('every PAIRED module exists in both layers, so none of them is a moved path', () => {
  for (const rel of PAIRED) {
    for (const layer of ['react', 'angular']) {
      assert.ok(existsSync(join(repoRoot, 'frameworks', layer, rel)),
        `${rel} is named by PAIRED and is not in the ${layer} layer`);
    }
  }
});

test('the real trees hold: every shared function agrees or is declared', () => {
  const { problems, claimed, compared } = collect(repoRoot);
  assert.deepEqual([...problems, ...staleEntries(claimed)], []);
  assert.equal(compared, PAIRED.length);
});

test('every DIVERGENT entry carries a reason worth reading, not a placeholder', () => {
  for (const [key, reason] of DIVERGENT) {
    assert.ok(reason.length > 60, `${key} carries a reason too short to say why the two differ`);
  }
});

const inkConstants = (src: string) => new Map([...src.matchAll(/export const (ARENA_INK_[A-Z]+) = '([^']*)';/g)]
  .map((m) => [m[1] as string, m[2] as string]));

const inkDiffers = (react: string, angular: string) => {
  const [a, b] = [inkConstants(react), inkConstants(angular)];
  const names = new Set([...a.keys(), ...b.keys()]);
  return [...names].filter((name) => a.get(name) !== b.get(name));
};

test('the ink constants of the two DataVisuals files are equal, and the comparison fails a drift or a missing one', () => {
  const read = (layer: string) => readFileSync(join(repoRoot, 'frameworks', layer, 'DataVisuals.ts'), 'utf8');
  const react = read('react');
  assert.equal(inkConstants(react).size, 2, 'a comparison over no constant proves nothing');
  assert.deepEqual(inkDiffers(react, read('angular')), []);
  assert.deepEqual(inkDiffers(react, react.replace('var(--level-ink-body)', 'var(--level-ink-bodyy)')), ['ARENA_INK_BODY']);
  assert.deepEqual(inkDiffers(react, react.replace(/export const ARENA_INK_MUTED[^\n]*\n/, '')), ['ARENA_INK_MUTED']);
});
