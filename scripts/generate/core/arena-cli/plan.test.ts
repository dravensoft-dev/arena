/* plan() answers what a build would leave on disk without leaving anything: every case reads the
 * Plan and the tree, and the theme and sprite cases assert on outputs instead of on files. */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fontToolRoots } from './host.ts';
import { LATIN_1, cutFont } from './font-cut.ts';
import { loadFontTools } from './font-files.ts';
import { plan, sheetStates } from './plan.ts';
import type { SheetOutput } from './plan.ts';
import { RETIRED_ICONS_SHEET as ICONS_SHEET } from './sources.ts';
import { THEME_SHEET, PACKAGE_SHEET, PLUGIN_SHEET, RUNTIME_DATA, ICON_MANIFEST, SPRITE_MODULE, SPRITE_TYPES, SPRITE_STEM } from './sheets.ts';
import type { ComponentMap } from './components.ts';
import { auto, hostRoot, MAP, SHEETS, options, phosphor, project, readable, removeFixtures } from './cli-fixtures.ts';

after(removeFixtures);

const NAME = '@dravensoft/arena-react';

const CATALOGUED = {
  layers: ['css/reset.css'],
  components: ['button'],
  catalogue: { tokens: { 'color-base-200': 'var(--color-base-200)', 'lh-prose': '1.6', 'lh-heading': '1.5', 'measure-prose': '72ch' }, roles: { 'ink-eyebrow': { type: 'color' } } },
};

function environment(core: string | null, extra: Record<string, unknown> = {}) {
  return { arena: null, packageName: NAME, sheets: null, map: null, vocabulary: null, phosphor: core, ...extra };
}

function withPlugin(css: string) {
  const root = project({ ...readable, stylePlugins: ['default', './design/andina'] });
  mkdirSync(join(root, 'design', 'andina'), { recursive: true });
  writeFileSync(join(root, 'design', 'andina', 'plugin.tokens.json'), JSON.stringify({ 'ink-eyebrow': { $value: '{color.base-200}', $type: 'color' } }));
  writeFileSync(join(root, 'design', 'andina', 'plugin.css'), css);
  return root;
}

const DEFAULTED = {
  ...CATALOGUED,
  catalogue: {
    tokens: { ...CATALOGUED.catalogue.tokens, 'ink-link': 'var(--color-base-content)' },
    roles: { 'ink-eyebrow': { type: 'color' }, 'ink-link': { type: 'color', default: '{ink-eyebrow}' } },
  },
};

function ownRoot() {
  const root = project({ ...readable, stylePlugins: ['./design/andina'] });
  mkdirSync(join(root, 'design', 'andina'), { recursive: true });
  writeFileSync(join(root, 'design', 'andina', 'plugin.tokens.json'),
    JSON.stringify({ 'ink-eyebrow': { $value: '{color.base-200}', $type: 'color' } }));
  return root;
}

function cleanup(...paths: string[]) {
  for (const path of paths) rmSync(path, { recursive: true, force: true });
}

test('the plan writes nothing: the out directory is untouched after a successful plan', async () => {
  const { root: held, core } = phosphor();
  const root = project();
  const before = readdirSync(join(root, 'src')).sort();
  const result = await plan(options(root), environment(core));
  assert.equal(result.code, 0);
  assert.deepEqual(readdirSync(join(root, 'src')).sort(), before);
  cleanup(root, held);
});

const spriteOf = (result: Awaited<ReturnType<typeof plan>>) =>
  result.outputs.find((one) => one.name.startsWith(`${SPRITE_STEM}-`) && one.name.endsWith('.svg'));
const packageOf = (result: Awaited<ReturnType<typeof plan>>) => result.outputs.find((one) => one.name === PACKAGE_SHEET)?.content ?? '';
const symbolsOf = (result: Awaited<ReturnType<typeof plan>>) =>
  [...(spriteOf(result)?.content ?? '').matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]);

