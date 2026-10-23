/* Covers the staging and the manifest of build-angular-package.ts, and the .npmignore it rewrites
 * so the nested package.json lines follow SECONDARY_ENTRY_POINTS whatever order ng-packagr
 * found them in, and that an interrupt of the step ends the ng-packagr it spawned. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { platform } from '../../lib/arena/platform.ts';
import { budgetFor } from '../../lib/arena/deadline.ts';
import { TERM_GRACE } from '../../lib/arena/child-output.ts';
import { PROBE_ENDED, PROBE_IMPORTED, PROBE_SPAWNED, assertCompilerEnded, probeInterrupt } from '../../lib/arena/forwarding-probe.ts';
import {
  manifest, ngPackageConfig, libTsconfig, withAssets, ngPackagrBin, annotatePure,
  NAME, RUNTIME_DEPENDENCIES, STAGING, LAYER, VARIANTS, SECONDARY_ENTRY_POINTS, rewriteEntryImports,
  normalNpmignore,
} from './build-angular-package.ts';
import { CLI_DEPENDENCIES } from '../../lib/arena/support-matrix.ts';
import { version, collectFiles, CLI_BINS, PALETTE_ENTRY } from '../../lib/arena/package-assembly.ts';
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
  assert.deepEqual(ngPackageConfig().allowedNonPeerDependencies, [...Object.keys(RUNTIME_DEPENDENCIES), ...Object.keys(CLI_DEPENDENCIES)]);
  assert.deepEqual(Object.keys(RUNTIME_DEPENDENCIES).sort(), ['tslib'],
    'a component composes its own class names, so no recipe library ships here; '
    + 'tslib is Angular\'s own helper import and is the only one left');
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

test('Angular and the CDK are the peers, Phosphor is none; tslib and the three of the arena command are the dependencies', () => {
  const m = manifest(repoRoot);
  assert.deepEqual(Object.keys(m.peerDependencies).sort(),
    ['@angular/cdk', '@angular/common', '@angular/core', '@angular/forms', '@angular/platform-browser',
     '@angular/router']);
  assert.deepEqual(m.peerDependenciesMeta, { '@angular/router': { optional: true }, '@angular/forms': { optional: true } },
    'the router and forms are each reachable only through their own entry point, so a project that '
    + 'never imports that subpath must install cleanly without it and be told nothing');
  assert.deepEqual(m.dependencies, { ...RUNTIME_DEPENDENCIES, ...CLI_DEPENDENCIES },
    'a slot class is composed from the names the build emits; the only others are the arena command\'s three, which no component imports');
});

test('the assets are added to what ng-packagr wrote without losing its own entry', () => {
  const emitted = { exports: { '.': { types: './types/x.d.ts', default: './fesm2022/x.mjs' } } };
  const final = withAssets(emitted);
  assert.deepEqual(final.exports['.'], emitted.exports['.']);
  assert.deepEqual(final.exports['./arena.css'], { default: './arena.css' });
  assert.deepEqual(final.exports['./css/*'], { default: './css/*' });
  assert.deepEqual(final.exports['./fonts/*'], { default: './fonts/*' });
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

test('a secondary entry point reaches its primary by the package name, never by a relative path', () => {
  const source = "import { ArenaControlBinding } from '../ControlBinding';\n"
    + "import { ArenaInput } from '../components/forms/arena-input/ArenaInput';\n"
    + "import { ArenaSwitchControl } from './ArenaSwitchControl';\n";
  assert.equal(rewriteEntryImports(source),
    "import { ArenaControlBinding } from '@dravensoft/arena-angular';\n"
    + "import { ArenaInput } from '@dravensoft/arena-angular';\n"
    + "import { ArenaSwitchControl } from './ArenaSwitchControl';\n");
  assert.deepEqual(SECONDARY_ENTRY_POINTS, ['metadata', 'forms']);
});

const HEADER = "# Nested package.json's are only needed for development.";
const METADATA_FIRST = `${HEADER}\nmetadata/package.json\nforms/package.json`;

test('the nested manifests are listed in the order the entry points are declared', () => {
  const rows = [
    { found: `${HEADER}\nforms/package.json\nmetadata/package.json`, out: METADATA_FIRST },
    { found: METADATA_FIRST, out: METADATA_FIRST },
  ];
  let walked = 0;
  for (const { found, out } of rows) {
    assert.equal(normalNpmignore(found), out);
    walked += 1;
  }
  assert.equal(walked, 2);
  assert.equal(METADATA_FIRST, [HEADER, ...SECONDARY_ENTRY_POINTS.map((e) => `${e}/package.json`)].join('\n'));
});

test('a set of lines that differs from the entry points is refused with a sentence naming what differs', () => {
  const rows = [
    { found: `${HEADER}\nmetadata/package.json`, names: 'forms/package.json' },
    { found: `${METADATA_FIRST}\nrouter/package.json`, names: 'router/package.json' },
    { found: 'metadata/package.json\nforms/package.json', names: 'header' },
    { found: `${METADATA_FIRST}\nmetadata/package.json`, names: 'repeated lines ["metadata/package.json"]' },
    { found: `${METADATA_FIRST}\n`, names: 'extra lines [""]' },
  ];
  let walked = 0;
  for (const { found, names } of rows) {
    assert.throws(() => normalNpmignore(found), (error: Error) => {
      assert.match(error.message, /^build-angular-package: /);
      assert.ok(error.message.includes(names), error.message);
      return true;
    });
    walked += 1;
  }
  assert.equal(walked, rows.length);
  assert.equal(rows.length, 5);
});

test('an interrupt of the package step ends the ng-packagr it spawned and prints what it wrote', {
  timeout: budgetFor(PROBE_IMPORTED, PROBE_SPAWNED, PROBE_ENDED, TERM_GRACE),
  skip: platform === 'win32' ? 'a signal sent to a process is a POSIX idea' : false,
}, async () => {
  const probed = await probeInterrupt({
    module: join(import.meta.dirname, 'build-angular-package.ts'),
    body: 'await step.runNgPackagr(stub, root);',
  });
  assertCompilerEnded(probed, true);
});

test('withAssets exports ./palette', () => {
  const entry = withAssets({ exports: {} }).exports['./palette'] as object;
  assert.deepEqual(entry, { types: PALETTE_ENTRY.types, default: PALETTE_ENTRY.module });
  assert.equal(Object.keys(entry)[0], 'types', 'types leads the conditions, or a resolver takes the module first');
});
