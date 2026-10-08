/* plan() answers what a build would leave on disk without leaving anything: every case reads the
 * Plan and the tree, and the theme and icons cases assert on outputs instead of on files. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { plan, sheetStates } from './plan.ts';
import type { SheetOutput } from './plan.ts';
import { THEME_SHEET, ICONS_SHEET, PLUGIN_SHEET, ICON_MANIFEST } from './sheets.ts';
import { auto, hostRoot, MAP, SHEETS, options, phosphor, project, readable } from './cli-fixtures.ts';

const NAME = '@dravensoft/arena-react';

const CATALOGUED = {
  layers: ['css/reset.css'],
  components: ['button'],
  catalogue: { tokens: { 'color-base-200': 'var(--color-base-200)', 'lh-prose': '1.6', 'lh-heading': '1.5', 'measure-prose': '72ch' }, roles: { 'ink-eyebrow': { type: 'color' } } },
};

function environment(web: string | null, extra: Record<string, unknown> = {}) {
  return { arena: null, packageName: NAME, sheets: null, map: null, vocabulary: null, phosphor: web, ...extra };
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
  const { root: held, web } = phosphor();
  const root = project();
  const before = readdirSync(join(root, 'src')).sort();
  const result = plan(options(root), environment(web));
  assert.equal(result.code, 0);
  assert.deepEqual(readdirSync(join(root, 'src')).sort(), before);
  cleanup(root, held);
});

test('outputs are theme, plugin, then icons, each at out/name, with the bytes the old steps wrote', () => {
  const { root: held, web } = phosphor();
  const root = withPlugin('.x { color: red }\n');
  const result = plan(options(root), environment(web, { sheets: CATALOGUED }));
  assert.deepEqual(result.fatal, []);
  assert.deepEqual(result.outputs.map((one) => one.name), [THEME_SHEET, PLUGIN_SHEET, ICONS_SHEET]);
  for (const one of result.outputs) assert.equal(one.path, join(root, 'src', one.name));
  const [theme, plugin, icons] = result.outputs;
  assert.match(theme!.content, /@import '@dravensoft\/arena-react\/arena\.css';/);
  assert.match(theme!.summary, /^\d+ bytes$/);
  assert.match(plugin!.content, /@layer arena-plugin \{/);
  assert.match(plugin!.summary, /bytes, wrapped in @layer arena-plugin$/);
  assert.match(icons!.content, /\.ph-bold\.ph-bell:before\{content:"\\e0ce"\}/);
  assert.match(icons!.summary, /1 glyph\(s\), 1 named by your sources and 0 drawn by Arena's own components, 2 weight\(s\)/);
  cleanup(root, held);
});

test('no plugin carrying css gives no plugin output', () => {
  const { root: held, web } = phosphor();
  const root = project();
  const result = plan(options(root), environment(web));
  assert.deepEqual(result.outputs.map((one) => one.name), [THEME_SHEET, ICONS_SHEET]);
  cleanup(root, held);
});

test('an unreadable config is code 2 with no outputs, and an invalid one is code 1 with no outputs', () => {
  const { root: held, web } = phosphor();
  const root = project(null);
  writeFileSync(join(root, 'arena.config.json'), '{ not json');
  const unreadable = plan(options(root), environment(web));
  assert.equal(unreadable.code, 2);
  assert.ok(unreadable.fatal.some((m) => m.includes('cannot read')));
  assert.deepEqual(unreadable.outputs, []);

  const broken = structuredClone(readable);
  delete broken.palettes[0]?.colors.primary;
  const invalid = project(broken);
  const result = plan(options(invalid), environment(web));
  assert.equal(result.code, 1);
  assert.ok(result.fatal.some((m) => m.includes('missing primary')));
  assert.deepEqual(result.outputs, []);
  cleanup(root, invalid, held);
});

test('a missing --src is code 2 before the theme runs', () => {
  const { root: held, web } = phosphor();
  const root = project(auto);
  const gone = join(root, 'nowhere');
  const result = plan({ ...options(root), paths: [gone] }, environment(web, { sheets: SHEETS, map: MAP }));
  assert.equal(result.code, 2);
  assert.deepEqual(result.fatal, [`${gone} is not there`]);
  assert.deepEqual(result.outputs, []);
  cleanup(root, held);
});

test('missing Phosphor is code 2, and no outputs even though the theme would succeed', () => {
  const root = project();
  const result = plan(options(root), environment(null));
  assert.equal(result.code, 2);
  assert.ok(result.fatal.some((m) => m.includes('cannot find @phosphor-icons/web')));
  assert.deepEqual(result.outputs, []);
  cleanup(root);
});

test('no weight class found is code 1 with no outputs', () => {
  const { root: held, web } = phosphor();
  const root = project(readable, { 'app.html': '<h1>no icons</h1>' });
  const result = plan(options(root), environment(web));
  assert.equal(result.code, 1);
  assert.ok(result.fatal.some((m) => m.includes('no Phosphor weight class')));
  assert.deepEqual(result.outputs, []);
  cleanup(root, held);
});

test('a contrast report leaves the code 0 and the outputs present', () => {
  const { root: held, web } = phosphor();
  const dim = structuredClone(readable);
  dim.palettes[0]!.colors['base-content'] = '#1a1a1a';
  const root = project(dim);
  const result = plan(options(root), environment(web));
  assert.equal(result.code, 0);
  assert.ok(result.reports.some((one) => one.kind === 'contrast' && one.message.includes('under the 4.5:1')));
  assert.equal(result.outputs.length, 2);
  cleanup(root, held);
});

test('"auto" resolves and notes, and "auto" with no map or nothing found is fatal', () => {
  const { root: held, web } = phosphor();
  const drawn = project(auto, { 'app.html': '<arena-table /><arena-button icon="ph-bold ph-bell" />' });
  const result = plan(options(drawn), environment(web, { sheets: SHEETS, map: MAP }));
  assert.equal(result.code, 0);
  assert.match(result.notes[0] ?? '', /2 component sheet\(s\) drawn, and 2 Arena draws for you: pagination, select/);
  assert.match(result.outputs[0]!.content, /css\/components\/pagination\.css/);

  const nomap = plan(options(drawn), environment(web, { sheets: SHEETS, map: null }));
  assert.equal(nomap.code, 1);
  assert.ok(nomap.fatal.some((m) => m.includes('reads the component map this package carries')));

  const empty = project(auto, { 'app.html': '<h1>ours alone</h1>' });
  const none = plan(options(empty), environment(web, { sheets: SHEETS, map: MAP }));
  assert.equal(none.code, 1);
  assert.ok(none.fatal.some((m) => m.includes('found no Arena component')));
  assert.deepEqual(none.outputs, []);
  cleanup(drawn, empty, held);
});

test('a stale plugin.generated.css is an orphan when no plugin carries css, and none when one does', () => {
  const { root: held, web } = phosphor();
  const root = project();
  writeFileSync(join(root, 'src', PLUGIN_SHEET), 'old');
  const orphaned = plan(options(root), environment(web));
  assert.deepEqual(orphaned.orphans, [PLUGIN_SHEET]);

  const carried = withPlugin('.x { color: red }\n');
  writeFileSync(join(carried, 'src', PLUGIN_SHEET), 'old');
  assert.deepEqual(plan(options(carried), environment(web, { sheets: CATALOGUED })).orphans, []);
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

test('the icon font path is relative to out even when out does not exist yet', () => {
  const { root: held, web } = phosphor();
  const root = project();
  const out = join(root, 'src', 'styles', 'deep');
  const result = plan({ ...options(root), out }, environment(web));
  assert.equal(result.code, 0);
  const icons = result.outputs.find((one) => one.name === ICONS_SHEET)!;
  const path = /url\('([^']+)'\)/.exec(icons.content)?.[1] ?? '';
  assert.ok(path.startsWith('../../..'), path);
  assert.ok(path.endsWith('/bold/Phosphor-Bold.woff2'), path);
  cleanup(root, held);
});

test('a fatal plan keeps the reports gathered before it, with no outputs and no orphans', () => {
  const { root: held, web } = phosphor();
  const arena = hostRoot('@dravensoft/arena-react', '11.1.0');
  const root = project(readable, { 'app.html': '<h1>no icons</h1>' });
  writeFileSync(join(root, 'src', PLUGIN_SHEET), 'old');
  const result = plan(options(root), environment(web, { arena }));
  assert.equal(result.code, 1);
  assert.ok(result.reports.some((one) => one.kind === 'environment' && one.message.includes('is not beside this package')));
  assert.deepEqual(result.outputs, []);
  assert.deepEqual(result.orphans, []);
  cleanup(root, held, arena);
});

test('the icons Arena draws itself come from the list the package ships, not from reading it as text', () => {
  const { root: held, web } = phosphor();
  const arena = hostRoot('@dravensoft/arena-react', '11.1.0', {
    [ICON_MANIFEST]: JSON.stringify({ pairs: { bold: ['ph-sun'] }, loose: [] }),
    'index.d.ts': '/** Phosphor class name, e.g. \'ph-bold ph-moon\'. */',
  });
  const root = project();
  const result = plan(options(root), environment(web, { arena }));
  const css = result.outputs.find((one) => one.name === ICONS_SHEET)?.content ?? '';
  assert.match(css, /ph-sun/, 'a glyph the package declares it draws reaches the sheet');
  assert.doesNotMatch(css, /ph-moon/, 'a glyph named in a sentence about the API is not one anything draws');
  cleanup(root, held, arena);
});

