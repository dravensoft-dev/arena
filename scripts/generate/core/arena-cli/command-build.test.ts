/* arena build: it writes the sheets a plan answers, only the ones that changed, and says so. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { run } from './command-build.ts';
import { THEME_SHEET, ICONS_SHEET, PLUGIN_SHEET } from './sheets.ts';
import { captureIo, phosphor, project, readable } from './cli-fixtures.ts';

const CATALOGUED = {
  layers: ['css/reset.css'],
  components: ['button'],
  catalogue: { tokens: { 'color-base-200': 'var(--color-base-200)', 'lh-prose': '1.6', 'lh-heading': '1.5', 'measure-prose': '72ch' }, roles: { 'ink-eyebrow': { type: 'color' } } },
};

function withPlugin(css: string) {
  const root = project({ ...readable, stylePlugins: ['default', './design/andina'] });
  mkdirSync(join(root, 'design', 'andina'), { recursive: true });
  writeFileSync(join(root, 'design', 'andina', 'plugin.tokens.json'), JSON.stringify({ 'ink-eyebrow': { $value: '{color.base-200}', $type: 'color' } }));
  writeFileSync(join(root, 'design', 'andina', 'plugin.css'), css);
  return root;
}

const environment = (web: string | null) =>
  ({ arena: null, packageName: '@dravensoft/arena-react', sheets: CATALOGUED, map: null, vocabulary: null, phosphor: web });

const flags = (root: string) =>
  ['--config', join(root, 'arena.config.json'), '--src', join(root, 'src'), '-o', join(root, 'src')];

test('a first build writes the three sheets (plugin case) and prints each wrote line', async () => {
  const { web } = phosphor();
  const root = withPlugin('.x { color: red }\n');
  const { io, out, err } = captureIo(root, environment(web));
  assert.equal(await run(flags(root), io), 0);
  assert.ok(err.every((line) => /report\(s\): arena check names them$/.test(line)));
  for (const name of [THEME_SHEET, PLUGIN_SHEET, ICONS_SHEET]) {
    const at = join(root, 'src', name);
    assert.ok(existsSync(at));
    assert.ok(out.some((line) => line.startsWith(`arena build: wrote ${at} (`) && line.endsWith(')')), name);
  }
  assert.equal(out.length, 3);
});

test('a second build with nothing changed writes nothing, keeps mtimes, and prints "no sheet changed"', async () => {
  const { web } = phosphor();
  const root = withPlugin('.x { color: red }\n');
  await run(flags(root), captureIo(root, environment(web)).io);
  const old = new Date(2020, 0, 1);
  const names = [THEME_SHEET, PLUGIN_SHEET, ICONS_SHEET];
  for (const name of names) utimesSync(join(root, 'src', name), old, old);
  const { io, out } = captureIo(root, environment(web));
  assert.equal(await run(flags(root), io), 0);
  assert.deepEqual(out, ['arena build: no sheet changed']);
  for (const name of names) assert.equal(statSync(join(root, 'src', name)).mtimeMs, old.getTime());
});

test('a changed source rewrites only the icons sheet', async () => {
  const { web } = phosphor();
  const root = withPlugin('.x { color: red }\n');
  await run(flags(root), captureIo(root, environment(web)).io);
  writeFileSync(join(root, 'src', 'app.html'), '<i class="ph-bold ph-bell"></i><i class="ph-bold ph-moon"></i>');
  const { io, out } = captureIo(root, environment(web));
  assert.equal(await run(flags(root), io), 0);
  assert.equal(out.length, 1);
  assert.ok(out[0]!.startsWith(`arena build: wrote ${join(root, 'src', ICONS_SHEET)} (`));
  assert.match(readFileSync(join(root, 'src', ICONS_SHEET), 'utf8'), /ph-moon/);
});

test('an orphan plugin sheet is removed and the removal is printed', async () => {
  const { web } = phosphor();
  const root = project();
  const orphan = join(root, 'src', PLUGIN_SHEET);
  writeFileSync(orphan, '.x{}');
  const { io, out } = captureIo(root, environment(web));
  assert.equal(await run(flags(root), io), 0);
  assert.equal(existsSync(orphan), false);
  assert.ok(out.includes(`arena build: removed ${orphan}, a sheet this config no longer produces`));
  assert.equal(out.some((line) => line.includes('no sheet changed')), false);
});

test('a fatal config writes nothing and returns its code (1 and 2)', async () => {
  const { web } = phosphor();
  const root = project(null);
  writeFileSync(join(root, 'arena.config.json'), '{ not json');
  const unreadable = captureIo(root, environment(web));
  assert.equal(await run(flags(root), unreadable.io), 2);
  assert.match(unreadable.err[0]!, /^arena build: cannot read /);
  assert.deepEqual(unreadable.out, []);

  const broken = structuredClone(readable);
  delete broken.palettes[0]?.colors.primary;
  const invalid = project(broken);
  const second = captureIo(invalid, environment(web));
  assert.equal(await run(flags(invalid), second.io), 1);
  assert.ok(second.err.some((line) => line.includes('missing primary')));
  for (const dir of [root, invalid]) {
    for (const name of [THEME_SHEET, PLUGIN_SHEET, ICONS_SHEET]) assert.equal(existsSync(join(dir, 'src', name)), false);
  }
});

test('reports print "N report(s): arena check names them" and still exit 0', async () => {
  const { web } = phosphor();
  const dim = structuredClone(readable);
  dim.palettes[0]!.colors['base-content'] = '#2a2424';
  const root = project(dim);
  const { io, err } = captureIo(root, environment(web));
  assert.equal(await run(flags(root), io), 0);
  assert.equal(err.length, 1);
  assert.match(err[0]!, /^arena build: \d+ report\(s\): arena check names them$/);
});

test('a write that fails says where and returns 2', async () => {
  const { web } = phosphor();
  const root = project();
  mkdirSync(join(root, 'src', THEME_SHEET));
  const { io, err } = captureIo(root, environment(web));
  assert.equal(await run(flags(root), io), 2);
  assert.match(err[0]!, new RegExp(`^arena build: cannot write ${join(root, 'src', THEME_SHEET).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: `));
});

test('--strict on build exits 2 pointing at arena check', async () => {
  const root = project();
  const { io, out, err } = captureIo(root, environment(null));
  assert.equal(await run([...flags(root), '--strict'], io), 2);
  assert.deepEqual(out, []);
  assert.match(err[0]!, /arena check/);
});

test('--watch hands over to watchBuild (6c)', async () => {
  const { web } = phosphor();
  const root = project();
  const { io, err } = captureIo(root, environment(web));
  assert.equal(await run([...flags(root), '--watch'], io), 2);
  assert.deepEqual(err, ['arena build: --watch is not built yet']);
  assert.equal(existsSync(join(root, 'src', THEME_SHEET)), false);
});
