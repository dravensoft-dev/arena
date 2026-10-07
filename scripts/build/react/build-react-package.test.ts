import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  rewriteSourceSpecifiers, untypedProblems, unresolvedProblems, relativeSpecifiers,
  isSource, manifest, NAME, ROOT_JS, ROOT_TS, LAYER,
} from './build-react-package.ts';
import { version, CLI_BINS } from '../../lib/arena/package-assembly.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

test('a relative source specifier becomes .js, because the package holds no JSX and no TypeScript', () => {
  assert.equal(
    rewriteSourceSpecifiers("import { ArenaButton } from '../../forms/arena-button/ArenaButton.jsx';"),
    "import { ArenaButton } from '../../forms/arena-button/ArenaButton.js';",
  );
  assert.equal(
    rewriteSourceSpecifiers("export * from './components/display/arena-tag/ArenaTag.jsx';"),
    "export * from './components/display/arena-tag/ArenaTag.js';",
  );
});

test('a bare specifier is untouched, so react stays react', () => {
  const source = "import React from 'react';\nimport { render } from 'react-dom/client';";
  assert.equal(rewriteSourceSpecifiers(source), source);
});

test('a .js specifier is already right and is left alone', () => {
  const source = "import { arenaCatColor } from '../../../DataVisuals.js';";
  assert.equal(rewriteSourceSpecifiers(source), source);
});

test('the word jsx inside a path is not an extension', () => {
  const source = "import x from './jsx-loader.js';";
  assert.equal(rewriteSourceSpecifiers(source), source);
});

test('a .ts specifier reaches the tarball as .js, because dist holds no TypeScript', () => {
  assert.equal(rewriteSourceSpecifiers("from './UseDialogModal.ts'"), "from './UseDialogModal.js'");
  assert.equal(rewriteSourceSpecifiers("from '../../../DataVisuals.ts'"), "from '../../../DataVisuals.js'");
  assert.equal(rewriteSourceSpecifiers("from './ArenaButton.tsx'"), "from './ArenaButton.js'");
  assert.equal(rewriteSourceSpecifiers("from './Tokens.generated.js'"), "from './Tokens.generated.js'",
    'already .js, so the rewrite is a no-op rather than a doubling');
  assert.equal(rewriteSourceSpecifiers("from 'react'"), "from 'react'",
    'a bare specifier is the consumer\'s peer dependency and is never touched');
});

test('the manifest names the package, its entry and its types', () => {
  const m = manifest(repoRoot);
  assert.equal(m.name, NAME);
  assert.equal(m.type, 'module');
  assert.equal(m.exports['.'].types, './Index.generated.d.ts');
  assert.equal(m.exports['.'].import, './Index.generated.js');
  assert.equal(m.types, './Index.generated.d.ts',
    'restated at the root, because a consumer on moduleResolution: node reads no exports and npm reads only this field');
});

test('the version is stamped from plugin.json rather than written here', () => {
  assert.equal(manifest(repoRoot).version, version(repoRoot));
});

test('react, react-dom and Phosphor are the peers, and nothing at all is a dependency', () => {
  const m = manifest(repoRoot);
  assert.deepEqual(Object.keys(m.peerDependencies).sort(), ['@phosphor-icons/web', 'react', 'react-dom']);
  assert.equal(m.peerDependencies.react, '^18 || ^19',
    'the range is the two majors a real tarball install was rendered under; an open >=18 would promise React 20');
  assert.ok(!('dependencies' in m),
    'a component composes its own class names, so no recipe library ships with it');
});

test('the command the package ships is declared, and it is the one both packages declare', () => {
  assert.deepEqual(manifest(repoRoot).bin, CLI_BINS);
});

test('the stylesheet and the example config are reachable by subpath', () => {
  const { exports } = manifest(repoRoot);
  assert.equal(exports['./arena.css'], './arena.css');
  assert.equal(exports['./css/*'], './css/*');
  assert.ok('./arena.config.example.json' in exports);
});

