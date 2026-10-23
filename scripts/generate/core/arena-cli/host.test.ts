import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hostManifest, hostPackage, hostPackageName, fontToolRoots, packageSheets, phosphorRoot, resolveEnvironment } from './host.ts';
import { loadVocabulary, VOCABULARY_INDEX } from './audit.ts';
import { hostRoot, phosphor, removeFixtures } from './cli-fixtures.ts';

after(removeFixtures);

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
  writeFileSync(join(root, 'css', 'contrast.css'), '');
  writeFileSync(join(root, 'css', 'environment.css'), '');
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
    aliases: [],
    rootOnly: { contrast: '', environment: '' },
    catalogue: undefined,
  });
  rmSync(root, { recursive: true });
});

test('a package without contrast.css or environment.css is reported and not read as empty', () => {
  const root = installed("@import './css/reset.css';\n", ['button']);
  rmSync(join(root, 'css', 'contrast.css'));
  assert.throws(() => packageSheets(root), /ships no css\/contrast\.css/);
  writeFileSync(join(root, 'css', 'contrast.css'), '');
  rmSync(join(root, 'css', 'environment.css'));
  assert.throws(() => packageSheets(root), /ships no css\/environment\.css/);
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
  const { root, core } = phosphor();
  const deep = join(root, 'apps', 'web', 'src');
  mkdirSync(deep, { recursive: true });
  assert.equal(phosphorRoot(deep, deep), core);
  assert.equal(phosphorRoot(tmpdir(), tmpdir()), null);
  rmSync(root, { recursive: true });
});

test('the one Phosphor install the command reads is @phosphor-icons/core, and a web install is not it', () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-web-only-'));
  const web = join(root, 'node_modules', '@phosphor-icons', 'web');
  mkdirSync(web, { recursive: true });
  writeFileSync(join(web, 'package.json'), JSON.stringify({ name: '@phosphor-icons/web' }));
  assert.equal(phosphorRoot(root, root), null);
  assert.equal('core' in resolveEnvironment({ arena: null, phosphor: null }), false);
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
    fontTools: fontToolRoots(),
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

test('the command\'s own dependencies win over a project\'s copy of the same name', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const decoy = join(here, '..', '..', '..', '..', '.cache', 'plan-1.29', 'decoy-project');
  rmSync(decoy, { recursive: true, force: true });
  for (const name of ['harfbuzzjs', 'wawoff2', '@phosphor-icons/core']) {
    mkdirSync(join(decoy, 'node_modules', ...name.split('/')), { recursive: true });
    writeFileSync(join(decoy, 'node_modules', ...name.split('/'), 'package.json'), JSON.stringify({ name }));
  }
  try {
    const roots = fontToolRoots(decoy, here);
    assert.ok(roots.harfbuzz !== null && !roots.harfbuzz.startsWith(decoy), `harfbuzzjs from ${roots.harfbuzz}`);
    assert.ok(roots.wawoff2 !== null && !roots.wawoff2.startsWith(decoy), `wawoff2 from ${roots.wawoff2}`);
    assert.ok(!(phosphorRoot(decoy, here) ?? decoy).startsWith(decoy));
    assert.equal(phosphorRoot(decoy, tmpdir())?.startsWith(decoy), true, 'the project\'s copy answers when the command has none');
  } finally {
    rmSync(decoy, { recursive: true, force: true });
  }
});
