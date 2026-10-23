/* plan() answers what a build would leave on disk without leaving anything: every case reads the
 * Plan and the tree, and the theme and sprite cases assert on outputs instead of on files. */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { plan, sheetStates } from './plan.ts';
import type { SheetOutput } from './plan.ts';
import { RETIRED_ICONS_SHEET as ICONS_SHEET } from './sources.ts';
import { THEME_SHEET, PLUGIN_SHEET, RUNTIME_DATA, ICON_MANIFEST, SPRITE_MODULE, SPRITE_TYPES, SPRITE_STEM } from './sheets.ts';
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

test('the plan writes nothing: the out directory is untouched after a successful plan', () => {
  const { root: held, core } = phosphor();
  const root = project();
  const before = readdirSync(join(root, 'src')).sort();
  const result = plan(options(root), environment(core));
  assert.equal(result.code, 0);
  assert.deepEqual(readdirSync(join(root, 'src')).sort(), before);
  cleanup(root, held);
});

const spriteOf = (result: ReturnType<typeof plan>) =>
  result.outputs.find((one) => one.name.startsWith(`${SPRITE_STEM}-`) && one.name.endsWith('.svg'));
const symbolsOf = (result: ReturnType<typeof plan>) =>
  [...(spriteOf(result)?.content ?? '').matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]);