test('outputs are theme, package, plugin, then the sprite and its module pair, each at out/name', async () => {
  const { root: held, core } = phosphor();
  const root = withPlugin('.x { color: red }\n');
  const result = await plan(options(root), environment(core, { sheets: CATALOGUED }));
  assert.deepEqual(result.fatal, []);
  const sprite = spriteOf(result)!;
  assert.deepEqual(result.outputs.map((one) => one.name), [THEME_SHEET, PACKAGE_SHEET, PLUGIN_SHEET, sprite.name, SPRITE_MODULE, SPRITE_TYPES]);
  for (const one of result.outputs) assert.equal(one.path, join(root, 'src', one.name));
  const [theme, pack, plugin, icons] = [result.outputs[0], result.outputs[1], result.outputs[2], sprite];
  assert.match(pack!.content, /@import '@dravensoft\/arena-react\/css\/reset\.css';/);
  assert.doesNotMatch(pack!.content, /arena\.css/);
  assert.doesNotMatch(theme!.content, /@import '@dravensoft/, 'the app\'s half imports none of the package');
  assert.match(theme!.summary, /^\d+ bytes$/);
  assert.match(plugin!.content, /@layer arena-plugin \{/);
  assert.match(plugin!.summary, /bytes, wrapped in @layer arena-plugin$/);
  assert.match(icons.content, /<symbol id="ph-bold-bell" /);
  assert.match(icons.summary, /2 symbol\(s\), 1 named by your sources and 0 drawn by Arena's own components, 2 weight\(s\)/);
  cleanup(root, held);
});

test('no plugin carrying css gives no plugin output', async () => {
  const { root: held, core } = phosphor();
  const root = project();
  const result = await plan(options(root), environment(core));
  assert.deepEqual(result.outputs.map((one) => one.name), [THEME_SHEET, PACKAGE_SHEET, spriteOf(result)!.name, SPRITE_MODULE, SPRITE_TYPES]);
  cleanup(root, held);
});

test('a build writes the sprite, its module, and no icon sheet', async () => {
  const { root: held, core } = phosphor();
  const root = project();
  const result = await plan(options(root), environment(core));
  assert.equal(result.code, 0);
  const names = result.outputs.map((one) => one.name);
  assert.ok(!names.includes(ICONS_SHEET), 'icons.generated.css is not written');
  const sprite = spriteOf(result)!;
  assert.match(sprite.name, /^icons-[0-9a-f]{10}\.svg$/);
  assert.match(sprite.content, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  const module = result.outputs.find((one) => one.name === SPRITE_MODULE)!;
  assert.equal(module.content, `export const ARENA_SPRITE = '${sprite.name}';\n`);
  assert.equal(result.outputs.find((one) => one.name === SPRITE_TYPES)!.content, 'export declare const ARENA_SPRITE: string;\n');
  cleanup(root, held);
});

test('two runs on the same sources write the same file name, and other glyphs write another', async () => {
  const { root: held, core } = phosphor();
  const one = project(readable, { 'a.html': '<i class="ph-bold ph-bell"></i><i class="ph-bold ph-moon"></i>' });
  const two = project(readable, { 'b.html': '<i class="ph-bold ph-moon"></i><i class="ph-bold ph-bell"></i>' });
  const other = project(readable, { 'c.html': '<i class="ph-bold ph-sun"></i>' });
  const names = await Promise.all([one, two, other].map(async (root) => spriteOf(await plan(options(root), environment(core)))!.name));
  assert.equal(names[0], names[1]);
  assert.notEqual(names[0], names[2]);
  cleanup(one, two, other, held);
});

test('an old icons.generated.css and an old icons-*.svg are orphans, and the new sprite is not', async () => {
  const { root: held, core } = phosphor();
  const root = project();
  writeFileSync(join(root, 'src', ICONS_SHEET), 'old');
  writeFileSync(join(root, 'src', 'icons-0123456789.svg'), '<svg/>');
  writeFileSync(join(root, 'src', 'icons-mine.svg'), '<svg/>');
  const first = await plan(options(root), environment(core));
  assert.deepEqual([...first.orphans].sort(), [ICONS_SHEET, 'icons-0123456789.svg'].sort());
  const sprite = spriteOf(first)!;
  writeFileSync(sprite.path, sprite.content);
  assert.ok(!(await plan(options(root), environment(core))).orphans.includes(sprite.name));
  cleanup(root, held);
});

test('a source drawing ph ph-bell writes a sprite holding ph-regular-bell, the id every reader points at', async () => {
  const { root: held, core } = phosphor(['regular', 'bold', 'fill']);
  const root = project(readable, { 'app.html': '<i class="ph ph-bell"></i><i class="ph-bold ph-moon"></i><i class="x" data-i="ph-sun"></i>' });
  const result = await plan(options(root), environment(core));
  assert.equal(result.code, 0);
  const ids = symbolsOf(result);
  assert.ok(ids.includes('ph-regular-bell'), `regular id in ${ids.join(' ')}`);
  assert.ok(ids.includes('ph-regular-sun'), 'a weightless name draws regular');
  assert.ok(!ids.includes('ph-bell'), 'no bare ph-<name> id');
  cleanup(root, held);
});

test('a glyph Phosphor lacks at that weight is a glyph report naming weight and name, with no symbol and no throw', async () => {
  const { root: held, core } = phosphor();
  const root = project(readable, { 'app.html': '<i class="ph-fill ph-not-a-glyph"></i><i class="ph-bold ph-bell"></i>' });
  const result = await plan(options(root), environment(core));
  assert.equal(result.code, 0);
  const glyph = result.reports.filter((one) => one.kind === 'glyph');
  assert.equal(glyph.length, 1);
  assert.match(glyph[0]!.message, /fill: ph-not-a-glyph is not an icon Phosphor draws at that weight/);
  assert.deepEqual(symbolsOf(result), ['ph-bold-bell', 'ph-fill-bell'], 'with no map every glyph also gets the filled weight');
  assert.ok(!spriteOf(result)!.content.includes('not-a-glyph'));
  cleanup(root, held);
});

test('an unreadable config is code 2 with no outputs, and an invalid one is code 1 with no outputs', async () => {
  const { root: held, core } = phosphor();
  const root = project(null);
  writeFileSync(join(root, 'arena.config.json'), '{ not json');
  const unreadable = await plan(options(root), environment(core));
  assert.equal(unreadable.code, 2);
  assert.ok(unreadable.fatal.some((m) => m.includes('cannot read')));
  assert.deepEqual(unreadable.outputs, []);

  const broken = structuredClone(readable);
  delete broken.palettes[0]?.colors.primary;
  const invalid = project(broken);
  const result = await plan(options(invalid), environment(core));
  assert.equal(result.code, 1);
  assert.ok(result.fatal.some((m) => m.includes('missing primary')));
  assert.deepEqual(result.outputs, []);
  cleanup(root, invalid, held);
});

test('a missing --src is code 2 before the theme runs', async () => {
  const { root: held, core } = phosphor();
  const root = project(auto);
  const gone = join(root, 'nowhere');
  const result = await plan({ ...options(root), paths: [gone] }, environment(core, { sheets: SHEETS, map: MAP }));
  assert.equal(result.code, 2);
  assert.deepEqual(result.fatal, [`${gone} is not there`]);
  assert.deepEqual(result.outputs, []);
  cleanup(root, held);
});

test('a missing @phosphor-icons/core is fatal 2 naming it as a dependency of the package, and no outputs', async () => {
  const root = project();
  const result = await plan(options(root), environment(null));
  assert.equal(result.code, 2);
  assert.ok(result.fatal.some((m) => m.includes('cannot find @phosphor-icons/core') && m.includes('dependency of this package')));
  assert.ok(!result.fatal.some((m) => m.includes('@phosphor-icons/web')));
  assert.deepEqual(result.outputs, []);
  cleanup(root);
});

test('no weight class found is code 1 with no outputs', async () => {
  const { root: held, core } = phosphor();
  const root = project(readable, { 'app.html': '<h1>no icons</h1>' });
  const result = await plan(options(root), environment(core));
  assert.equal(result.code, 1);
  assert.ok(result.fatal.some((m) => m.includes('no Phosphor weight class')));
  assert.deepEqual(result.outputs, []);
  cleanup(root, held);
});

test('a contrast report leaves the code 0 and the outputs present', async () => {
  const { root: held, core } = phosphor();
  const dim = structuredClone(readable);
  dim.palettes[0]!.colors['base-content'] = '#1a1a1a';
  const root = project(dim);
  const result = await plan(options(root), environment(core));
  assert.equal(result.code, 0);
  assert.ok(result.reports.some((one) => one.kind === 'contrast' && one.message.includes('under the 4.5:1')));
  assert.equal(result.outputs.length, 5);
  cleanup(root, held);
});

test('"auto" resolves and notes, and "auto" with no map or nothing found is fatal', async () => {
  const { root: held, core } = phosphor();
  const drawn = project(auto, { 'app.html': '<arena-table /><arena-button icon="ph-bold ph-bell" />' });
  const result = await plan(options(drawn), environment(core, { sheets: SHEETS, map: MAP }));
  assert.equal(result.code, 0);
  assert.match(result.notes[0] ?? '', /2 component sheet\(s\) drawn, and 2 Arena draws for you: pagination, select/);
  assert.match(packageOf(result), /css\/components\/pagination\.css/);

  const nomap = await plan(options(drawn), environment(core, { sheets: SHEETS, map: null }));
  assert.equal(nomap.code, 1);
  assert.ok(nomap.fatal.some((m) => m.includes('reads the component map this package carries')));

  const empty = project(auto, { 'app.html': '<h1>ours alone</h1>' });
  const none = await plan(options(empty), environment(core, { sheets: SHEETS, map: MAP }));
  assert.equal(none.code, 1);
  assert.ok(none.fatal.some((m) => m.includes('found no Arena component')));
  assert.deepEqual(none.outputs, []);
  cleanup(drawn, empty, held);
});

const WITH_SLOT = { ...SHEETS, layers: [...SHEETS.layers, 'css/style-plugin-default.css'] };

test('a config naming no stylesheet resolves auto against the map', async () => {
  const { root: held, core } = phosphor();
  const root = project(readable, { 'app.html': '<arena-button icon="ph-bold ph-bell" />' });
  const result = await plan(options(root), environment(core, { sheets: WITH_SLOT, map: MAP }));
  assert.equal(result.code, 0);
  const theme = packageOf(result);
  assert.match(theme, /css\/components\/button\.css/);
  assert.doesNotMatch(theme, /css\/components\/table\.css/);
  assert.doesNotMatch(theme, /arena\.css/);
  assert.match(theme, /css\/style-plugin-default\.css/);
  assert.match(result.notes[0] ?? '', /1 component sheet\(s\) drawn/);
  cleanup(root, held);
});

test('a config naming no stylesheet and drawing no Arena component imports no component sheet', async () => {
  const { root: held, core } = phosphor();
  const root = project(readable, { 'app.html': '<i class="ph-bold ph-bell"></i>' });
  const result = await plan(options(root), environment(core, { sheets: WITH_SLOT, map: MAP }));
  assert.equal(result.code, 0);
  assert.doesNotMatch(packageOf(result), /css\/components\//);
  cleanup(root, held);
});

test('with no map beside the command, a config naming no stylesheet imports every component sheet and reports it', async () => {
  const { root: held, core } = phosphor();
  const root = project();
  const result = await plan(options(root), environment(core, { sheets: WITH_SLOT, map: null }));
  assert.equal(result.code, 0);
  assert.ok(result.reports.some((one) => one.kind === 'environment' && one.message.includes('component map is not beside')));
  for (const name of SHEETS.components) assert.ok(packageOf(result).includes(`css/components/${name}.css`), name);
  cleanup(root, held);
});

test('a stale plugin.generated.css is an orphan when no plugin carries css, and none when one does', async () => {
  const { root: held, core } = phosphor();
  const root = project();
  writeFileSync(join(root, 'src', PLUGIN_SHEET), 'old');
  const orphaned = await plan(options(root), environment(core));
  assert.deepEqual(orphaned.orphans, [PLUGIN_SHEET]);

  const carried = withPlugin('.x { color: red }\n');
  writeFileSync(join(carried, 'src', PLUGIN_SHEET), 'old');
  assert.deepEqual((await plan(options(carried), environment(core, { sheets: CATALOGUED }))).orphans, []);
  cleanup(root, carried, held);
});

test('orphans are empty when fatal', async () => {
  const root = project();
  writeFileSync(join(root, 'src', PLUGIN_SHEET), 'old');
  const result = await plan(options(root), environment(null));
  assert.notEqual(result.code, 0);
  assert.deepEqual(result.orphans, []);
  cleanup(root);
});

test('sheetStates: missing, then current after writing the content, then stale after editing it', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-states-'));
  const output: SheetOutput = { name: THEME_SHEET, path: join(dir, THEME_SHEET), content: 'a{}', summary: '3 bytes' };
  assert.deepEqual(sheetStates([output]), [{ path: output.path, state: 'missing' }]);
  writeFileSync(output.path, output.content);
  assert.deepEqual(sheetStates([output]), [{ path: output.path, state: 'current' }]);
  writeFileSync(output.path, 'b{}');
  assert.deepEqual(sheetStates([output]), [{ path: output.path, state: 'stale' }]);
  cleanup(dir);
});

test('the sprite is written at out even when out does not exist yet', async () => {
  const { root: held, core } = phosphor();
  const root = project();
  const out = join(root, 'src', 'styles', 'deep');
  const result = await plan({ ...options(root), out }, environment(core));
  assert.equal(result.code, 0);
  const sprite = spriteOf(result)!;
  assert.equal(sprite.path, join(out, sprite.name));
  assert.equal(result.outputs.find((one) => one.name === SPRITE_MODULE)!.path, join(out, SPRITE_MODULE));
  cleanup(root, held);
});

test('a fatal plan keeps the reports gathered before it, with no outputs and no orphans', async () => {
  const { root: held, core } = phosphor();
  const arena = hostRoot('@dravensoft/arena-react', '11.1.0');
  const root = project(readable, { 'app.html': '<h1>no icons</h1>' });
  writeFileSync(join(root, 'src', PLUGIN_SHEET), 'old');
  const result = await plan(options(root), environment(core, { arena }));
  assert.equal(result.code, 1);
  assert.ok(result.reports.some((one) => one.kind === 'environment' && one.message.includes('is not beside this package')));
  assert.deepEqual(result.outputs, []);
  assert.deepEqual(result.orphans, []);
  cleanup(root, held, arena);
});

test('the icons Arena draws itself come from the list the package ships, not from reading it as text', async () => {
  const { root: held, core } = phosphor();
  const arena = hostRoot('@dravensoft/arena-react', '11.1.0', {
    [ICON_MANIFEST]: JSON.stringify({ components: { 'arena-button': { pairs: { bold: ['ph-sun'] }, loose: [] } }, fills: [] }),
    'index.d.ts': '/** Phosphor class name, e.g. \'ph-bold ph-moon\'. */',
  });
  const root = project();
  const result = await plan(options(root), environment(core, { arena }));
  const css = spriteOf(result)?.content ?? '';
  assert.match(css, /ph-bold-sun/, 'a glyph the package declares it draws reaches the sprite');
  assert.doesNotMatch(css, /ph-bold-moon/, 'a glyph named in a sentence about the API is not one anything draws');
  cleanup(root, held, arena);
});

test('running outside an Arena package reports the environment and nothing else', async () => {
  const { root: held, core } = phosphor();
  const root = project();
  const result = await plan(options(root), environment(core));
  assert.equal(result.code, 0);
  const outside = result.reports.filter((one) => one.message.includes('not running from inside an Arena package'));
  assert.equal(outside.length, 1);
  assert.equal(outside[0]!.kind, 'environment');
  assert.deepEqual(result.reports.filter((one) => one.kind === 'environment' || one.kind === 'glyph').map((one) => one.kind), ['environment']);
  cleanup(root, held);
});

const named = (components: unknown[]) => ({ ...readable, stylesheet: { components } });
const imported = (css: string) => [...css.matchAll(/css\/components\/([a-z-]+)\.css/g)].map((m) => m[1]);

test('a named list is closed against the map, keeps its order, and notes what Arena added', async () => {
  const { root: held, core } = phosphor();
  const root = project(named(['table']));
  const result = await plan(options(root), environment(core, { sheets: SHEETS, map: MAP }));
  assert.equal(result.code, 0);
  assert.deepEqual(result.notes, ['1 component sheet(s) named, and 2 Arena draws for you: pagination, select']);
  assert.deepEqual(imported(packageOf(result)), ['table', 'pagination', 'select']);
  cleanup(root, held);
});

test('with no map beside the command a named list is used as written, with no note', async () => {
  const { root: held, core } = phosphor();
  const root = project(named(['table']));
  const result = await plan(options(root), environment(core, { sheets: SHEETS, map: null }));
  assert.equal(result.code, 0);
  assert.deepEqual(result.notes, []);
  assert.deepEqual(imported(packageOf(result)), ['table']);
  cleanup(root, held);
});

test('a named list that already holds what it needs writes the bytes it writes with no map, and notes nothing', async () => {
  const { root: held, core } = phosphor();
  const root = project(named(['select', 'table', 'pagination']));
  const closed = await plan(options(root), environment(core, { sheets: SHEETS, map: MAP }));
  const asWritten = await plan(options(root), environment(core, { sheets: SHEETS, map: null }));
  assert.equal(closed.code, 0);
  assert.deepEqual(closed.notes, []);
  assert.equal(packageOf(closed), packageOf(asWritten));
  assert.equal(closed.outputs[0]!.content, asWritten.outputs[0]!.content);
  cleanup(root, held);
});

test('a name the package does not ship still stops a closed list, naming the shipped sheets', async () => {
  const { root: held, core } = phosphor();
  for (const name of ['tabel', 'constructor', '__proto__', 7, null]) {
    const root = project(named(['table', name]));
    const result = await plan(options(root), environment(core, { sheets: SHEETS, map: MAP }));
    assert.equal(result.code, 1, String(name));
    assert.deepEqual(result.fatal, [`stylesheet.components: ${JSON.stringify(name)} is not a sheet this package ships, `
      + 'which are button, pagination, select, table']);
    assert.deepEqual(result.outputs, []);
    cleanup(root);
  }
  cleanup(held);
});

test('a name written twice is still refused once the list is closed', async () => {
  const { root: held, core } = phosphor();
  const root = project(named(['table', 'table']));
  const result = await plan(options(root), environment(core, { sheets: SHEETS, map: MAP }));
  assert.equal(result.code, 1);
  assert.deepEqual(result.fatal, ['stylesheet.components: table is named twice']);
  cleanup(root, held);
});

test('a root plugin silent on a role with a kernel default builds through its own answer and notes the role', async () => {
  const { root: held, core } = phosphor();
  const root = ownRoot();
  const result = await plan(options(root), environment(core, { sheets: DEFAULTED }));
  assert.deepEqual(result.fatal, []);
  assert.deepEqual(result.notes, ['1 role(s) your root style plugin leaves unanswered take Arena\'s default: ink-link']);
  const theme = result.outputs.find((one) => one.name === THEME_SHEET)?.content ?? '';
  assert.match(theme, /:root\{[^}]*--ink-link:var\(--color-base-200\);/);
  assert.doesNotMatch(theme, /--ink-link:var\(--color-base-content\)/);
  cleanup(root, held);
});

test('the same role without a default stops the build with the totality message', async () => {
  const { root: held, core } = phosphor();
  const root = ownRoot();
  const bare = { ...DEFAULTED, catalogue: { ...DEFAULTED.catalogue,
    roles: { 'ink-eyebrow': { type: 'color' }, 'ink-link': { type: 'color' } } } };
  const result = await plan(options(root), environment(core, { sheets: bare }));
  assert.equal(result.code, 1);
  assert.deepEqual(result.fatal, ['stylePlugins[0]: the root style plugin does not answer ink-link. A custom property '
    + 'with no value is invalid at computed-value time, so the declaration reading it is dropped and the property '
    + 'disappears: an unanswered role is not a plainer appearance, it is a missing border.']);
  cleanup(root, held);
});

test('a root that is the default plugin is never completed and notes nothing', async () => {
  const { root: held, core } = phosphor();
  const root = withPlugin('.x { color: red }\n');
  const result = await plan(options(root), environment(core, { sheets: DEFAULTED }));
  assert.deepEqual(result.fatal, []);
  assert.deepEqual(result.notes, []);
  cleanup(root, held);
});

test('a build with runtimePalettes writes arena.runtime.generated.json', async () => {
  const { root: held, core } = phosphor();
  const root = ownRoot();
  const file = join(root, 'arena.config.json');
  writeFileSync(file, JSON.stringify({ ...JSON.parse(readFileSync(file, 'utf8')), runtimePalettes: true }));
  writeFileSync(join(root, 'design', 'andina', 'plugin.tokens.json'), JSON.stringify({
    'ink-eyebrow': { $value: '{color.base-200}', $type: 'color' },
    light: { 'ink-eyebrow': { $value: '{color.base-100}', $type: 'color' } },
  }));
  const sheets = {
    ...CATALOGUED,
    scopes: ['table'],
    catalogue: { ...CATALOGUED.catalogue, tokens: { ...CATALOGUED.catalogue.tokens, 'color-base-100': 'var(--color-base-100)', 'ink-eyebrow': 'var(--color-base-content)' } },
  };
  const result = await plan(options(root), environment(core, { sheets }));
  assert.deepEqual(result.fatal, []);
  const data = result.outputs.find((one) => one.name === RUNTIME_DATA);
  assert.ok(data, 'the data file is an output');
  assert.equal(data.path, join(options(root).out, RUNTIME_DATA));
  const parsed = JSON.parse(data.content);
  assert.equal(parsed.arenaRuntimePalettes, 1);
  assert.deepEqual(parsed.declared, JSON.parse(readFileSync(file, 'utf8')).palettes.map((p: any) => p.name));
  assert.deepEqual(parsed.taken, ['table']);
  const differing = Object.keys(parsed.roles.dark).filter((k) => parsed.roles.dark[k] !== parsed.roles.light[k]);
  assert.deepEqual(differing, ['ink-eyebrow'], 'the roles differ exactly where the root plugin\'s light group answers');
  assert.equal(parsed.roles.dark['ink-eyebrow'], 'var(--color-base-200)');
  assert.equal(parsed.roles.light['ink-eyebrow'], 'var(--color-base-100)');
  assert.ok(data.content.endsWith('}\n'));
  cleanup(root, held);
});

test('turning the key off removes the data file', async () => {
  const { root: held, core } = phosphor();
  const root = project();
  writeFileSync(join(root, 'src', RUNTIME_DATA), '{}');
  assert.deepEqual((await plan(options(root), environment(core))).orphans, [RUNTIME_DATA]);
  cleanup(root, held);
});

const DRAWS: ComponentMap = {
  match: 'selector',
  draws: { 'arena-button': 'button', 'arena-alert': 'alert', 'arena-side-nav-item': 'side-nav-item' },
  needs: {},
};
const DRAW_SHEETS = { layers: ['css/base.css'], components: ['alert', 'button', 'side-nav-item'] };
const SHIPPED = JSON.stringify({
  components: {
    'arena-alert': { pairs: { fill: ['ph-moon'] }, loose: [] },
    'arena-button': { pairs: { bold: ['ph-sun'] }, loose: [] },
  },
  fills: ['arena-side-nav-item'],
});

async function icons(files: Record<string, string>, extra: Record<string, unknown> = {}, config: object = auto) {
  const { root: held, core } = phosphor();
  const arena = hostRoot('@dravensoft/arena-react', '11.1.0', { [ICON_MANIFEST]: SHIPPED });
  const root = project(config, files);
  const result = await plan(options(root), environment(core, { arena, sheets: DRAW_SHEETS, map: DRAWS, ...extra }));
  cleanup(root, held, arena);
  return result;
}

const sheetOf = (result: Awaited<ReturnType<typeof plan>>) => symbolsOf(result).join(' ');

test('the glyph list follows the drawn components', async () => {
  const button = sheetOf(await icons({ 'app.html': '<arena-button></arena-button>' }));
  assert.match(button, /ph-bold-sun/, 'the button the source draws brings its own glyph');
  assert.doesNotMatch(button, /ph-fill-moon/, 'the alert it does not draw brings none');
  const alert = sheetOf(await icons({ 'app.html': '<arena-button></arena-button><arena-alert></arena-alert>' }));
  assert.match(alert, /ph-fill-moon/, 'the alert it draws brings its filled glyph');
});

test('the filled weight takes the glyphs named beside a component that swaps to it, and nothing else', async () => {
  const css = sheetOf(await icons({
    'a.html': '<arena-button icon="ph-bold ph-sun"></arena-button>',
    'b.html': '<arena-side-nav-item icon="ph-bold ph-bell"></arena-side-nav-item>',
  }));
  assert.match(css, /ph-fill-bell/);
  assert.doesNotMatch(css, /ph-fill-sun/);
  assert.match(css, /ph-bold-sun/);
});

test('an active navigation item whose glyph the consumer passes brings the filled symbol (Review Focus 1)', async () => {
  const { root: held, core } = phosphor();
  const arena = hostRoot(NAME, '11.1.0', {
    [ICON_MANIFEST]: JSON.stringify({ components: { ArenaSideNavItem: { pairs: {}, loose: [] } }, fills: ['ArenaSideNavItem'] }),
  });
  const map: ComponentMap = { match: 'symbol', draws: { ArenaSideNavItem: 'side-nav-item' }, needs: {} };
  const root = project(auto, {
    'App.tsx': `import { ArenaSideNavItem } from '${NAME}';\n`
      + 'export const App = () => <ArenaSideNavItem icon="ph-bold ph-house" active>Home</ArenaSideNavItem>;\n',
  });
  const result = await plan(options(root), environment(core, { arena, sheets: { layers: [], components: ['side-nav-item'] }, map }));
  assert.equal(result.code, 0);
  assert.deepEqual(symbolsOf(result), ['ph-bold-house', 'ph-fill-house']);
  cleanup(root, held, arena);
});

test('with no map the sprite carries every component and says the map is missing', async () => {
  const result = await icons({ 'app.html': '<arena-button></arena-button>' }, { map: null, sheets: null }, readable);
  assert.match(sheetOf(result), /ph-fill-moon/);
  assert.ok(result.reports.some((one) => one.kind === 'environment'));
});

test('sources that draw no glyph and components that carry none still build, with an empty sprite and its module', async () => {
  const none = await icons({ 'app.html': '<arena-nothing></arena-nothing>' }, { sheets: { ...DRAW_SHEETS, components: [...DRAW_SHEETS.components] } });
  assert.equal(none.code, 1, 'a source drawing no Arena component at all still stops where auto finds nothing');
  const { root: held, core } = phosphor();
  const arena = hostRoot('@dravensoft/arena-react', '11.1.0', {
    [ICON_MANIFEST]: JSON.stringify({ components: { 'arena-alert': { pairs: { fill: ['ph-moon'] }, loose: [] } }, fills: [] }),
  });
  const root = project(readable, { 'app.html': '<h1>no icons</h1>' });
  const result = await plan(options(root), environment(core, { arena, sheets: DRAW_SHEETS, map: DRAWS }));
  assert.equal(result.code, 0);
  assert.deepEqual(symbolsOf(result), [], 'the sprite holds no symbol');
  assert.match(result.outputs.find((one) => one.name === SPRITE_MODULE)!.content, /ARENA_SPRITE = 'icons-[0-9a-f]{10}\.svg'/,
    'and its module is still written, so an app importing it never dangles');
  assert.deepEqual(result.orphans, []);
  cleanup(root, held, arena);
});

const FONTS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'assets', 'fonts');
const LOCAL = {
  display: { family: 'Archivo', src: './fonts/archivo.woff2' },
  body: { family: 'Familjen Grotesk', src: './fonts/familjen-grotesk.woff2' },
  mono: { family: 'Spline Sans Mono', src: './fonts/spline-sans-mono.woff2' },
};
const PAINT = '.h{font-family:var(--font-display);font-weight:800}.h2{font-family:var(--font-display);font-weight:900}'
  + '.b{font-weight:400}.t{font-family:var(--font-body);font-weight:700}.t2{font-weight:500}'
  + '.m{font-family:var(--font-mono);font-weight:400}.m2{font-family:var(--font-mono);font-weight:700}';

function fontProject(fonts: object = LOCAL, paint = PAINT) {
  const { root: held, core } = phosphor();
  const arena = hostRoot('@dravensoft/arena-react', '13.0.0');
  mkdirSync(join(arena, 'css'), { recursive: true });
  writeFileSync(join(arena, 'css', 'type.css'), paint);
  const root = project({ ...readable, fonts });
  mkdirSync(join(root, 'fonts'));
  for (const name of readdirSync(FONTS).filter((one) => one.endsWith('.woff2'))) copyFileSync(join(FONTS, name), join(root, 'fonts', name));
  const env = environment(core, { arena, sheets: { layers: ['css/type.css'], components: ['button'] }, fontTools: fontToolRoots() });
  return { root, held, arena, env };
}

const woff2s = (result: Awaited<ReturnType<typeof plan>>) => result.binaries;

test('a local font is cut to the weights the imported sheets paint, named by content, and the theme names the cut', async () => {
  const { root, held, arena, env } = fontProject();
  const result = await plan(options(root), env);
  assert.equal(result.code, 0);
  const cut = woff2s(result);
  assert.deepEqual(cut.map((one) => one.name.replace(/-[0-9a-f]{10}\.woff2$/, '')).sort(),
    ['archivo', 'familjen-grotesk', 'spline-sans-mono', 'spline-sans-mono'], 'one range each, and two pins for the mono');
  for (const one of cut) {
    const source = readFileSync(join(root, 'fonts', `${one.name.replace(/-[0-9a-f]{10}\.woff2$/, '')}.woff2`));
    assert.ok(one.content.length < source.length, `${one.name} is smaller than its source`);
    assert.equal(one.path, join(root, 'src', one.name));
  }
  const theme = result.outputs.find((one) => one.name === THEME_SHEET)?.content ?? '';
  for (const one of cut) assert.ok(theme.includes(`url('./${one.name}')`), `${one.name} is named in the theme`);
  assert.match(theme, /font-family:'Archivo';[^}]*font-weight:800 900;/);
  assert.match(theme, /font-family:'Spline Sans Mono';[^}]*font-weight:400;/);
  assert.match(theme, /font-family:'Spline Sans Mono';[^}]*font-weight:700;/);
  assert.ok(!theme.includes('./fonts/'));
  assert.deepEqual(result.reports.filter((one) => one.kind === 'font' || one.kind === 'weight'), []);
  assert.deepEqual((await plan(options(root), env)).binaries.map((one) => one.name), cut.map((one) => one.name));
  cleanup(root, held, arena);
});

