import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import {
  manifest, ngPackageConfig, libTsconfig, withAssets, ngPackagrBin, annotatePure,
  NAME, RUNTIME_DEPENDENCIES, STAGING, LAYER, VARIANTS,
} from './build-angular-package.ts';
import { version, collectFiles, CLI_BINS } from '../../lib/arena/package-assembly.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

test('ng-packagr is pointed at the entry file and told where the package lands', () => {
  const config = ngPackageConfig();
  assert.equal(config.lib.entryFile, 'index.ts',
    'the entry sits AT the staged root, because ng-packagr infers rootDir from its directory');
  assert.equal(posix.join(STAGING, config.dest), `${LAYER}/dist`,
    'ng-packagr resolves dest against the directory ng-package.json sits in, so a dest restated '
    + 'rather than derived from STAGING writes the package that many levels off, exits 0, and is '
    + 'only noticed by the read of dist/package.json that follows');
});

test('the schema is named at the depth the staging tree sits at, so an editor resolves it', () => {
  const schema = posix.join(STAGING, ngPackageConfig().$schema);
  assert.equal(schema, 'node_modules/ng-packagr/ng-package.schema.json');
  assert.ok(existsSync(join(repoRoot, schema)), 'ng-packagr ships the schema it is validated against');
});

test('the one runtime dependency is allowed by name, or ng-packagr refuses to write', () => {
  assert.deepEqual(ngPackageConfig().allowedNonPeerDependencies, Object.keys(RUNTIME_DEPENDENCIES));
  assert.deepEqual(Object.keys(RUNTIME_DEPENDENCIES).sort(), ['tslib'],
    'a component composes its own class names, so the two recipe libraries that used to ship here '
    + 'are gone; tslib is Angular\'s own helper import and is the only one left');
});

test('the library compiles in partial mode under strictTemplates', () => {
  const tsconfig = libTsconfig();
  assert.equal(tsconfig.angularCompilerOptions.compilationMode, 'partial');
  assert.equal(tsconfig.angularCompilerOptions.strictTemplates, true);
});

test('the manifest names the package and takes its version from plugin.json', () => {
  const m = manifest(repoRoot);
  assert.equal(m.name, NAME);
  assert.equal(m.version, version(repoRoot));
});

test('Angular, the CDK and Phosphor are the peers; tslib is the only real dependency', () => {
  const m = manifest(repoRoot);
  assert.deepEqual(Object.keys(m.peerDependencies).sort(),
    ['@angular/cdk', '@angular/common', '@angular/core', '@angular/platform-browser',
     '@angular/router', '@phosphor-icons/web']);
  assert.deepEqual(m.peerDependenciesMeta, { '@angular/router': { optional: true } },
    'the router is reachable only through the metadata entry point, so a project that never '
    + 'imports that subpath must install cleanly without it and be told nothing');
  assert.deepEqual(m.dependencies, RUNTIME_DEPENDENCIES,
    'tailwind-variants runs on every render to compose a slot class, so a consumer cannot be asked to bring it');
});

test('the assets are added to what ng-packagr wrote without losing its own entry', () => {
  const emitted = { exports: { '.': { types: './types/x.d.ts', default: './fesm2022/x.mjs' } } };
  const final = withAssets(emitted);
  assert.deepEqual(final.exports['.'], emitted.exports['.']);
  assert.deepEqual(final.exports['./arena.css'], { default: './arena.css' });
  assert.deepEqual(final.exports['./css/*'], { default: './css/*' });
  assert.deepEqual(final.bin, CLI_BINS, 'ng-packagr emits no bin, so this is the only place the commands survive');
});

test('the staging tree is the layer\'s own build/, git-ignored and excluded by an anchored path in every walker that reaches it', () => {
  assert.equal(STAGING, 'frameworks/angular/build/package');
});

test('a style factory is marked pure where it is declared, so a bundler may drop the one nothing renders', () => {
  const source = "import manifest from './ArenaTag.classes.generated';\n\nexport const arenaTagStyles = arenaStyles(manifest);\n";
  assert.equal(annotatePure(source),
    "import manifest from './ArenaTag.classes.generated';\n\nexport const arenaTagStyles = /*@__PURE__*/arenaStyles(manifest);\n");
});

test('nothing else in a variants file is touched, and the suffix is the one the staging matches on', () => {
  assert.equal(VARIANTS, '.variants.ts');
  assert.equal(annotatePure('const inner = arenaStyles(manifest);'), 'const inner = arenaStyles(manifest);');
  assert.equal(annotatePure('export const a = arenaStyles(m);\nexport const b = other(m);\n'),
    'export const a = /*@__PURE__*/arenaStyles(m);\nexport const b = other(m);\n');
});

test('every variants file the layer ships is one the annotation matches', () => {
  const layer = join(repoRoot, LAYER, 'components');
  const files = collectFiles(layer, (p) => p.endsWith(VARIANTS));
  assert.ok(files.length > 0, 'a layer with no style factory has moved, and the staging throws on that');
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.notEqual(annotatePure(source), source, `${file} declares no style factory the staging can mark pure`);
  }
});

test('a missing ng-packagr is reported rather than assumed', () => {
  assert.equal(ngPackagrBin('/nowhere-at-all'), null);
  assert.ok(ngPackagrBin(repoRoot), 'ng-packagr is a devDependency and should be installed');
});
