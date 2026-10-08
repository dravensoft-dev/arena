/* The gate spawns a real command against a real dist/, so what is unit-tested here is the
 * reading rather than the running: every claim is a pure function over a captured result,
 * and each one is exercised in both directions, because a check that cannot fail is a
 * check that proves nothing. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CLI_BINS } from '../../lib/arena/package-assembly.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import {
  importedSheets, unknownSymbolProblems, listProblems, closedListProblems, iconProblems, assembled, documented, CONFIG_REFERENCE,
  palettesProblems, SOURCES, UNKNOWN, FILL, GLYPH, THIRD_PALETTE, CLI, snapshot, treeChanges, exitProblem, binProblems,
} from './check-consumer.ts';
import type { CliRun } from './check-consumer.ts';

const ok: CliRun = { status: 0, stdout: '', stderr: '', theme: null, icons: null, plugin: null };

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
  assert.match(refusedTheDocumented[0] ?? '', /the config reference documents/);

  const acceptedTheStale = listProblems('react', ok, ok);
  assert.equal(acceptedTheStale.length, 1);
  assert.match(acceptedTheStale[0] ?? '', /fails at render rather than at the command/);

  const silentRefusal = listProblems('react', ok, { ...ok, status: 1, stderr: 'no' });
  assert.equal(silentRefusal.length, 1);
  assert.match(silentRefusal[0] ?? '', /does not list the sheets/);
});

test('the subset must carry the fixture glyph in the weight it was named beside and in the filled one', () => {
  const both = `.ph-bold.${GLYPH}:before{content:"\\e0ce"}\n${FILL}.${GLYPH}:before{content:"\\e0ce"}`;
  assert.deepEqual(iconProblems('angular', both), []);

  const boldAlone = iconProblems('angular', `.ph-bold.${GLYPH}:before{content:"\\e0ce"}`);
  assert.equal(boldAlone.length, 1);
  assert.match(boldAlone[0] ?? '', /the item the user just pressed/);

  const empty = iconProblems('angular', '');
  assert.equal(empty.length, 1, 'a sheet that was never written is one problem rather than three');
  assert.match(empty[0] ?? '', /wrote no/);

  const neither = iconProblems('angular', '.ph-bold.ph-moon:before{content:"\\e330"}');
  assert.equal(neither.length, 2);
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

test('the documented list is read from the config reference, and a second one shadows rather than adds', () => {
  assert.deepEqual(documented('"components": ["arena-button", "arena-table"]').names, ['arena-button', 'arena-table']);
  assert.equal(documented('no list here').names, null);
  assert.equal(documented('"components": ["button"] then "components": ["arena-button"]').names, null,
    'two lists mean the gate would run whichever came first, which is how a stale example hides behind a fresh one');
});

test('the config reference carries exactly one components list, and it names sheets', () => {
  const { lists, names } = documented(readFileSync(join(root, ...CONFIG_REFERENCE.split('/')), 'utf8'));
  assert.equal(lists, 1);
  assert.ok((names ?? []).length > 0 && (names ?? []).every((one) => one.startsWith('arena-')));
});

const themed = (...blocks: string[]): CliRun => ({ ...ok, theme: blocks.join('\n\n') });

const paletteBlock = (selector: string, polarity: string | null) =>
  `${selector}{\n  --color-base-100:#141010;\n${polarity ? `  color-scheme:${polarity};\n` : ''}}`;

test('three palettes each reaching a block with their own polarity is what a pass means', () => {
  const run = themed(
    paletteBlock(':root', 'dark'),
    paletteBlock('.arena-light', 'light'),
    paletteBlock(`.arena-${THIRD_PALETTE.name}`, 'dark'),
  );
  assert.deepEqual(palettesProblems('react', run), []);
});

test('a palette whose block carries no color-scheme is reported, and so is one with no block at all', () => {
  const silent = themed(
    paletteBlock(':root', 'dark'),
    paletteBlock('.arena-light', null),
    paletteBlock(`.arena-${THIRD_PALETTE.name}`, 'dark'),
  );
  const problems = palettesProblems('react', silent);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /\.arena-light declares no color-scheme:light/);

  const missing = themed(paletteBlock(':root', 'dark'), paletteBlock('.arena-light', 'light'));
  assert.match(palettesProblems('react', missing)[0] ?? '', /carries no \.arena-dusk block/);
});

test('a command that refused a third palette is a failure rather than an empty theme sheet', () => {
  const problems = palettesProblems('angular', { ...ok, status: 1 });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /three palettes exited 1/);
});

test('the gate runs the one bin the package declares', () => {
  assert.equal(CLI, CLI_BINS.arena.slice(2));
  assert.deepEqual(Object.keys(CLI_BINS), ['arena']);
});

test('a snapshot sees every byte of the tree but not what node_modules links to, and names what moved', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-snapshot-'));
  const elsewhere = mkdtempSync(join(tmpdir(), 'arena-snapshot-link-'));
  mkdirSync(join(dir, 'node_modules'));
  symlinkSync(elsewhere, join(dir, 'node_modules', 'linked'));
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src', 'a.css'), 'one');
  writeFileSync(join(dir, 'package.json'), '{}');
  const before = snapshot(dir);
  assert.deepEqual([...before.keys()].sort(), ['package.json', 'src/a.css']);
  assert.deepEqual(treeChanges(before, snapshot(dir)), []);
  writeFileSync(join(dir, 'src', 'a.css'), 'two');
  writeFileSync(join(dir, 'new.css'), '');
  rmSync(join(dir, 'package.json'));
  assert.deepEqual(treeChanges(before, snapshot(dir)), ['new.css', 'package.json', 'src/a.css']);
  rmSync(dir, { recursive: true, force: true });
  rmSync(elsewhere, { recursive: true, force: true });
});

test('an exit code that is not the one a command promises is one problem naming the command and what it said', () => {
  assert.deepEqual(exitProblem('react', 'arena doctor', { ...ok, status: 1 }, 1), []);
  const wrong = exitProblem('react', 'arena doctor', { ...ok, status: 0, stderr: 'fine' }, 1);
  assert.equal(wrong.length, 1);
  assert.match(wrong[0] ?? '', /react: arena doctor exited 0 where it promises 1/);
  assert.match(wrong[0] ?? '', /fine/);
});

test('the packed manifest declares exactly one bin, and it is the one the gate runs', () => {
  assert.deepEqual(binProblems('react', { arena: `./${CLI}` }), []);
  assert.equal(binProblems('react', {}).length, 1);
  assert.equal(binProblems('react', undefined).length, 1);
  assert.match(binProblems('react', { arena: './bin/other.mjs' })[0] ?? '', /points at/);
  const two = binProblems('react', { arena: `./${CLI}`, second: './bin/second.mjs' });
  assert.equal(two.length, 1);
  assert.match(two[0] ?? '', /2 commands/);
});

test('a list naming arena-table alone imports the pagination and select the table draws, and says so', () => {
  const said = 'arena build: 1 component sheet(s) named, and 2 Arena draws for you: arena-pagination, arena-select\n';
  const closed = { ...sheetImports('arena-table', 'arena-pagination', 'arena-select'), stdout: said };
  assert.deepEqual(closedListProblems('react', closed), []);

  const open = closedListProblems('react', { ...sheetImports('arena-table'), stdout: said });
  assert.equal(open.length, 1);
  assert.match(open[0] ?? '', /and not arena-pagination, arena-select/);

  const silent = closedListProblems('react', { ...closed, stdout: '' });
  assert.equal(silent.length, 1);
  assert.match(silent[0] ?? '', /said nothing/);

  const refused = closedListProblems('angular', { ...ok, status: 1, stderr: 'nope' });
  assert.equal(refused.length, 1);
  assert.match(refused[0] ?? '', /^angular: .* exited 1/);
});