test('running outside an Arena package reports the environment and nothing else', () => {
  const { root: held, web } = phosphor();
  const root = project();
  const result = plan(options(root), environment(web));
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
  const { root: held, web } = phosphor();
  const root = project(named(['table']));
  const result = plan(options(root), environment(web, { sheets: SHEETS, map: MAP }));
  assert.equal(result.code, 0);
  assert.deepEqual(result.notes, ['1 component sheet(s) named, and 2 Arena draws for you: pagination, select']);
  assert.deepEqual(imported(result.outputs[0]!.content), ['table', 'pagination', 'select']);
  cleanup(root, held);
});

test('with no map beside the command a named list is used as written, with no note', () => {
  const { root: held, web } = phosphor();
  const root = project(named(['table']));
  const result = plan(options(root), environment(web, { sheets: SHEETS, map: null }));
  assert.equal(result.code, 0);
  assert.deepEqual(result.notes, []);
  assert.deepEqual(imported(result.outputs[0]!.content), ['table']);
  cleanup(root, held);
});

test('a named list that already holds what it needs writes the bytes it writes with no map, and notes nothing', () => {
  const { root: held, web } = phosphor();
  const root = project(named(['select', 'table', 'pagination']));
  const closed = plan(options(root), environment(web, { sheets: SHEETS, map: MAP }));
  const asWritten = plan(options(root), environment(web, { sheets: SHEETS, map: null }));
  assert.equal(closed.code, 0);
  assert.deepEqual(closed.notes, []);
  assert.equal(closed.outputs[0]!.content, asWritten.outputs[0]!.content);
  cleanup(root, held);
});

