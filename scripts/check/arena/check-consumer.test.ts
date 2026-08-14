/* The gate spawns a real command against a real dist/, so what is unit-tested here is the
 * reading rather than the running: every claim is a pure function over a captured result,
 * and each one is exercised in both directions, because a check that cannot fail is a
 * check that proves nothing. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  importedSheets, unknownSymbolProblems, listProblems, assembled, documented, SOURCES, UNKNOWN,
} from './check-consumer.ts';

const ok: { status: number; stderr: string; theme: string | null; icons: string | null } =
  { status: 0, stderr: '', theme: null, icons: null };

const sheetImports = (...names: string[]) => ({
  ...ok,
  theme: names.map((n) => `@import '@dravensoft/arena-react/css/components/${n}.css';`).join('\n'),
});

test('the emitted sheet list is read from the imports the command wrote, not from the config', () => {
  assert.deepEqual(importedSheets(sheetImports('arena-table', 'arena-button').theme), ['arena-button', 'arena-table']);
  assert.deepEqual(importedSheets(null), []);
  assert.deepEqual(importedSheets("@import '@dravensoft/arena-react/css/base.css';"), [],
    'a layer sheet is not a component sheet, or preflight would read as a component');
});

test('a source naming a symbol the package does not export must resolve nothing, since no alias exists', () => {
  assert.deepEqual(unknownSymbolProblems('react', { ...ok, theme: null }), []);
  assert.equal(unknownSymbolProblems('react', { ...ok, status: 1 }).length, 0,
    'a refusal is the honest answer and not a problem of its own');
  const kept = unknownSymbolProblems('react', sheetImports('button'));
  assert.equal(kept.length, 1);
  assert.match(kept[0] ?? '', /no alias/);
});

test('the documented sheet list must pass and an unknown one must fail, naming what ships', () => {
  const shipped = { ...ok, status: 1, stderr: 'is not a sheet this package ships, which are arena-button, arena-table' };
  assert.deepEqual(listProblems('react', ok, shipped), []);

  const refusedTheDocumented = listProblems('react', { ...ok, status: 1, stderr: 'nope' }, shipped);
  assert.equal(refusedTheDocumented.length, 1);
  assert.match(refusedTheDocumented[0] ?? '', /its own README documents/);

  const acceptedTheStale = listProblems('react', ok, ok);
  assert.equal(acceptedTheStale.length, 1);
  assert.match(acceptedTheStale[0] ?? '', /fails at render rather than at the command/);

  const silentRefusal = listProblems('react', ok, { ...ok, status: 1, stderr: 'no' });
  assert.equal(silentRefusal.length, 1);
  assert.match(silentRefusal[0] ?? '', /does not list the sheets/);
});

test('assembly is judged by the package manifest, so a half-written dist is not mistaken for one', () => {
  assert.equal(assembled('react', '/nowhere-at-all'), false);
});

test('the React fixture names the package, because the symbol scan reads the import as well as the tag', () => {
  assert.match(SOURCES['react']?.['src/App.tsx'] ?? '', /from '@dravensoft\/arena-react'/);
  assert.match(SOURCES['react']?.['src/App.tsx'] ?? '', /<ArenaButton/);
  assert.match(UNKNOWN['react']?.['src/App.tsx'] ?? '', /\{ Button \}/, 'the negative fixture must spell a name the package does not export exactly');
  assert.match(SOURCES['angular']?.['src/app.html'] ?? '', /<arena-button/,
    'the Angular element is the name the package ships, and this fixture is what holds that');
  assert.match(UNKNOWN['angular']?.['src/app.html'] ?? '', /arena-nothing-at-all/,
    'and the negative one names an element no package ships');
});

test('the documented list is read from the shipped README, and a second one shadows rather than adds', () => {
  assert.deepEqual(documented('"components": ["arena-button", "arena-table"]').names, ['arena-button', 'arena-table']);
  assert.equal(documented('no list here').names, null);
  assert.equal(documented('"components": ["button"] then "components": ["arena-button"]').names, null,
    'two lists mean the gate would run whichever came first, which is how a stale example hides behind a fresh one');
});
