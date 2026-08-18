/* The rules take strings and maps, so the failures are driven by fixtures rather than a tree.
 * INTERNAL is asserted in both directions, since a symbol nobody declared and one the barrel has
 * stopped carrying are the two ways the map goes wrong. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  PAGE, BARRELS, INTERNAL, EXPORTED, rootModules, symbolsOf, reachedSymbols,
  zeroReachProblems, homeProblems, staleInternalProblems, collect, parametersOf, signatureProblems,
} from './check-exports.ts';

function tree(files: Record<string, string>) {
  const base = mkdtempSync(join(tmpdir(), 'arena-exports-'));
  for (const [rel, text] of Object.entries(files) as [string, string][]) {
    const path = join(base, rel);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, text);
  }
  return base;
}

const BARREL = "export * from './components/x/X.tsx';\nexport * from './Helpers.ts';\n";
const HELPERS = 'export function arenaThing() {}\nexport const arenaOther = 1;\nexport type ArenaShape = string;\n';

test('every layer with a barrel is one this gate reads, and the tree carries both', () => {
  assert.deepEqual([...BARRELS.keys()], ['react', 'angular']);
  const reached = reachedSymbols();
  assert.ok((reached.get('react') ?? []).length > 0, 'the react barrel reached nothing, so the assertions below are vacuous');
  assert.ok((reached.get('angular') ?? []).length > 0, 'the angular barrel reached nothing, so the assertions below are vacuous');
});

test('INTERNAL states a reason for every symbol it keeps off the page', () => {
  for (const [name, reason] of INTERNAL) assert.ok(reason.length > 40, `${name} states its reason`);
  assert.equal(new Set(INTERNAL.keys()).size, INTERNAL.size);
});

test('the subject is what a consumer calls, so a type is not one', () => {
  assert.deepEqual([...HELPERS.matchAll(EXPORTED)].map((m) => m[1]), ['arenaThing', 'arenaOther']);
});

test('a barrel names its root modules, and a component line is not one', () => {
  const base = tree({ 'frameworks/react/Index.generated.ts': BARREL, 'frameworks/react/Helpers.ts': HELPERS });
  assert.deepEqual(rootModules(base, 'frameworks/react/Index.generated.ts'), ['frameworks/react/Helpers.ts']);
  assert.deepEqual(symbolsOf(base, 'frameworks/react/Helpers.ts'), ['arenaThing', 'arenaOther']);
});

test('a symbol the page never names is one a consumer either rewrites or leans on unsupported', () => {
  const base = tree({
    'frameworks/react/Index.generated.ts': BARREL,
    'frameworks/react/Helpers.ts': HELPERS,
    [`frameworks/react/${PAGE}`]: '# page\n\nCall `arenaThing()` for the thing.\n',
  });
  const problems = homeProblems(base, reachedSymbols(base, new Map([['react', 'frameworks/react/Index.generated.ts']])), new Map());
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /arenaOther reaches the root of the react package/);
});

test('a symbol INTERNAL declares is one the page may leave out', () => {
  const base = tree({
    'frameworks/react/Index.generated.ts': BARREL,
    'frameworks/react/Helpers.ts': HELPERS,
    [`frameworks/react/${PAGE}`]: '# page\n\nCall `arenaThing()` for the thing.\n',
  });
  const declared = new Map([['arenaOther', 'a constant the layer reads and a consumer never types, kept off the page on purpose']]);
  const reached = reachedSymbols(base, new Map([['react', 'frameworks/react/Index.generated.ts']]));
  assert.deepEqual(homeProblems(base, reached, declared), []);
});

test('a declared symbol no barrel carries any more fails as a stale declaration', () => {
  const reached = new Map([['react', ['arenaThing']]]);
  const declared = new Map([['arenaGone', 'a helper that used to reach the root and does not now']]);
  const problems = staleInternalProblems(reached, declared);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /INTERNAL declares arenaGone, which no barrel reaches any more/);
});

test('a barrel that reaches nothing is a failure, not a page with nothing to answer for', () => {
  assert.equal(zeroReachProblems(new Map()).length, 1);
  assert.equal(zeroReachProblems(new Map([['react', []]])).length, 1);
  assert.deepEqual(zeroReachProblems(new Map([['react', ['arenaThing']]])), []);
});

test('a parameter list is read off the declaration, destructuring and optionality included', () => {
  const source = 'export function arenaTrapTabKey(container: Element, event: KeyboardEvent, activeElement: Element | null) {}\n'
    + 'export function useArenaThing({ open, panelRef }: Options) {}\n'
    + 'export function arenaWidth(target?: Ref) {}\n';
  assert.deepEqual(parametersOf(source, 'arenaTrapTabKey'), ['container', 'event', 'activeElement']);
  assert.deepEqual(parametersOf(source, 'useArenaThing'), ['{ open, panelRef }']);
  assert.deepEqual(parametersOf(source, 'arenaWidth'), ['target?']);
  assert.equal(parametersOf(source, 'arenaAbsent'), null);
});

test('a call form the page writes with the wrong parameters is one a consumer cannot compile', () => {
  const helpers = 'export function arenaThing(container: Element, event: KeyboardEvent) {}\n';
  const barrels = new Map([['react', 'frameworks/react/Index.generated.ts']]);
  const wrong = tree({
    'frameworks/react/Index.generated.ts': "export * from './Helpers.ts';\n",
    'frameworks/react/Helpers.ts': helpers,
    [`frameworks/react/${PAGE}`]: '# page\n\nReach for `arenaThing(event, root)` instead.\n',
  });
  const problems = signatureProblems(wrong, barrels);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /writes arenaThing\(event, root\) and .* declares arenaThing\(container, event\)/);

  const right = tree({
    'frameworks/react/Index.generated.ts': "export * from './Helpers.ts';\n",
    'frameworks/react/Helpers.ts': helpers,
    [`frameworks/react/${PAGE}`]: '# page\n\nReach for `arenaThing(container, event)` instead.\n',
  });
  assert.deepEqual(signatureProblems(right, barrels), []);
});

test('this tree conforms', () => {
  const problems = collect();
  assert.deepEqual(problems, [], problems.join('\n'));
});