test('a --no-import build cuts the same weights as an importing one, and writes no package sheet', async () => {
  const { root, held, arena, env } = fontProject();
  const importing = await plan(options(root), env);
  const bare = await plan(options(root, { importHeader: false }), env);
  assert.deepEqual(bare.binaries.map((one) => one.name), importing.binaries.map((one) => one.name));
  assert.ok(importing.outputs.some((one) => one.name === PACKAGE_SHEET));
  assert.ok(!bare.outputs.some((one) => one.name === PACKAGE_SHEET));
  cleanup(root, held, arena);
});

test('the package sheet is current until the components drawn change, and a --no-import build orphans it', async () => {
  const { root, held, arena, env } = fontProject();
  const first = await plan(options(root), env);
  const pack = first.outputs.find((one) => one.name === PACKAGE_SHEET)!;
  assert.match(pack.summary, /^\d+ bytes$/);
  writeFileSync(pack.path, pack.content);
  assert.deepEqual(sheetStates([pack]).map((one) => one.state), ['current']);
  assert.ok(!(await plan(options(root), env)).orphans.includes(PACKAGE_SHEET));
  assert.ok((await plan(options(root, { importHeader: false }), env)).orphans.includes(PACKAGE_SHEET));
  cleanup(root, held, arena);
});

