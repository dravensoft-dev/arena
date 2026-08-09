/* Every case that needs an assembled package assembles one, and none of them reads
 * frameworks/react/dist. That tree is git-ignored and emitted only by build:release, so pointed at
 * the real one these asserted a fact about the machine rather than about the code: green wherever
 * someone had built it, ENOENT out of walkFiles everywhere else, and never once a claim this file
 * makes. The real dist is checked by the gate, which is the caller that guards for it: collect()
 * runs the same functions over it and skips a package whose manifest is not there. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  GENERATED_PALETTE, PACKAGES, collect, componentMapProblems, componentReachProblems, declaredComponents, distDir, exportProblems, globMatches, manifestProblems, paletteEquivalenceProblems, stripAtStatements, styleProblems,
} from './check-packages.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';

const [REACT_PACKAGE, ANGULAR_PACKAGE] = PACKAGES;
if (!REACT_PACKAGE || !ANGULAR_PACKAGE) throw new Error('PACKAGES no longer declares both layers');

const generated = ':root{--color-primary:#b52a20;--color-base-100:#141010;}';

test('an equal pair reports nothing and says how much it looked at', () => {
  const { problems, compared } = paletteEquivalenceProblems(generated, generated);
  assert.deepEqual(problems, []);
  assert.equal(compared, 2);
});

test('a value that differs names both emitters and both values', () => {
  const { problems } = paletteEquivalenceProblems(generated, ':root{--color-primary:#ff0000;--color-base-100:#141010;}');
  assert.deepEqual(problems, ['\:root --color-primary: Style Dictionary says #b52a20, arena-to-prod says #ff0000']);
});

test('a missing declaration is reported as emitting nothing rather than as absent', () => {
  const { problems } = paletteEquivalenceProblems(generated, ':root{--color-base-100:#141010;}');
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /--color-primary: .* arena-to-prod says \(nothing\)/);
});

test('a colour the CLI invents is a problem in the other direction', () => {
  const { problems } = paletteEquivalenceProblems(generated, `${generated.slice(0, -1)}--color-brand:#000000;}`);
  assert.deepEqual(problems, ['\:root --color-brand: arena-to-prod emits it and Style Dictionary does not']);
});

test('a whole missing block is one problem, not one per declaration', () => {
  const { problems } = paletteEquivalenceProblems(`${generated}.arena-light{--color-primary:#b52a20;}`, generated);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /declares \.arena-light and arena-to-prod emits no such block/);
});

test('a comparison that looked at nothing fails rather than passing vacuously', () => {
  const { problems, compared } = paletteEquivalenceProblems(':root{--picker-invert:1;}', ':root{--picker-invert:1;}');
  assert.equal(compared, 0);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /compared 0 declarations/);
});

test('only colours are compared, so the CLI may emit what the token pipeline does not', () => {
  const { problems } = paletteEquivalenceProblems(generated, `${generated.slice(0, -1)}--picker-invert:1;--font-body:'A';}`);
  assert.deepEqual(problems, []);
});

test('an at-statement above the first block does not swallow the selector after it', () => {
  const withImports = `@import url('https://fonts.googleapis.com/css2?family=Archivo');\n${generated}`;
  assert.deepEqual(paletteEquivalenceProblems(generated, withImports).problems, []);
  assert.match(stripAtStatements(withImports), /^\s*:root\{/);
});

test('a semicolon inside a font URL does not leave the statement behind for the declaration parser', () => {
  const query = "@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;900&display=swap');";
  assert.deepEqual(paletteEquivalenceProblems(generated, `${query}\n${generated}`).problems, []);
  assert.match(stripAtStatements(`${query}\n${generated}`), /^\s*:root\{/);
});

const manifest = (overrides = {}) => ({
  name: '@dravensoft/arena-react',
  version: '4.1.0',
  types: './Index.d.ts',
  peerDependencies: { react: '>=18', '@phosphor-icons/web': '^2.1.2' },
  ...overrides,
});

test('a well-formed manifest reports nothing', () => {
  assert.deepEqual(manifestProblems(REACT_PACKAGE, manifest(), '4.1.0'), []);
});

test('a version out of step with plugin.json is reported with both', () => {
  const problems = manifestProblems(REACT_PACKAGE, manifest({ version: '4.0.0' }), '4.1.0');
  assert.deepEqual(problems, ['@dravensoft/arena-react: version 4.0.0, and .claude-plugin/plugin.json says 4.1.0']);
});

test('private is a problem, because a private package can never be published', () => {
  assert.deepEqual(manifestProblems(REACT_PACKAGE, manifest({ private: true }), '4.1.0'),
    ['@dravensoft/arena-react: private, so it can never be published']);
});

test('an install script is refused, whichever of the three names it takes', () => {
  for (const hook of ['preinstall', 'install', 'postinstall']) {
    const problems = manifestProblems(REACT_PACKAGE, manifest({ scripts: { [hook]: 'node x.js' } }), '4.1.0');
    assert.equal(problems.length, 1, hook);
    assert.match(problems[0] ?? '', /declares an install script/);
  }
});

test('Phosphor is the consumer\'s, so bundling it or omitting the peer are both problems', () => {
  const bundled = manifestProblems(REACT_PACKAGE, manifest({ dependencies: { '@phosphor-icons/web': '^2.1.2' } }), '4.1.0');
  assert.ok(bundled.some((p) => /never a dependency/.test(p)));

  const missing = manifestProblems(REACT_PACKAGE, manifest({ peerDependencies: { react: '>=18' } }), '4.1.0');
  assert.deepEqual(missing, ['@dravensoft/arena-react: no peer on @phosphor-icons/web, and every component renders ph-* classes']);
});

test('an Arena package is always a peer, never a dependency', () => {
  const problems = manifestProblems(REACT_PACKAGE, manifest({ dependencies: { '@dravensoft/arena-angular': '4.1.0' } }), '4.1.0');
  assert.ok(problems.some((p) => /is a dependency; an Arena package is always a peer/.test(p)));
});

function assembled(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'arena-pkg-'));
  for (const [path, body] of Object.entries(files) as [string, string][]) {
    const full = join(dir, path);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, body);
  }
  return dir;
}

test('every exports target must have been emitted', () => {
  const dir = assembled({ 'README.md': '#', 'Index.js': '', 'Index.d.ts': '', 'css/reset.css': '' });
  const m = manifest({ exports: { '.': { import: './Index.js' }, './css/reset.css': './css/reset.css' } });
  assert.deepEqual(exportProblems(REACT_PACKAGE, m, dir), []);

  const m2 = manifest({ exports: { '.': './Missing.js' } });
  assert.deepEqual(exportProblems(REACT_PACKAGE, m2, dir),
    ['@dravensoft/arena-react: exports ./Missing.js, which was never emitted']);
  rmSync(dir, { recursive: true });
});

test('a wildcard target names a family, so what is checked is that the family is not empty', () => {
  const dir = assembled({ 'README.md': '#', 'Index.d.ts': '', 'css/a.css': '' });
  const m = manifest({ exports: { './css/*': './css/*' } });
  assert.deepEqual(exportProblems(REACT_PACKAGE, m, dir), []);

  const empty = manifest({ exports: { './css/*': './css/*', './gone/*': './gone/*' } });
  assert.deepEqual(exportProblems(REACT_PACKAGE, empty, dir),
    ['@dravensoft/arena-react: exports ./gone/*, which matches nothing that was emitted, so the '
      + 'subpath resolves to a module error for every consumer who imports it']);
  rmSync(dir, { recursive: true });
});

test('a wildcard matches one path segment, the way Node resolves an exports pattern', () => {
  const dir = assembled({ 'README.md': '#', 'Index.d.ts': '', 'css/components/arena-badge.css': '' });
  assert.deepEqual(globMatches('./css/components/*', dir), ['css/components/arena-badge.css']);
  assert.deepEqual(globMatches('./css/*', dir), [],
    'a single star does not reach through a directory, so a family emitted one level deeper is '
    + 'reported as empty rather than silently counted');
  rmSync(dir, { recursive: true });
});

test('a package exposing nothing is a problem, and so is a bin that was never emitted', () => {
  const dir = assembled({ 'README.md': '#', 'Index.d.ts': '' });
  assert.match(exportProblems(REACT_PACKAGE, manifest(), dir)[0] ?? '', /no exports target resolves/);
  const m = manifest({ exports: { '.': './README.md' }, bin: { 'arena-to-prod': './bin/arena-to-prod.ts' } });
  assert.deepEqual(exportProblems(REACT_PACKAGE, m, dir),
    ['@dravensoft/arena-react: bin arena-to-prod points at ./bin/arena-to-prod.ts, which was never emitted']);
  rmSync(dir, { recursive: true });
});

test('a package carrying no component map cannot answer auto, and that is caught before a release', () => {
  const dir = assembled({ 'css/components/arena-button.css': '' });
  assert.deepEqual(componentMapProblems(REACT_PACKAGE, dir),
    ['@dravensoft/arena-react: no components.json, so "components": "auto" has nothing to resolve a template against']);
  rmSync(dir, { recursive: true });
});

test('a map is held to the sheets beside it in both directions', () => {
  const named = assembled({
    'css/components/arena-button.css': '',
    'components.json': JSON.stringify({ match: 'selector', draws: { 'arena-button': 'arena-button', 'arena-tag': 'arena-tag' } }),
  });
  assert.deepEqual(componentMapProblems(REACT_PACKAGE, named),
    ['@dravensoft/arena-react: components.json names arena-tag, and no such sheet was emitted']);

  const short = assembled({
    'css/components/arena-button.css': '',
    'css/components/arena-tag.css': '',
    'components.json': JSON.stringify({ match: 'selector', draws: { 'arena-button': 'arena-button' } }),
  });
  assert.deepEqual(componentMapProblems(REACT_PACKAGE, short),
    ['@dravensoft/arena-react: components.json reaches no key for arena-tag, so auto can never put it in a subset']);

  rmSync(named, { recursive: true });
  rmSync(short, { recursive: true });
});

test('a map that resolves everything to nothing is a failure, not an empty subset', () => {
  const dir = assembled({
    'css/components/arena-button.css': '',
    'components.json': JSON.stringify({ match: 'selector', draws: { 'arena-bar-chart': null } }),
  });
  assert.ok(componentMapProblems(REACT_PACKAGE, dir).some((m) => m.includes('names no component sheet')));
  rmSync(dir, { recursive: true });
});

test('a package with no README is a problem, because that is the page npm shows', () => {
  const dir = assembled({ 'Index.js': '', 'Index.d.ts': '' });
  const m = manifest({ exports: { '.': './Index.js' } });
  assert.deepEqual(exportProblems(REACT_PACKAGE, m, dir), ['@dravensoft/arena-react: no README.md, which is the page npm shows']);
  rmSync(dir, { recursive: true });
});

test('a package advertising no declaration at the root is untyped to npm and to moduleResolution: node', () => {
  const dir = assembled({ 'README.md': '#', 'Index.js': '', 'Index.d.ts': '' });
  const m = manifest({ types: undefined, exports: { '.': { types: './Index.d.ts', import: './Index.js' } } });
  assert.deepEqual(exportProblems(REACT_PACKAGE, m, dir),
    ['@dravensoft/arena-react: no types and no typings at the root, so npm reads the package as untyped and a consumer on moduleResolution: node finds no declarations']);
  rmSync(dir, { recursive: true });
});

test('typings is the other spelling of the same claim, and ng-packagr writes that one', () => {
  const dir = assembled({ 'README.md': '#', 'Index.js': '', 'types/Index.d.ts': '' });
  const named = manifest({ types: undefined, typings: 'types/Index.d.ts', exports: { '.': './Index.js' } });
  assert.deepEqual(exportProblems(ANGULAR_PACKAGE, named, dir), []);

  const missing = manifest({ types: undefined, typings: 'types/Gone.d.ts', exports: { '.': './Index.js' } });
  assert.deepEqual(exportProblems(ANGULAR_PACKAGE, missing, dir),
    ['@dravensoft/arena-angular: types types/Gone.d.ts, which was never emitted']);
  rmSync(dir, { recursive: true });
});

test('the two packages are named, and each dist sits under its own layer', () => {
  assert.deepEqual(PACKAGES.map((p) => p.name), ['@dravensoft/arena-react', '@dravensoft/arena-angular']);
  assert.equal(distDir('react', '/x'), join('/x', 'frameworks', 'react', 'dist'));
});

test('the repository passes its own equivalence claim, over more than nothing', () => {
  const { problems, compared } = collect(root);
  assert.deepEqual(problems, []);
  assert.ok(compared > 0, `${GENERATED_PALETTE} yielded no declaration to compare`);
});

test('a stylesheet chain that resolves end to end reports nothing, and says how far it walked', () => {
  const dir = assembled({
    'arena.css': "@import './css/components.css';",
    'css/components.css': "@import './components/arena-button.css';\n@import './components/arena-tag.css';",
    'css/components/arena-button.css': "@import '../prelude.css';",
    'css/components/arena-tag.css': "@import '../prelude.css';",
    'css/prelude.css': ':root{}',
  });
  const { problems, walked } = styleProblems(ANGULAR_PACKAGE, dir);
  assert.deepEqual(problems, []);
  assert.equal(walked, 5);
  rmSync(dir, { recursive: true });
});

test('an import naming a file beside the barrel that lives a directory below it is caught', () => {
  const dir = assembled({
    'arena.css': "@import './css/components.css';",
    'css/components.css': "@import './button.css';",
    'css/components/arena-button.css': '',
  });
  const { problems } = styleProblems(ANGULAR_PACKAGE, dir);
  assert.ok(problems.includes(
    '@dravensoft/arena-angular: css/components.css imports ./button.css, which was never emitted',
  ), problems.join('\n'));
  rmSync(dir, { recursive: true });
});

test('a chain that leads nowhere fails rather than passing for having found no import', () => {
  const dir = assembled({ 'arena.css': ':root{}' });
  const { problems, walked } = styleProblems(ANGULAR_PACKAGE, dir);
  assert.equal(walked, 1);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /reaches no component stylesheet/);
  rmSync(dir, { recursive: true });
});

test('a bare specifier is the consumer\'s to resolve and is never walked as a path', () => {
  const dir = assembled({
    'arena.css': "@import '@phosphor-icons/web/bold';\n@import url('https://fonts.googleapis.com/css2?family=Archivo');\n@import './css/components.css';",
    'css/components.css': "@import './components/arena-tag.css';",
    'css/components/arena-tag.css': '',
  });
  assert.deepEqual(styleProblems(ANGULAR_PACKAGE, dir).problems, []);
  rmSync(dir, { recursive: true });
});

test('a cycle terminates rather than walking the same sheet forever', () => {
  const dir = assembled({
    'arena.css': "@import './css/components.css';",
    'css/components.css': "@import './components/arena-tag.css';",
    'css/components/arena-tag.css': "@import '../components.css';",
  });
  assert.deepEqual(styleProblems(ANGULAR_PACKAGE, dir).problems, []);
  rmSync(dir, { recursive: true });
});

test('a package missing a declared component is a stale dist, and says which ones and what to run', () => {

  const pkg = { layer: 'react', name: '@dravensoft/arena-react' };
  const dir = assembled({ 'Index.d.ts': 'export declare const ArenaButton: unknown;\n' });
  const problems = componentReachProblems(pkg, dir, ['ArenaButton', 'ArenaNeverExisted']);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /ArenaNeverExisted/);
  assert.doesNotMatch(problems[0] ?? '', /ArenaButton/, 'a component that IS there must not be reported');
  assert.match(problems[0] ?? '', /build:packages/, 'the message has to carry the one command that fixes it');
  rmSync(dir, { recursive: true });
});

test('a package holding every declared component reports nothing', () => {
  const pkg = { layer: 'react', name: '@dravensoft/arena-react' };
  const declared = declaredComponents();
  const surface = declared.map((name) => `export declare const ${name}: unknown;`).join('\n');
  const dir = assembled({ 'Index.d.ts': `${surface}\n` });
  assert.deepEqual(componentReachProblems(pkg, dir, declared), []);
  rmSync(dir, { recursive: true });
});

test('a directory with no declarations at all is a failure rather than a clean pass', () => {

  const pkg = { layer: 'react', name: '@dravensoft/arena-react' };
  const problems = componentReachProblems(pkg, join(root, 'contracts', 'behaviour'), ['ArenaButton']);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /no \.d\.ts was emitted/);
});

test('every component the tree declares is one this gate would look for', () => {

  const declared = declaredComponents();
  assert.ok(declared.length > 40, `only ${declared.length} components declared, which is not the whole library`);
  assert.deepEqual([...declared].sort(), declared, 'the list is sorted, so a diff of it reads');
});
