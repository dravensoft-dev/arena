import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sourceFiles, OUTPUT_SHEETS, auditFiles, pluginDirs, missingSource } from './sources.ts';
import { THEME_SHEET, ICONS_SHEET, PLUGIN_SHEET, PLUGIN_CSS } from './sheets.ts';
import { parseArgs, resolved } from './arena-to-prod.ts';
import { project, readable } from './cli-fixtures.ts';

test('a path that is not there reads as nothing rather than as an empty tree', () => {
  assert.equal(sourceFiles(join(tmpdir(), 'arena-to-prod-nowhere')), null);
});

test('the walk skips the two sheets this command writes, so a scan never reads its own output', () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-selfscan-'));
  writeFileSync(join(root, 'App.tsx'), '<i className="ph-bold ph-bell" />');
  writeFileSync(join(root, THEME_SHEET), ':root{--color-primary:#b52a20;}');
  writeFileSync(join(root, ICONS_SHEET), '.ph-bold.ph-gear{content:"\\e000"}');
  assert.deepEqual(sourceFiles(root), [join(root, 'App.tsx')]);
  rmSync(root, { recursive: true });
});

test('a consumer file that merely ends in .generated.css is still a source, since only the two names are ours', () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-selfscan2-'));
  writeFileSync(join(root, 'tokens.generated.css'), '.ph-bold.ph-bell{}');
  assert.deepEqual(sourceFiles(root), [join(root, 'tokens.generated.css')]);
  rmSync(root, { recursive: true });
});

test('the skipped names are exactly what the command writes, derived rather than restated', () => {
  assert.deepEqual([...OUTPUT_SHEETS].sort(), [ICONS_SHEET, PLUGIN_SHEET, THEME_SHEET].sort());
});

test('the plugin sheet is an output, so the audit walk never reads what this command wrote', () => {
  assert.ok(OUTPUT_SHEETS.has(PLUGIN_SHEET));
  assert.equal(PLUGIN_CSS, 'plugin.css');
});

test('a plugin under src is walked once, so a part it paints is not counted twice', () => {
  const root = project({ ...readable, stylePlugins: ['./src/design/andina'] });
  mkdirSync(join(root, 'src', 'design', 'andina'), { recursive: true });
  writeFileSync(join(root, 'src', 'design', 'andina', 'plugin.css'),
    '[data-arena-part="table.th"] { font-size: var(--fs-sm); }\n');
  const options = resolved(parseArgs([
    '--config', join(root, 'arena.config.json'), '--src', join(root, 'src'), '-o', join(root, 'src'), '--audit',
  ]));
  const files = auditFiles(options.paths, pluginDirs(options));
  assert.equal(new Set(files).size, files.length,
    'the walk is the union of the sources and the declared plugin directories, deduplicated by path');
  rmSync(root, { recursive: true, force: true });
});

test('missingSource names the first absent path, and null when all exist', () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-missing-'));
  try {
    writeFileSync(join(root, 'here.html'), '');
    assert.equal(missingSource([join(root, 'here.html'), root]), null);
    assert.equal(missingSource([root, join(root, 'gone-a'), join(root, 'gone-b')]), join(root, 'gone-a'));
    assert.equal(missingSource([]), null);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