test('a font changed on disk is named anew, and the name it had becomes an orphan', async () => {
  const { root, held, arena, env } = fontProject();
  const first = await plan(options(root), env);
  for (const one of woff2s(first)) writeFileSync(one.path, one.content);
  assert.deepEqual((await plan(options(root), env)).orphans, []);
  const painted = join(arena, 'css', 'type.css');
  writeFileSync(painted, PAINT.replace('weight:900', 'weight:800'));
  const second = await plan(options(root), env);
  const before = woff2s(first).find((one) => one.name.startsWith('archivo-'))!.name;
  const after = woff2s(second).find((one) => one.name.startsWith('archivo-'))!.name;
  assert.notEqual(before, after);
  assert.ok(second.orphans.includes(before));
  cleanup(root, held, arena);
});

test('a painted weight outside the face\'s axis is a weight report naming role, weight and font', async () => {
  const { root, held, arena, env } = fontProject(LOCAL, `${PAINT}.x{font-family:var(--font-body);font-weight:900}`);
  const result = await plan(options(root), env);
  assert.equal(result.code, 0);
  const lost = result.reports.filter((one) => one.kind === 'weight');
  assert.equal(lost.length, 1);
  assert.match(lost[0]?.message ?? '', /fonts\.body paints 900 and Familjen Grotesk \(\.\/fonts\/familjen-grotesk\.woff2\)/);
  assert.ok(woff2s(result).some((one) => one.name.startsWith('familjen-grotesk-')), 'the cut keeps what exists');
  cleanup(root, held, arena);
});

