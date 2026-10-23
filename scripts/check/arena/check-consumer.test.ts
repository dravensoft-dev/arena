/* The gate spawns a real command against a real dist/, so what is unit-tested here is the
 * reading rather than the running: every claim is a pure function over a captured result,
 * and each one is exercised in both directions, because a check that cannot fail is a
 * check that proves nothing. */

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CLI_BINS } from '../../lib/arena/package-assembly.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import {
  importedSheets, packageSheetProblems, REGULAR_SYMBOL, unknownSymbolProblems, listProblems, closedListProblems, spriteProblems, documented, CONFIG_REFERENCE,
  palettesProblems, defaultListProblems, fontCutProblems, runtimeProblems, installedPalette, SOURCES, UNKNOWN, GLYPH, NAV_SYMBOL, GLYPH_SYMBOL, THIRD_PALETTE, CLI, snapshot, treeChanges, exitProblem, binProblems, unplacedProblems, PROVIDER,
} from './check-consumer.ts';
import type { CliRun, Shipped } from './check-consumer.ts';
import { distDir, unassembled, assembled } from './check-packages.ts';

const ok: CliRun = { status: 0, stdout: '', stderr: '', theme: null, pkg: null, sprites: {}, module: null, retired: false, plugin: null, runtime: null, fonts: {} };

const sheetImports = (...names: string[]) => ({
  ...ok,
  pkg: names.map((n) => `@import '@dravensoft/arena-react/css/components/${n}.css';`).join('\n'),
});

