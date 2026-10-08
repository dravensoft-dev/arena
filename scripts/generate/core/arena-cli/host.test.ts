import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hostManifest, hostPackage, hostPackageName, packageSheets, phosphorRoot, resolveEnvironment } from './host.ts';
import { loadVocabulary, VOCABULARY_INDEX } from './audit.ts';
import { hostRoot, phosphor } from './cli-fixtures.ts';

test('the package around the command is found by its name, and nothing else is', () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-host-'));
  mkdirSync(join(root, 'bin'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: '@dravensoft/arena-angular' }));
  assert.equal(hostPackage(join(root, 'bin')), root);
  assert.equal(hostPackageName(root), '@dravensoft/arena-angular');
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'arena' }));
  assert.equal(hostPackage(join(root, 'bin')), null);
  assert.equal(hostPackage(join(root, 'nowhere')), null);
  assert.equal(hostPackageName(join(root, 'nowhere')), null);
  rmSync(root, { recursive: true });
});

function installed(barrel: string, components: string[]) {
  const root = mkdtempSync(join(tmpdir(), 'arena-installed-'));
  mkdirSync(join(root, 'css', 'components'), { recursive: true });
  writeFileSync(join(root, 'arena.css'), barrel);
  writeFileSync(join(root, 'css', 'colors.css'), ':root{--level-ink-muted:62%;}');
  for (const name of components) writeFileSync(join(root, 'css', 'components', `${name}.css`), '');
  return root;
}

test('the sheets a package ships are read from beside the command, so no copy of them can age', () => {
  const root = installed("@import './css/reset.css';\n@import './css/components.css';\n", ['table', 'button']);
  assert.deepEqual(packageSheets(root), {
    layers: ['css/reset.css', 'css/components.css'],
    components: ['button', 'table'],
    levels: [],
    washes: [],
    scopes: [],
    roleReferences: [],
    catalogue: undefined,
  });
  rmSync(root, { recursive: true });
});

test('the classes a package ships are read out of its own sheets, from every layer and component', () => {
  const root = installed("@import './css/colors.css';\n@import './css/rhythm.css';\n", ['button', 'stat-card']);
  writeFileSync(join(root, 'css', 'colors.css'), '/* .arena-ghost in prose is not a class */\n'
    + ':root{--level-ink-muted:62%;}\n.arena-light{--picker-invert:0;}\n');
  writeFileSync(join(root, 'css', 'rhythm.css'), '.arena-stack{gap:1px}\n.arena-stack--group{gap:0}\n');
  writeFileSync(join(root, 'css', 'components', 'stat-card.css'), '.arena-stat-card__icon{color:red}\n');
  assert.deepEqual(packageSheets(root)?.scopes, ['light', 'stack', 'stat-card']);
  rmSync(root, { recursive: true });
});

test('the levels a component sheet paints are read from that sheet and not from a list', () => {
  const root = installed("@import './css/components.css';\n", ['table']);
  writeFileSync(join(root, 'css', 'components', 'table.css'),
    '.arena-table__caption {\n  color: color-mix(in oklab, var(--ink-muted) 62%, transparent);\n}\n');
  assert.deepEqual(packageSheets(root)?.levels, [{
    selector: '.arena-table__caption',
    state: '.arena-table__caption',
    property: 'color',
    variable: 'ink-muted',
    percent: 62,
    level: null,
  }]);
  rmSync(root, { recursive: true });
});

test('no package around the command means no sheet list rather than an empty one', () => {
  assert.equal(packageSheets(join(tmpdir(), 'arena-nowhere')), null);
  const bare = installed('', []);
  assert.equal(packageSheets(bare), null);
  rmSync(bare, { recursive: true });
});

test('Phosphor is looked for upwards, which is where a package manager puts it', () => {
  const { root, web } = phosphor();
  const deep = join(root, 'apps', 'web', 'src');
  mkdirSync(deep, { recursive: true });
  assert.equal(phosphorRoot(deep, deep), web);
  assert.equal(phosphorRoot(tmpdir(), tmpdir()), null);
  rmSync(root, { recursive: true });
});

test('a package carrying no catalogue reads as empty rather than failing', () => {
  const root = installed("@import './css/reset.css';\n", ['button']);
  assert.deepEqual(packageSheets(root)?.roleReferences, []);
  rmSync(root, { recursive: true });
});

test('the vocabulary index is read from beside the command, and a file that is not one reads as none', () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-vocab-index-'));
  assert.equal(loadVocabulary(root), null);
  writeFileSync(join(root, VOCABULARY_INDEX), JSON.stringify({ page: 'p', classes: {}, answers: {}, options: {} }));
  assert.deepEqual(loadVocabulary(root), { page: 'p', classes: {}, answers: {}, options: {} });
  rmSync(root, { recursive: true, force: true });
});

test('an override a caller hands in wins over what the install would answer, and a missing install answers nothing', () => {
  const none = resolveEnvironment({ arena: null, phosphor: null });
  assert.deepEqual(none, {
    arena: null, packageName: '@dravensoft/arena-react', sheets: null, map: null, vocabulary: null, phosphor: null,
  });
  const named = resolveEnvironment({ arena: null, phosphor: '/p', packageName: '@dravensoft/arena-angular' });
  assert.equal(named.packageName, '@dravensoft/arena-angular');
  assert.equal(named.phosphor, '/p');
});

test('hostManifest reads name, version and engines, and null for no package.json', () => {
  const root = hostRoot('@dravensoft/arena-react', '11.1.0');
  assert.deepEqual(hostManifest(root), { name: '@dravensoft/arena-react', version: '11.1.0' });
  writeFileSync(join(root, 'package.json'),
    JSON.stringify({ name: '@dravensoft/arena-angular', version: '2.0.0', engines: { node: '>=22' } }));
  assert.deepEqual(hostManifest(root), { name: '@dravensoft/arena-angular', version: '2.0.0', engines: { node: '>=22' } });
  rmSync(join(root, 'package.json'));
  assert.equal(hostManifest(root), null);
  assert.equal(hostManifest(null), null);
  rmSync(root, { recursive: true });
});