test('a remote src stays as written, the build is code 0 and each remote role reports once that it was not cut', async () => {
  const { root, held, arena, env } = fontProject({
    display: { family: 'Archivo', src: 'https://fonts.googleapis.com/css2?family=Archivo' },
    body: { family: 'Familjen Grotesk', src: 'https://example.com/b.woff2' },
    mono: { family: 'Spline Sans Mono', src: './fonts/spline-sans-mono.woff2' },
  });
  const result = await plan(options(root), env);
  assert.equal(result.code, 0);
  const reports = result.reports.filter((one) => one.kind === 'font').map((one) => one.message);
  assert.deepEqual(reports, [
    'display: https://fonts.googleapis.com/css2?family=Archivo is not a file on disk, so it was not cut to the code points and weights this build paints',
    'body: https://example.com/b.woff2 is not a file on disk, so it was not cut to the code points and weights this build paints',
  ]);
  const theme = result.outputs.find((one) => one.name === THEME_SHEET)?.content ?? '';
  assert.ok(theme.includes("@import url('https://fonts.googleapis.com/css2?family=Archivo');"));
  assert.ok(theme.includes("src:url('https://example.com/b.woff2') format('woff2');"));
  assert.deepEqual(woff2s(result).map((one) => one.name.replace(/-[0-9a-f]{10}\.woff2$/, '')), ['spline-sans-mono', 'spline-sans-mono']);
  cleanup(root, held, arena);
});