test('every layer-root module the package needs is named, and Tokens is among them', () => {
  assert.ok(ROOT_JS.includes('Tokens.generated.js'),
    'DataVisuals imports it, so it ships even though the barrel does not export it');
  assert.ok(ROOT_TS.includes('Index.generated.ts'),
    'the barrel is a source now, so the same tsc run emits the declaration the manifest names');
  assert.ok(ROOT_TS.includes('Api.generated.ts'),
    'the contract types are a source in both layers, compiled like any other');
  for (const name of ROOT_TS)
    assert.ok(name.endsWith('.ts'), `${name} is compiled, so it must be a TypeScript source`);
  assert.equal(LAYER, 'frameworks/react');
});

test('a relative .tsx specifier becomes .js too, so both extensions land on one package layout', () => {
  assert.equal(
    rewriteSourceSpecifiers("import { ArenaBadge } from '../../display/arena-badge/ArenaBadge.tsx';"),
    "import { ArenaBadge } from '../../display/arena-badge/ArenaBadge.js';",
  );
  assert.equal(
    rewriteSourceSpecifiers("import { sp1 } from '../../../Tokens.generated.js';"),
    "import { sp1 } from '../../../Tokens.generated.js';",
  );
});

test('a compiled module with no declaration beside it never ships', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-untyped-'));
  try {
    mkdirSync(join(dir, 'components'), { recursive: true });
    writeFileSync(join(dir, 'components', 'A.js'), 'export const a = 1;\n');
    writeFileSync(join(dir, 'components', 'A.d.ts'), 'export declare const a: number;\n');
    writeFileSync(join(dir, 'components', 'B.js'), 'export const b = 2;\n');
    const problems = untypedProblems(['components/A.js', 'components/B.js'], dir);
    assert.equal(problems.length, 1);
    assert.match(problems[0] ?? '', /components\/B\.js ships with no declaration/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an extensionless specifier gains .js, because node16 infers no extension from a declaration', () => {
  assert.equal(
    rewriteSourceSpecifiers("import type { ArenaTone } from '../../../Api.generated';"),
    "import type { ArenaTone } from '../../../Api.generated.js';",
  );
  assert.equal(
    rewriteSourceSpecifiers("import type { ArenaCatSlot } from './Api.generated';"),
    "import type { ArenaCatSlot } from './Api.generated.js';",
  );
  assert.equal(rewriteSourceSpecifiers("from './Api.generated.js'"), "from './Api.generated.js'",
    'a dotted stem is not an extension, so the rewrite is idempotent rather than a doubling');
});

test('a type-position dynamic import is a specifier too, and tsc writes them into declarations', () => {
  assert.equal(
    rewriteSourceSpecifiers("declare const x: import('./Api.generated').ArenaTone;"),
    "declare const x: import('./Api.generated.js').ArenaTone;",
  );
  assert.deepEqual(relativeSpecifiers("import('./A.js');\nexport * from './B.js';\nimport 'react';"),
    ['./A.js', './B.js']);
});

test('a specifier naming nothing in the package fails the build rather than the consumer', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-unresolved-'));
  try {
    mkdirSync(join(dir, 'components'), { recursive: true });
    writeFileSync(join(dir, 'Api.generated.js'), 'export const a = 1;\n');
    writeFileSync(join(dir, 'components', 'A.d.ts'), "export type { ArenaTone } from '../Api.generated.js';\n");
    assert.deepEqual(unresolvedProblems(dir), []);

    writeFileSync(join(dir, 'components', 'B.d.ts'), "export type { ArenaTone } from '../Api.generated';\n");
    const problems = unresolvedProblems(dir);
    assert.equal(problems.length, 1);
    assert.match(problems[0] ?? '', /B\.d\.ts names \.\.\/Api\.generated, which resolves to no file/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a declaration is not mistaken for a source to compile', () => {
  assert.equal(isSource('a/ArenaButton.tsx'), true);
  assert.equal(isSource('a/Internals.ts'), true);
  assert.equal(isSource('a/ArenaButton.d.ts'), false);
  assert.equal(isSource('a/Tokens.generated.js'), false);
});