test('outputs are theme, plugin, then the sprite and its module pair, each at out/name', () => {
  const { root: held, core } = phosphor();
  const root = withPlugin('.x { color: red }\n');
  const result = plan(options(root), environment(core, { sheets: CATALOGUED }));
  assert.deepEqual(result.fatal, []);
  const sprite = spriteOf(result)!;
  assert.deepEqual(result.outputs.map((one) => one.name), [THEME_SHEET, PLUGIN_SHEET, sprite.name, SPRITE_MODULE, SPRITE_TYPES]);
  for (const one of result.outputs) assert.equal(one.path, join(root, 'src', one.name));
  const [theme, plugin, icons] = [result.outputs[0], result.outputs[1], sprite];
  assert.match(theme!.content, /@import '@dravensoft\/arena-react\/css\/reset\.css';/);
  assert.doesNotMatch(theme!.content, /arena\.css/);
  assert.match(theme!.summary, /^\d+ bytes$/);
  assert.match(plugin!.content, /@layer arena-plugin \{/);
  assert.match(plugin!.summary, /bytes, wrapped in @layer arena-plugin$/);
  assert.match(icons.content, /<symbol id="ph-bold-bell" /);
  assert.match(icons.summary, /2 symbol\(s\), 1 named by your sources and 0 drawn by Arena's own components, 2 weight\(s\)/);
  cleanup(root, held);
});

test('no plugin carrying css gives no plugin output', () => {
  const { root: held, core } = phosphor();
  const root = project();
  const result = plan(options(root), environment(core));
  assert.deepEqual(result.outputs.map((one) => one.name), [THEME_SHEET, spriteOf(result)!.name, SPRITE_MODULE, SPRITE_TYPES]);
  cleanup(root, held);
});

test('a build writes the sprite, its module, and no icon sheet', () => {
  const { root: held, core } = phosphor();
  const root = project();
  const result = plan(options(root), environment(core));
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

test('two runs on the same sources write the same file name, and other glyphs write another', () => {
  const { root: held, core } = phosphor();
  const one = project(readable, { 'a.html': '<i class="ph-bold ph-bell"></i><i class="ph-bold ph-moon"></i>' });
  const two = project(readable, { 'b.html': '<i class="ph-bold ph-moon"></i><i class="ph-bold ph-bell"></i>' });
  const other = project(readable, { 'c.html': '<i class="ph-bold ph-sun"></i>' });
  const names = [one, two, other].map((root) => spriteOf(plan(options(root), environment(core)))!.name);
  assert.equal(names[0], names[1]);
  assert.notEqual(names[0], names[2]);
  cleanup(one, two, other, held);
});

test('an old icons.generated.css and an old icons-*.svg are orphans, and the new sprite is not', () => {
  const { root: held, core } = phosphor();
  const root = project();
  writeFileSync(join(root, 'src', ICONS_SHEET), 'old');
  writeFileSync(join(root, 'src', 'icons-0123456789.svg'), '<svg/>');
  writeFileSync(join(root, 'src', 'icons-mine.svg'), '<svg/>');
  const first = plan(options(root), environment(core));
  assert.deepEqual([...first.orphans].sort(), [ICONS_SHEET, 'icons-0123456789.svg'].sort());
  const sprite = spriteOf(first)!;
  writeFileSync(sprite.path, sprite.content);
  assert.ok(!plan(options(root), environment(core)).orphans.includes(sprite.name));
  cleanup(root, held);
});

test('a glyph Phosphor lacks at that weight is a glyph report naming weight and name, with no symbol and no throw', () => {
  const { root: held, core } = phosphor();
  const root = project(readable, { 'app.html': '<i class="ph-fill ph-not-a-glyph"></i><i class="ph-bold ph-bell"></i>' });
  const result = plan(options(root), environment(core));
  assert.equal(result.code, 0);
  const glyph = result.reports.filter((one) => one.kind === 'glyph');
  assert.equal(glyph.length, 1);
  assert.match(glyph[0]!.message, /fill: ph-not-a-glyph is not an icon Phosphor draws at that weight/);
  assert.deepEqual(symbolsOf(result), ['ph-bold-bell', 'ph-fill-bell'], 'with no map every glyph also gets the filled weight');
  assert.ok(!spriteOf(result)!.content.includes('not-a-glyph'));
  cleanup(root, held);
});

test('an unreadable config is code 2 with no outputs, and an invalid one is code 1 with no outputs', () => {
  const { root: held, core } = phosphor();
  const root = project(null);
  writeFileSync(join(root, 'arena.config.json'), '{ not json');
  const unreadable = plan(options(root), environment(core));
  assert.equal(unreadable.code, 2);
  assert.ok(unreadable.fatal.some((m) => m.includes('cannot read')));
  assert.deepEqual(unreadable.outputs, []);

  const broken = structuredClone(readable);
  delete broken.palettes[0]?.colors.primary;
  const invalid = project(broken);
  const result = plan(options(invalid), environment(core));
  assert.equal(result.code, 1);
  assert.ok(result.fatal.some((m) => m.includes('missing primary')));
  assert.deepEqual(result.outputs, []);
  cleanup(root, invalid, held);
});

test('a missing --src is code 2 before the theme runs', () => {
  const { root: held, core } = phosphor();
  const root = project(auto);
  const gone = join(root, 'nowhere');
  const result = plan({ ...options(root), paths: [gone] }, environment(core, { sheets: SHEETS, map: MAP }));
  assert.equal(result.code, 2);
  assert.deepEqual(result.fatal, [`${gone} is not there`]);
  assert.deepEqual(result.outputs, []);
  cleanup(root, held);
});

test('a missing @phosphor-icons/core is fatal 2 naming it as a dependency of the package, and no outputs', () => {
  const root = project();
  const result = plan(options(root), environment(null));
  assert.equal(result.code, 2);
  assert.ok(result.fatal.some((m) => m.includes('cannot find @phosphor-icons/core') && m.includes('dependency of this package')));
  assert.ok(!result.fatal.some((m) => m.includes('@phosphor-icons/web')));
  assert.deepEqual(result.outputs, []);
  cleanup(root);
});

test('no weight class found is code 1 with no outputs', () => {
  const { root: held, core } = phosphor();
  const root = project(readable, { 'app.html': '<h1>no icons</h1>' });
  const result = plan(options(root), environment(core));
  assert.equal(result.code, 1);
  assert.ok(result.fatal.some((m) => m.includes('no Phosphor weight class')));
  assert.deepEqual(result.outputs, []);
  cleanup(root, held);
});

test('a contrast report leaves the code 0 and the outputs present', () => {
  const { root: held, core } = phosphor();
  const dim = structuredClone(readable);
  dim.palettes[0]!.colors['base-content'] = '#1a1a1a';
  const root = project(dim);
  const result = plan(options(root), environment(core));
  assert.equal(result.code, 0);
  assert.ok(result.reports.some((one) => one.kind === 'contrast' && one.message.includes('under the 4.5:1')));
  assert.equal(result.outputs.length, 4);
  cleanup(root, held);
});

test('"auto" resolves and notes, and "auto" with no map or nothing found is fatal', () => {
  const { root: held, core } = phosphor();
  const drawn = project(auto, { 'app.html': '<arena-table /><arena-button icon="ph-bold ph-bell" />' });
  const result = plan(options(drawn), environment(core, { sheets: SHEETS, map: MAP }));
  assert.equal(result.code, 0);
  assert.match(result.notes[0] ?? '', /2 component sheet\(s\) drawn, and 2 Arena draws for you: pagination, select/);
  assert.match(result.outputs[0]!.content, /css\/components\/pagination\.css/);

  const nomap = plan(options(drawn), environment(core, { sheets: SHEETS, map: null }));
  assert.equal(nomap.code, 1);
  assert.ok(nomap.fatal.some((m) => m.includes('reads the component map this package carries')));

  const empty = project(auto, { 'app.html': '<h1>ours alone</h1>' });
  const none = plan(options(empty), environment(core, { sheets: SHEETS, map: MAP }));
  assert.equal(none.code, 1);
  assert.ok(none.fatal.some((m) => m.includes('found no Arena component')));
  assert.deepEqual(none.outputs, []);
  cleanup(drawn, empty, held);
});

const WITH_SLOT = { ...SHEETS, layers: [...SHEETS.layers, 'css/style-plugin-default.css'] };

test('a config naming no stylesheet resolves auto against the map', () => {
  const { root: held, core } = phosphor();
  const root = project(readable, { 'app.html': '<arena-button icon="ph-bold ph-bell" />' });
  const result = plan(options(root), environment(core, { sheets: WITH_SLOT, map: MAP }));
  assert.equal(result.code, 0);
  const theme = result.outputs[0]!.content;
  assert.match(theme, /css\/components\/button\.css/);
  assert.doesNotMatch(theme, /css\/components\/table\.css/);
  assert.doesNotMatch(theme, /arena\.css/);
  assert.match(theme, /css\/style-plugin-default\.css/);
  assert.match(result.notes[0] ?? '', /1 component sheet\(s\) drawn/);
  cleanup(root, held);
});

test('a config naming no stylesheet and drawing no Arena component imports no component sheet', () => {
  const { root: held, core } = phosphor();
  const root = project(readable, { 'app.html': '<i class="ph-bold ph-bell"></i>' });
  const result = plan(options(root), environment(core, { sheets: WITH_SLOT, map: MAP }));
  assert.equal(result.code, 0);
  assert.doesNotMatch(result.outputs[0]!.content, /css\/components\//);
  cleanup(root, held);
});

test('with no map beside the command, a config naming no stylesheet imports every component sheet and reports it', () => {
  const { root: held, core } = phosphor();
  const root = project();
  const result = plan(options(root), environment(core, { sheets: WITH_SLOT, map: null }));
  assert.equal(result.code, 0);
  assert.ok(result.reports.some((one) => one.kind === 'environment' && one.message.includes('component map is not beside')));
  for (const name of SHEETS.components) assert.ok(result.outputs[0]!.content.includes(`css/components/${name}.css`), name);
  cleanup(root, held);
});

test('a stale plugin.generated.css is an orphan when no plugin carries css, and none when one does', () => {
  const { root: held, core } = phosphor();
  const root = project();
  writeFileSync(join(root, 'src', PLUGIN_SHEET), 'old');
  const orphaned = plan(options(root), environment(core));
  assert.deepEqual(orphaned.orphans, [PLUGIN_SHEET]);

  const carried = withPlugin('.x { color: red }\n');
  writeFileSync(join(carried, 'src', PLUGIN_SHEET), 'old');
  assert.deepEqual(plan(options(carried), environment(core, { sheets: CATALOGUED })).orphans, []);
  cleanup(root, carried, held);
});

test('orphans are empty when fatal', () => {
  const root = project();
  writeFileSync(join(root, 'src', PLUGIN_SHEET), 'old');
  const result = plan(options(root), environment(null));
  assert.notEqual(result.code, 0);
  assert.deepEqual(result.orphans, []);
  cleanup(root);
});

test('sheetStates: missing, then current after writing the content, then stale after editing it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-states-'));
  const output: SheetOutput = { name: THEME_SHEET, path: join(dir, THEME_SHEET), content: 'a{}', summary: '3 bytes' };
  assert.deepEqual(sheetStates([output]), [{ path: output.path, state: 'missing' }]);
  writeFileSync(output.path, output.content);
  assert.deepEqual(sheetStates([output]), [{ path: output.path, state: 'current' }]);
  writeFileSync(output.path, 'b{}');
  assert.deepEqual(sheetStates([output]), [{ path: output.path, state: 'stale' }]);
  cleanup(dir);
});

test('the sprite is written at out even when out does not exist yet', () => {
  const { root: held, core } = phosphor();
  const root = project();
  const out = join(root, 'src', 'styles', 'deep');
  const result = plan({ ...options(root), out }, environment(core));
  assert.equal(result.code, 0);
  const sprite = spriteOf(result)!;
  assert.equal(sprite.path, join(out, sprite.name));
  assert.equal(result.outputs.find((one) => one.name === SPRITE_MODULE)!.path, join(out, SPRITE_MODULE));
  cleanup(root, held);
});

test('a fatal plan keeps the reports gathered before it, with no outputs and no orphans', () => {
  const { root: held, core } = phosphor();
  const arena = hostRoot('@dravensoft/arena-react', '11.1.0');
  const root = project(readable, { 'app.html': '<h1>no icons</h1>' });
  writeFileSync(join(root, 'src', PLUGIN_SHEET), 'old');
  const result = plan(options(root), environment(core, { arena }));
  assert.equal(result.code, 1);
  assert.ok(result.reports.some((one) => one.kind === 'environment' && one.message.includes('is not beside this package')));
  assert.deepEqual(result.outputs, []);
  assert.deepEqual(result.orphans, []);
  cleanup(root, held, arena);
});

test('the icons Arena draws itself come from the list the package ships, not from reading it as text', () => {
  const { root: held, core } = phosphor();
  const arena = hostRoot('@dravensoft/arena-react', '11.1.0', {
    [ICON_MANIFEST]: JSON.stringify({ components: { 'arena-button': { pairs: { bold: ['ph-sun'] }, loose: [] } }, fills: [] }),
    'index.d.ts': '/** Phosphor class name, e.g. \'ph-bold ph-moon\'. */',
  });
  const root = project();
  const result = plan(options(root), environment(core, { arena }));
  const css = spriteOf(result)?.content ?? '';
  assert.match(css, /ph-bold-sun/, 'a glyph the package declares it draws reaches the sprite');
  assert.doesNotMatch(css, /ph-bold-moon/, 'a glyph named in a sentence about the API is not one anything draws');
  cleanup(root, held, arena);
});

test('running outside an Arena package reports the environment and nothing else', () => {
  const { root: held, core } = phosphor();
  const root = project();
  const result = plan(options(root), environment(core));
  assert.equal(result.code, 0);
  const outside = result.reports.filter((one) => one.message.includes('not running from inside an Arena package'));
  assert.equal(outside.length, 1);
  assert.equal(outside[0]!.kind, 'environment');
  assert.deepEqual(result.reports.filter((one) => one.kind === 'environment' || one.kind === 'glyph').map((one) => one.kind), ['environment']);
  cleanup(root, held);
});

const named = (components: unknown[]) => ({ ...readable, stylesheet: { components } });
const imported = (css: string) => [...css.matchAll(/css\/components\/([a-z-]+)\.css/g)].map((m) => m[1]);

test('a named list is closed against the map, keeps its order, and notes what Arena added', () => {
  const { root: held, core } = phosphor();
  const root = project(named(['table']));
  const result = plan(options(root), environment(core, { sheets: SHEETS, map: MAP }));
  assert.equal(result.code, 0);
  assert.deepEqual(result.notes, ['1 component sheet(s) named, and 2 Arena draws for you: pagination, select']);
  assert.deepEqual(imported(result.outputs[0]!.content), ['table', 'pagination', 'select']);
  cleanup(root, held);
});

test('with no map beside the command a named list is used as written, with no note', () => {
  const { root: held, core } = phosphor();
  const root = project(named(['table']));
  const result = plan(options(root), environment(core, { sheets: SHEETS, map: null }));
  assert.equal(result.code, 0);
  assert.deepEqual(result.notes, []);
  assert.deepEqual(imported(result.outputs[0]!.content), ['table']);
  cleanup(root, held);
});

test('a named list that already holds what it needs writes the bytes it writes with no map, and notes nothing', () => {
  const { root: held, core } = phosphor();
  const root = project(named(['select', 'table', 'pagination']));
  const closed = plan(options(root), environment(core, { sheets: SHEETS, map: MAP }));
  const asWritten = plan(options(root), environment(core, { sheets: SHEETS, map: null }));
  assert.equal(closed.code, 0);
  assert.deepEqual(closed.notes, []);
  assert.equal(closed.outputs[0]!.content, asWritten.outputs[0]!.content);
  cleanup(root, held);
});

test('a name the package does not ship still stops a closed list, naming the shipped sheets', () => {
  const { root: held, core } = phosphor();
  for (const name of ['tabel', 'constructor', '__proto__', 7, null]) {
    const root = project(named(['table', name]));
    const result = plan(options(root), environment(core, { sheets: SHEETS, map: MAP }));
    assert.equal(result.code, 1, String(name));
    assert.deepEqual(result.fatal, [`stylesheet.components: ${JSON.stringify(name)} is not a sheet this package ships, `
      + 'which are button, pagination, select, table']);
    assert.deepEqual(result.outputs, []);
    cleanup(root);
  }
  cleanup(held);
});

test('a name written twice is still refused once the list is closed', () => {
  const { root: held, core } = phosphor();
  const root = project(named(['table', 'table']));
  const result = plan(options(root), environment(core, { sheets: SHEETS, map: MAP }));
  assert.equal(result.code, 1);
  assert.deepEqual(result.fatal, ['stylesheet.components: table is named twice']);
  cleanup(root, held);
});

test('a root plugin silent on a role with a kernel default builds through its own answer and notes the role', () => {
  const { root: held, core } = phosphor();
  const root = ownRoot();
  const result = plan(options(root), environment(core, { sheets: DEFAULTED }));
  assert.deepEqual(result.fatal, []);
  assert.deepEqual(result.notes, ['1 role(s) your root style plugin leaves unanswered take Arena\'s default: ink-link']);
  const theme = result.outputs.find((one) => one.name === THEME_SHEET)?.content ?? '';
  assert.match(theme, /:root\{[^}]*--ink-link:var\(--color-base-200\);/);
  assert.doesNotMatch(theme, /--ink-link:var\(--color-base-content\)/);
  cleanup(root, held);
});

test('the same role without a default stops the build with the totality message', () => {
  const { root: held, core } = phosphor();
  const root = ownRoot();
  const bare = { ...DEFAULTED, catalogue: { ...DEFAULTED.catalogue,
    roles: { 'ink-eyebrow': { type: 'color' }, 'ink-link': { type: 'color' } } } };
  const result = plan(options(root), environment(core, { sheets: bare }));
  assert.equal(result.code, 1);
  assert.deepEqual(result.fatal, ['stylePlugins[0]: the root style plugin does not answer ink-link. A custom property '
    + 'with no value is invalid at computed-value time, so the declaration reading it is dropped and the property '
    + 'disappears: an unanswered role is not a plainer appearance, it is a missing border.']);
  cleanup(root, held);
});

test('a root that is the default plugin is never completed and notes nothing', () => {
  const { root: held, core } = phosphor();
  const root = withPlugin('.x { color: red }\n');
  const result = plan(options(root), environment(core, { sheets: DEFAULTED }));
  assert.deepEqual(result.fatal, []);
  assert.deepEqual(result.notes, []);
  cleanup(root, held);
});

test('a build with runtimePalettes writes arena.runtime.generated.json', () => {
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
  const result = plan(options(root), environment(core, { sheets }));
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

test('turning the key off removes the data file', () => {
  const { root: held, core } = phosphor();
  const root = project();
  writeFileSync(join(root, 'src', RUNTIME_DATA), '{}');
  assert.deepEqual(plan(options(root), environment(core)).orphans, [RUNTIME_DATA]);
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

function icons(files: Record<string, string>, extra: Record<string, unknown> = {}, config: object = auto) {
  const { root: held, core } = phosphor();
  const arena = hostRoot('@dravensoft/arena-react', '11.1.0', { [ICON_MANIFEST]: SHIPPED });
  const root = project(config, files);
  const result = plan(options(root), environment(core, { arena, sheets: DRAW_SHEETS, map: DRAWS, ...extra }));
  cleanup(root, held, arena);
  return result;
}

const sheetOf = (result: ReturnType<typeof plan>) => symbolsOf(result).join(' ');

test('the glyph list follows the drawn components', () => {
  const button = sheetOf(icons({ 'app.html': '<arena-button></arena-button>' }));
  assert.match(button, /ph-bold-sun/, 'the button the source draws brings its own glyph');
  assert.doesNotMatch(button, /ph-fill-moon/, 'the alert it does not draw brings none');
  const alert = sheetOf(icons({ 'app.html': '<arena-button></arena-button><arena-alert></arena-alert>' }));
  assert.match(alert, /ph-fill-moon/, 'the alert it draws brings its filled glyph');
});

test('the filled weight takes the glyphs named beside a component that swaps to it, and nothing else', () => {
  const css = sheetOf(icons({
    'a.html': '<arena-button icon="ph-bold ph-sun"></arena-button>',
    'b.html': '<arena-side-nav-item icon="ph-bold ph-bell"></arena-side-nav-item>',
  }));
  assert.match(css, /ph-fill-bell/);
  assert.doesNotMatch(css, /ph-fill-sun/);
  assert.match(css, /ph-bold-sun/);
});

test('an active navigation item whose glyph the consumer passes brings the filled symbol (Review Focus 1)', () => {
  const { root: held, core } = phosphor();
  const arena = hostRoot(NAME, '11.1.0', {
    [ICON_MANIFEST]: JSON.stringify({ components: { ArenaSideNavItem: { pairs: {}, loose: [] } }, fills: ['ArenaSideNavItem'] }),
  });
  const map: ComponentMap = { match: 'symbol', draws: { ArenaSideNavItem: 'side-nav-item' }, needs: {} };
  const root = project(auto, {
    'App.tsx': `import { ArenaSideNavItem } from '${NAME}';\n`
      + 'export const App = () => <ArenaSideNavItem icon="ph-bold ph-house" active>Home</ArenaSideNavItem>;\n',
  });
  const result = plan(options(root), environment(core, { arena, sheets: { layers: [], components: ['side-nav-item'] }, map }));
  assert.equal(result.code, 0);
  assert.deepEqual(symbolsOf(result), ['ph-bold-house', 'ph-fill-house']);
  cleanup(root, held, arena);
});

test('with no map the sprite carries every component and says the map is missing', () => {
  const result = icons({ 'app.html': '<arena-button></arena-button>' }, { map: null, sheets: null }, readable);
  assert.match(sheetOf(result), /ph-fill-moon/);
  assert.ok(result.reports.some((one) => one.kind === 'environment'));
});

test('sources that draw no glyph and components that carry none still build, with an empty sprite and its module', () => {
  const none = icons({ 'app.html': '<arena-nothing></arena-nothing>' }, { sheets: { ...DRAW_SHEETS, components: [...DRAW_SHEETS.components] } });
  assert.equal(none.code, 1, 'a source drawing no Arena component at all still stops where auto finds nothing');
  const { root: held, core } = phosphor();
  const arena = hostRoot('@dravensoft/arena-react', '11.1.0', {
    [ICON_MANIFEST]: JSON.stringify({ components: { 'arena-alert': { pairs: { fill: ['ph-moon'] }, loose: [] } }, fills: [] }),
  });
  const root = project(readable, { 'app.html': '<h1>no icons</h1>' });
  const result = plan(options(root), environment(core, { arena, sheets: DRAW_SHEETS, map: DRAWS }));
  assert.equal(result.code, 0);
  assert.deepEqual(symbolsOf(result), [], 'the sprite holds no symbol');
  assert.match(result.outputs.find((one) => one.name === SPRITE_MODULE)!.content, /ARENA_SPRITE = 'icons-[0-9a-f]{10}\.svg'/,
    'and its module is still written, so an app importing it never dangles');
  assert.deepEqual(result.orphans, []);
  cleanup(root, held, arena);
});