test('a local src that is not there reports and stays as written', async () => {
  const { root, held, arena, env } = fontProject({ ...LOCAL, body: { family: 'Familjen Grotesk', src: './fonts/gone.woff2' } });
  const result = await plan(options(root), env);
  assert.equal(result.code, 0);
  assert.deepEqual(result.reports.filter((one) => one.kind === 'font').map((one) => one.message.split(' ')[0]), ['body:']);
  assert.ok((result.outputs.find((one) => one.name === THEME_SHEET)?.content ?? '').includes('./fonts/gone.woff2'));
  cleanup(root, held, arena);
});

test('a missing harfbuzzjs or wawoff2 is fatal 2 naming it as a dependency of the package, and a build with no local font needs neither', async () => {
  const { root, held, arena, env } = fontProject();
  for (const [missing, name] of [[{ harfbuzz: null, wawoff2: fontToolRoots().wawoff2 }, 'harfbuzzjs'], [{ harfbuzz: fontToolRoots().harfbuzz, wawoff2: null }, 'wawoff2']] as const) {
    const result = await plan(options(root), { ...env, fontTools: missing });
    assert.equal(result.code, 2);
    assert.deepEqual(result.fatal, [`cannot find ${name}; it is a dependency of this package, so install the package again`]);
    assert.deepEqual([result.outputs, result.binaries], [[], []]);
  }
  const remote = project();
  assert.equal((await plan(options(remote), environment(null, { fontTools: { harfbuzz: null, wawoff2: null } }))).code, 2, 'no phosphor, so the sprite stops it, not the fonts');
  const fine = await plan(options(remote), environment(phosphor().core, { fontTools: { harfbuzz: null, wawoff2: null } }));
  assert.equal(fine.code, 0);
  cleanup(root, held, arena, remote);
});