test('the emitted sheet list is read from the imports the command wrote, not from the config', () => {
  assert.deepEqual(importedSheets(sheetImports('arena-table', 'arena-button').pkg), ['arena-button', 'arena-table']);
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

const NAME = 'icons-0123456789.svg';
const symbol = (id: string) => `<symbol id="${id}" viewBox="0 0 256 256" fill="currentColor"><path d="M0 0"/></symbol>`;
const sprite = (...ids: string[]) => `<svg xmlns="http://www.w3.org/2000/svg">\n${ids.map(symbol).join('\n')}\n</svg>\n`;
const written = (sprites: Record<string, string>, module: string | null = `export const ARENA_SPRITE = '${NAME}';\n`): CliRun =>
  ({ ...ok, sprites, module });

test('the sprite must carry the button glyph bold and the nav glyph filled, and its module must name the file', () => {
  const good = written({ [NAME]: sprite(GLYPH_SYMBOL, NAV_SYMBOL, REGULAR_SYMBOL, 'ph-bold-house') });
  assert.deepEqual(spriteProblems('angular', good), []);
  assert.equal(GLYPH, 'ph-bell');
  assert.equal(GLYPH_SYMBOL, 'ph-bold-bell');
  assert.equal(NAV_SYMBOL, 'ph-fill-house');

  const boldAlone = spriteProblems('angular', written({ [NAME]: sprite(GLYPH_SYMBOL, REGULAR_SYMBOL, 'ph-bold-house') }));
  assert.equal(boldAlone.length, 1);
  assert.match(boldAlone[0] ?? '', /missing symbol|no #ph-fill-house/);
  assert.match(boldAlone[0] ?? '', /the item the user just pressed/);

  const buttonFilled = spriteProblems('angular', written({ [NAME]: sprite(GLYPH_SYMBOL, NAV_SYMBOL, REGULAR_SYMBOL, 'ph-fill-bell') }));
  assert.equal(buttonFilled.length, 1);
  assert.match(buttonFilled[0] ?? '', /cannot draw filled/);

  const none = spriteProblems('angular', written({}));
  assert.equal(none.length, 1, 'a sprite that was never written is one problem rather than several');
  assert.match(none[0] ?? '', /wrote no icons-\*\.svg/);

  const missing = spriteProblems('angular', written({ [NAME]: sprite('ph-bold-moon') }));
  assert.ok(missing.some((one) => one.includes('#ph-bold-bell')), missing.join('\n'));
});

test('a leftover icons.generated.css, a second sprite and a module naming another file are each a problem', () => {
  const good = written({ [NAME]: sprite(GLYPH_SYMBOL, NAV_SYMBOL, REGULAR_SYMBOL) });
  const leftover = spriteProblems('react', { ...good, retired: true });
  assert.equal(leftover.length, 1);
  assert.match(leftover[0] ?? '', /icons\.generated\.css is still there/);

  const two = spriteProblems('react', written({ [NAME]: sprite(GLYPH_SYMBOL, NAV_SYMBOL, REGULAR_SYMBOL), 'icons-abcdef0123.svg': sprite('ph-bold-moon') }));
  assert.equal(two.length, 1);
  assert.match(two[0] ?? '', /2 icons-\*\.svg/);

  const other = spriteProblems('react', written({ [NAME]: sprite(GLYPH_SYMBOL, NAV_SYMBOL, REGULAR_SYMBOL) }, "export const ARENA_SPRITE = 'icons-ffffffffff.svg';\n"));
  assert.equal(other.length, 1);
  assert.match(other[0] ?? '', /module names icons-ffffffffff\.svg/);

  const noModule = spriteProblems('react', written({ [NAME]: sprite(GLYPH_SYMBOL, NAV_SYMBOL, REGULAR_SYMBOL) }, null));
  assert.equal(noModule.length, 1);
  assert.match(noModule[0] ?? '', /arena\.icons\.generated\.js/);
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

const paletteBlock = (selector: string, polarity: string | null, name = selector === ':root' ? 'dark' : selector.replace(/^\.arena-/, ''),
  alias: string | null = '--focus-ring:var(--color-secondary);') =>
  `${selector}{\n  --color-base-100:#141010;\n  --arena-palette:${name};\n${alias ? `  ${alias}\n` : ''}`
  + `${polarity ? `  color-scheme:${polarity};\n` : ''}}`;

test('three palettes each reaching a block with their own polarity is what a pass means', () => {
  const run = themed(
    paletteBlock(':root', 'dark'),
    paletteBlock('.arena-dark', 'dark'),
    paletteBlock('.arena-light', 'light'),
    paletteBlock(`.arena-${THIRD_PALETTE.name}`, 'dark'),
  );
  assert.deepEqual(palettesProblems('react', run), []);
});

test('a palette block that names no palette, or carries no alias block, is reported', () => {
  const unnamed = themed(
    paletteBlock(':root', 'dark'), paletteBlock('.arena-dark', 'dark'),
    paletteBlock('.arena-light', 'light', 'dark'), paletteBlock(`.arena-${THIRD_PALETTE.name}`, 'dark'),
  );
  assert.match(palettesProblems('react', unnamed)[0] ?? '', /\.arena-light declares no --arena-palette:light/);
  const bare = themed(
    paletteBlock(':root', 'dark'), paletteBlock('.arena-dark', 'dark', 'dark', null),
    paletteBlock('.arena-light', 'light'), paletteBlock(`.arena-${THIRD_PALETTE.name}`, 'dark'),
  );
  assert.match(palettesProblems('react', bare)[0] ?? '', /\.arena-dark carries no --focus-ring/);
  const noDefault = themed(
    paletteBlock(':root', 'dark'), paletteBlock('.arena-light', 'light'),
    paletteBlock(`.arena-${THIRD_PALETTE.name}`, 'dark'),
  );
  assert.match(palettesProblems('react', noDefault)[0] ?? '', /carries no \.arena-dark block/);
});

test('a palette whose block carries no color-scheme is reported, and so is one with no block at all', () => {
  const silent = themed(
    paletteBlock(':root', 'dark'),
    paletteBlock('.arena-dark', 'dark'),
    paletteBlock('.arena-light', null),
    paletteBlock(`.arena-${THIRD_PALETTE.name}`, 'dark'),
  );
  const problems = palettesProblems('react', silent);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /\.arena-light declares no color-scheme:light/);

  const missing = themed(paletteBlock(':root', 'dark'), paletteBlock('.arena-dark', 'dark'), paletteBlock('.arena-light', 'light'));
  assert.match(palettesProblems('react', missing)[0] ?? '', /carries no \.arena-dusk block/);
});

test('a command that refused a third palette is a failure rather than an empty theme sheet', () => {
  const problems = palettesProblems('angular', { ...ok, status: 1 });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /three palettes exited 1/);
});

const DUSK = { name: THIRD_PALETTE.name, polarity: THIRD_PALETTE.polarity, colors: { 'base-100': '#101010' } };
const dir = mkdtempSync(join(tmpdir(), 'arena-runtime-problems-'));
const LIGHT = { name: 'light', polarity: 'light', colors: { 'base-100': '#fafafa' } };
writeFileSync(join(dir, 'arena.config.json'), JSON.stringify({ palettes: [DUSK, LIGHT] }));
after(() => rmSync(dir, { recursive: true, force: true }));

const shipped = { 'color-base-100': '#101010', 'level-1': '4%' };
const decls = (m: Record<string, string>) => Object.entries(m).map(([k, v]) => `--${k}:${v};`).join('');
const shippedLight = { 'color-base-100': '#fafafa', 'level-1': '6%' };
const runtimeRun = (dusk = decls({ 'arena-palette': 'dusk', ...shipped }), light = decls({ 'arena-palette': 'light', ...shippedLight })): CliRun => ({
  ...ok,
  theme: `:root{--arena-palette:dark;--arena-runtime-palettes:1;}\n.arena-${THIRD_PALETTE.name}{${dusk}color-scheme:dark;}\n`
    + `.arena-light{${light}color-scheme:light;}\n.arena-polarity-dark{color-scheme:dark;}\n.arena-polarity-light{color-scheme:light;}`,
  runtime: JSON.stringify({ arenaRuntimePalettes: 1 }),
});
const DECLARED = 'arenaRuntimePalette: "dusk" is a palette the build declares, so its class .arena-dusk already exists';
const module_ = (over: Partial<Shipped> = {}): Shipped => ({
  declarations: { '--color-base-100': '#101010', '--level-1': '4%' },
  refusals: { dusk: DECLARED, 'dusk-runtime': null },
  ...over,
});
const lightModule = (): Shipped => ({
  declarations: { '--color-base-100': '#fafafa', '--level-1': '6%' },
  refusals: { light: 'arenaRuntimePalette: "light" is a palette the build declares, so its class .arena-light already exists', 'light-runtime': null },
});
const load = (m: Shipped, light: Shipped = lightModule()) => async (_layer: string, _dir: string, input: unknown) =>
  (input as { name: string }).name === 'light' ? light : m;

test('a runtime palette from the shipped module that equals the CLI class key by key passes', async () => {
  assert.deepEqual(await runtimeProblems('react', runtimeRun(), dir, load(module_())), []);
});

test('one declaration edited in the CLI class is named, and a missing file or marker is reported', async () => {
  const edited = runtimeRun(decls({ 'arena-palette': 'dusk', ...shipped, 'color-base-100': '#101011' }));
  const problems = await runtimeProblems('react', edited, dir, load(module_()));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /--color-base-100 is #101011/);
  assert.match((await runtimeProblems('react', { ...runtimeRun(), runtime: null }, dir, load(module_())))[0] ?? '', /wrote no/);
  const unmarked = { ...runtimeRun(), theme: runtimeRun().theme?.replace('--arena-runtime-palettes:1;', '') ?? '' };
  assert.match((await runtimeProblems('react', unmarked, dir, load(module_())))[0] ?? '', /--arena-runtime-palettes:1/);
});

test('a module that accepts a declared name, refuses for another reason, or refuses a free one, is reported', async () => {
  const accepting = await runtimeProblems('react', runtimeRun(), dir, load(module_({ refusals: { dusk: null, 'dusk-runtime': null } })));
  assert.match(accepting[0] ?? '', /accepted "dusk"/);
  const other = await runtimeProblems('react', runtimeRun(), dir,
    load(module_({ refusals: { dusk: 'palette: not an object', 'dusk-runtime': null } })));
  assert.match(other[0] ?? '', /for another reason: palette: not an object/);
  const refusing = await runtimeProblems('react', runtimeRun(), dir,
    load(module_({ refusals: { dusk: DECLARED, 'dusk-runtime': 'no' } })));
  assert.match(refusing[0] ?? '', /refused "dusk-runtime"/);
});

test('a light runtime palette is held against the light class and the light hook', async () => {
  const edited = runtimeRun(undefined, decls({ 'arena-palette': 'light', ...shippedLight, 'color-base-100': '#fafafb' }));
  const problems = await runtimeProblems('react', edited, dir, load(module_()));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /--color-base-100 is #fafafb in the class the CLI built for light and #fafafa/);
  const levelless = lightModule();
  levelless.declarations = { '--color-base-100': '#fafafa' };
  assert.match((await runtimeProblems('react', runtimeRun(), dir, load(module_(), levelless)))[0] ?? '', /--level-1 is 6% .* and absent from the shipped/);
  const unhooked = { ...runtimeRun(), theme: runtimeRun().theme?.replace('.arena-polarity-light{color-scheme:light;}', '') ?? '' };
  assert.match((await runtimeProblems('react', unhooked, dir, load(module_())))[0] ?? '', /carries no \.arena-light or no \.arena-polarity-light block/);
});

test('a key on one side only is named as absent, and color-scheme is compared between class and hook', async () => {
  const extra = runtimeRun(decls({ 'arena-palette': 'dusk', ...shipped, 'color-extra': '#fff' }));
  assert.match((await runtimeProblems('react', extra, dir, load(module_())))[0] ?? '', /--color-extra is #fff .* and absent from the shipped/);
  const omitted = module_({ declarations: { '--color-base-100': '#101010' } });
  assert.match((await runtimeProblems('react', runtimeRun(), dir, load(omitted)))[0] ?? '', /--level-1 is 4% .* and absent from the shipped/);
  const base = runtimeRun();
  const withScheme = (dusk: string, hook: string): CliRun => ({
    ...base,
    theme: `:root{--arena-palette:dark;--arena-runtime-palettes:1;}\n.arena-dusk{${decls({ 'arena-palette': 'dusk', ...shipped })}color-scheme:${dusk};}\n`
      + `.arena-light{${decls({ 'arena-palette': 'light', ...shippedLight })}color-scheme:light;}\n`
      + `.arena-polarity-dark{color-scheme:${hook};}\n.arena-polarity-light{color-scheme:light;}`,
  });
  assert.deepEqual(await runtimeProblems('react', withScheme('dark', 'dark'), dir, load(module_())), []);
  assert.match((await runtimeProblems('react', withScheme('dark', 'light'), dir, load(module_())))[0] ?? '', /color-scheme is dark/);
});

for (const condition of ['import', 'default']) test(`the loader resolves ./palette through the ${condition} condition of an installed package`, async () => {
  const fake = join(root, '.cache', `loader-test-${condition}`);
  rmSync(fake, { recursive: true, force: true });
  try {
    const pkg = join(fake, 'node_modules', '@dravensoft', 'arena-react');
    mkdirSync(join(pkg, 'bin'), { recursive: true });
    writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name: '@dravensoft/arena-react', type: 'module', exports: { './palette': { [condition]: './bin/p.mjs' } } }));
    writeFileSync(join(pkg, 'bin', 'p.mjs'), 'export const arenaPaletteDeclarations = () => ({ "--a": "1" });\n'
      + 'export const arenaRuntimePalette = (n) => { if (n === "x") throw new Error("taken"); };\n');
    const got = await installedPalette('react', fake, {}, {}, ['x', 'y']);
    assert.deepEqual(got, { declarations: { '--a': '1' }, refusals: { x: 'taken', y: null } });
  } finally {
    rmSync(fake, { recursive: true, force: true });
  }
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

test('a list naming arena-table alone imports the icon, pagination and select the table draws, and says so', () => {
  const said = 'arena build: 1 component sheet(s) named, and 3 Arena draws for you: arena-icon, arena-pagination, arena-select\n';
  const closed = { ...sheetImports('arena-table', 'arena-icon', 'arena-pagination', 'arena-select'), stdout: said };
  assert.deepEqual(closedListProblems('react', closed), []);

  const open = closedListProblems('react', { ...sheetImports('arena-table'), stdout: said });
  assert.equal(open.length, 1);
  assert.match(open[0] ?? '', /and not arena-icon, arena-pagination, arena-select/);

  const silent = closedListProblems('react', { ...closed, stdout: '' });
  assert.equal(silent.length, 1);
  assert.match(silent[0] ?? '', /said nothing/);

  const refused = closedListProblems('angular', { ...ok, status: 1, stderr: 'nope' });
  assert.equal(refused.length, 1);
  assert.match(refused[0] ?? '', /^angular: .* exited 1/);
});

test('a config naming no stylesheet is worked out like auto, so it imports the drawn sheets and never the barrel', () => {
  const drawn = sheetImports('arena-button', 'arena-table');
  assert.deepEqual(defaultListProblems('react', drawn), []);

  const barrel = defaultListProblems('react', { ...drawn, pkg: `@import '@dravensoft/arena-react/arena.css';\n${drawn.pkg}` });
  assert.equal(barrel.length, 1);
  assert.match(barrel[0] ?? '', /imports the barrel/);

  const short = defaultListProblems('react', sheetImports('arena-button'));
  assert.equal(short.length, 1);
  assert.match(short[0] ?? '', /and not arena-table/);

  const refused = defaultListProblems('angular', { ...ok, status: 1, stderr: 'nope' });
  assert.equal(refused.length, 1);
  assert.match(refused[0] ?? '', /^angular: .* exited 1/);
});

test('an unassembled package names both packages it lacks and the step that assembles them', () => {
  const reason = unassembled('/nowhere-at-all') ?? '';
  assert.match(reason, /react and angular is not assembled/);
  assert.match(reason, /run bun run build:packages first/);
});

const refusal = (base: string, strict: string) => spawnSync(process.execPath, ['-e', [
  `const { refuseUnassembled } = await import(${JSON.stringify(pathToFileURL(join(root, 'scripts', 'check', 'arena', 'check-consumer.ts')).href)});`,
  `refuseUnassembled(${JSON.stringify(base)}, { ARENA_CHECK_STRICT: ${JSON.stringify(strict)} });`,
  "console.log('went on');",
].join('\n')], { encoding: 'utf8' });

test('a missing dist/ stops the gate before it runs anything: a SKIP', () => {
  const soft = refusal('/nowhere-at-all', '0');
  assert.equal(soft.status, 2, soft.stderr);
  assert.match(soft.stderr, /check:consumer: SKIPPED/);
  assert.match(soft.stderr, /bun run build:packages first/);
  assert.doesNotMatch(soft.stdout, /went on/);
});

test('a strict run turns the SKIP of a missing dist/ into a failure', () => {
  const strict = refusal('/nowhere-at-all', '1');
  assert.equal(strict.status, 1, strict.stderr);
  assert.match(strict.stderr, /FAILED \(strict\)/);
});

test('two assembled packages let a strict run go on', () => {
  const base = mkdtempSync(join(tmpdir(), 'check-consumer-assembled-'));
  try {
    for (const layer of ['react', 'angular']) {
      mkdirSync(distDir(layer, base), { recursive: true });
      writeFileSync(join(distDir(layer, base), 'package.json'), '{}\n');
    }
    const assembled = refusal(base, '1');
    assert.equal(assembled.status, 0, assembled.stderr);
    assert.match(assembled.stdout, /went on/, 'two assembled packages are the case that lets the gate go on');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

const FONT_BASE = (() => {
  const base = mkdtempSync(join(tmpdir(), 'arena-fontbase-'));
  const dist = join(base, 'frameworks', 'react', 'dist');
  mkdirSync(join(dist, 'fonts'), { recursive: true });
  const fonts: Record<string, { family: string; src: string }> = {};
  for (const [role, stem] of [['display', 'archivo'], ['body', 'familjen-grotesk'], ['mono', 'spline-sans-mono']] as const) {
    writeFileSync(join(dist, 'fonts', `${stem}.woff2`), 'x'.repeat(1000));
    fonts[role] = { family: stem, src: `./fonts/${stem}.woff2` };
  }
  writeFileSync(join(dist, 'arena.config.example.json'), JSON.stringify({ fonts }));
  after(() => rmSync(base, { recursive: true, force: true }));
  return base;
})();

const SOURCE_SIZES: Record<string, number> = { archivo: 1000, 'familjen-grotesk': 1000, 'spline-sans-mono': 1000 };

const cuts = (shrink = 0.5, drop: string[] = []): CliRun => {
  const fonts: Record<string, number> = {};
  let n = 0;
  for (const [stem, size] of Object.entries(SOURCE_SIZES)) {
    if (drop.includes(stem)) continue;
    fonts[`${stem}-${String(n++).repeat(10).slice(0, 10)}.woff2`] = Math.floor(size * shrink);
  }
  return { ...ok, fonts, theme: Object.keys(fonts).map((name) => `src:url('./${name}') format('woff2');`).join('\n') };
};

test('the default fixture\'s build writes a content-hashed woff2 per font, each smaller than its source, and the theme names them', () => {
    assert.deepEqual(fontCutProblems('react', cuts(), FONT_BASE), []);

  const none = fontCutProblems('react', { ...ok }, FONT_BASE);
  assert.equal(none.length, Object.keys(SOURCE_SIZES).length);
  assert.match(none[0] ?? '', /wrote no .*-<hash>\.woff2/);

  const bigger = fontCutProblems('react', cuts(1.2), FONT_BASE);
  assert.equal(bigger.length, Object.keys(SOURCE_SIZES).length);
  assert.match(bigger[0] ?? '', /is not smaller than its source/);

  const stem = Object.keys(SOURCE_SIZES)[0] ?? '';
  const missing = fontCutProblems('react', cuts(0.5, [stem]), FONT_BASE);
  assert.equal(missing.length, 1);
  assert.ok(missing[0]?.includes(stem));

  const whole = fontCutProblems('react', { ...cuts(), theme: `${cuts().theme}\nfont-weight:100 900;` }, FONT_BASE);
  assert.equal(whole.length, 1);
  assert.match(whole[0] ?? '', /whole 100-900 axis/);

  const unnamed = fontCutProblems('react', { ...cuts(), theme: "src:url('./fonts/archivo.woff2');" }, FONT_BASE);
  assert.ok(unnamed.some((one) => /arena\.generated\.css does not name/.test(one)));
  assert.ok(unnamed.some((one) => /still points at the source/.test(one)));
});

const HEAD = "/* GENERATED by arena build. */\n";
const PKG_NAME = '@dravensoft/arena-react';
const closedSheet = [HEAD, ...['colors', 'prelude', 'style-plugin-default'].map((n) => `@import '${PKG_NAME}/css/${n}.css';`),
  `@import '${PKG_NAME}/css/vocabulary/stack.css';`].join('\n');

test('the package sheet holds the closed list, the theme sheet imports none of it, and an app-only edit leaves its bytes', () => {
  const built: CliRun = { ...ok, pkg: closedSheet, theme: ':root{--arena-palette:dark;}\n' };
  assert.deepEqual(packageSheetProblems('react', built, built, PKG_NAME), []);

  const none = packageSheetProblems('react', { ...built, pkg: null }, built, PKG_NAME);
  assert.match(none.join('\n'), /wrote no arena\.package\.generated\.css/);

  const short = packageSheetProblems('react', { ...built, pkg: closedSheet.replace(/.*css\/colors\.css.*\n/, '') }, built, PKG_NAME);
  assert.match(short.join('\n'), /imports no .*css\/colors\.css/);

  const leaky = packageSheetProblems('react', { ...built, theme: `@import '${PKG_NAME}/css/colors.css';\n${built.theme}` }, built, PKG_NAME);
  assert.match(leaky.join('\n'), /arena\.generated\.css imports the package/);

  const moved = packageSheetProblems('react', built, { ...built, pkg: `${closedSheet}\n/* x */` }, PKG_NAME);
  assert.match(moved.join('\n'), /edit that touched only the app changed the package sheet/);
});

test('the sprite must also carry a glyph named without a weight, drawn regular', () => {
  assert.equal(REGULAR_SYMBOL, 'ph-regular-star');
  const missing = spriteProblems('react', written({ [NAME]: sprite(GLYPH_SYMBOL, NAV_SYMBOL) }));
  assert.match(missing.join('\n'), new RegExp(`holds no #${REGULAR_SYMBOL}`));
  assert.deepEqual(spriteProblems('react', written({ [NAME]: sprite(GLYPH_SYMBOL, NAV_SYMBOL, REGULAR_SYMBOL) })), []);
});

test('a provider the run reports as a component it does not ship is a problem, a typo reported is not', () => {
  const reported = (name: string): CliRun => ({ ...ok, stderr: `${name} is not a component this package ships\n` });
  assert.deepEqual(unplacedProblems('react', reported('ArenaWidget'), 'ArenaWidget'), []);
  const provider = unplacedProblems('react', reported(PROVIDER), 'ArenaWidget');
  assert.equal(provider.length, 1);
  assert.match(provider[0] ?? '', new RegExp(`${PROVIDER} is a provider this package exports`));
  assert.equal(unplacedProblems('react', ok, 'ArenaWidget').length, 1, 'silence about a typo is still a problem');
});