test('a name the package does not ship still stops a closed list, naming the shipped sheets', () => {
  const { root: held, web } = phosphor();
  for (const name of ['tabel', 'constructor', '__proto__', 7, null]) {
    const root = project(named(['table', name]));
    const result = plan(options(root), environment(web, { sheets: SHEETS, map: MAP }));
    assert.equal(result.code, 1, String(name));
    assert.deepEqual(result.fatal, [`stylesheet.components: ${JSON.stringify(name)} is not a sheet this package ships, `
      + 'which are button, pagination, select, table']);
    assert.deepEqual(result.outputs, []);
    cleanup(root);
  }
  cleanup(held);
});

test('a name written twice is still refused once the list is closed', () => {
  const { root: held, web } = phosphor();
  const root = project(named(['table', 'table']));
  const result = plan(options(root), environment(web, { sheets: SHEETS, map: MAP }));
  assert.equal(result.code, 1);
  assert.deepEqual(result.fatal, ['stylesheet.components: table is named twice']);
  cleanup(root, held);
});

test('a root plugin silent on a role with a kernel default builds through its own answer and notes the role', () => {
  const { root: held, web } = phosphor();
  const root = ownRoot();
  const result = plan(options(root), environment(web, { sheets: DEFAULTED }));
  assert.deepEqual(result.fatal, []);
  assert.deepEqual(result.notes, ['1 role(s) your root style plugin leaves unanswered take Arena\'s default: ink-link']);
  const theme = result.outputs.find((one) => one.name === THEME_SHEET)?.content ?? '';
  assert.match(theme, /:root\{[^}]*--ink-link:var\(--color-base-200\);/);
  assert.doesNotMatch(theme, /--ink-link:var\(--color-base-content\)/);
  cleanup(root, held);
});

test('the same role without a default stops the build with the totality message', () => {
  const { root: held, web } = phosphor();
  const root = ownRoot();
  const bare = { ...DEFAULTED, catalogue: { ...DEFAULTED.catalogue,
    roles: { 'ink-eyebrow': { type: 'color' }, 'ink-link': { type: 'color' } } } };
  const result = plan(options(root), environment(web, { sheets: bare }));
  assert.equal(result.code, 1);
  assert.deepEqual(result.fatal, ['stylePlugins[0]: the root style plugin does not answer ink-link. A custom property '
    + 'with no value is invalid at computed-value time, so the declaration reading it is dropped and the property '
    + 'disappears: an unanswered role is not a plainer appearance, it is a missing border.']);
  cleanup(root, held);
});

test('a root that is the default plugin is never completed and notes nothing', () => {
  const { root: held, web } = phosphor();
  const root = withPlugin('.x { color: red }\n');
  const result = plan(options(root), environment(web, { sheets: DEFAULTED }));
  assert.deepEqual(result.fatal, []);
  assert.deepEqual(result.notes, []);
  cleanup(root, held);
});