test('a font file that is not a font is fatal 2 naming the file', async () => {
  const { root, held, arena, env } = fontProject();
  writeFileSync(join(root, 'fonts', 'archivo.woff2'), 'not a font');
  const result = await plan(options(root), env);
  assert.equal(result.code, 2);
  assert.match(result.fatal[0] ?? '', /^cannot cut .*archivo\.woff2: /);
  cleanup(root, held, arena);
});

test('a role painted nowhere is cut to the weights its config declares, as pins, never the whole axis', async () => {
  const { root, held, arena, env } = fontProject({
    ...LOCAL,
    display: { ...LOCAL.display, weight: '400 900' },
    body: { ...LOCAL.body, weight: '500' },
  }, '.m{font-family:var(--font-mono);font-weight:700}');
  const result = await plan(options(root), env);
  const theme = result.outputs.find((one) => one.name === THEME_SHEET)?.content ?? '';
  const faces = (family: string) => [...theme.matchAll(new RegExp(`font-family:'${family}';[^}]*?font-weight:([^;]+);`, 'g'))].map((m) => m[1]);
  assert.deepEqual(faces('Archivo'), ['400', '900']);
  assert.deepEqual(faces('Familjen Grotesk'), ['500']);
  assert.deepEqual(faces('Spline Sans Mono'), ['700']);
  cleanup(root, held, arena);
});

test('a role declaring no weight and painted nowhere is cut to 400', async () => {
  const { root, held, arena, env } = fontProject(LOCAL, '.x{color:red}');
  const theme = (await plan(options(root), env)).outputs.find((one) => one.name === THEME_SHEET)?.content ?? '';
  assert.deepEqual([...theme.matchAll(/font-weight:([^;]+);/g)].map((m) => m[1]), ['400', '400', '400']);
  cleanup(root, held, arena);
});

test('a static font declaring no weight is served as 400, not as a range it lacks', async () => {
  const { root, held, arena, env } = fontProject({ ...LOCAL, display: { family: 'Archivo', src: './fonts/static.woff2' } });
  const loaded = loadFontTools(fontToolRoots());
  if (!('tools' in loaded)) throw new Error('tools');
  const fixed = await cutFont(new Uint8Array(readFileSync(join(FONTS, 'archivo.woff2'))), { kind: 'pins', at: [700] }, LATIN_1, loaded.tools);
  writeFileSync(join(root, 'fonts', 'static.woff2'), fixed.bytes);
  const theme = (await plan(options(root), env)).outputs.find((one) => one.name === THEME_SHEET)?.content ?? '';
  assert.match(theme, /font-family:'Archivo';\s*font-style:normal;\s*font-weight:400;/);
  cleanup(root, held, arena);
});
