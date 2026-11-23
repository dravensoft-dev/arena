import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  rewriteSourceSpecifiers, untypedProblems, unresolvedProblems, relativeSpecifiers,
  isSource, manifest, NAME, ROOT_JS, ROOT_TS, LAYER,
} from './build-react-package.ts';
import { platform } from '../../lib/arena/platform.ts';
import { budgetFor } from '../../lib/arena/deadline.ts';
import { TERM_GRACE } from '../../lib/arena/child-output.ts';
import { TSC_SPAWN } from '../../lib/arena/typecheck.ts';
import { PROBE_ENDED, PROBE_IMPORTED, PROBE_SPAWNED, assertCompilerEnded, probeInterrupt } from '../../lib/arena/forwarding-probe.ts';
import { CLI_DEPENDENCIES } from '../../lib/arena/support-matrix.ts';
import { version, CLI_BINS, PALETTE_ENTRY } from '../../lib/arena/package-assembly.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

const REWRITES: { name: string; input: string; expected: string; why?: string }[] = [
  {
    name: 'a relative source specifier becomes .js, because the package holds no JSX and no TypeScript',
    input: "import { ArenaButton } from '../../forms/arena-button/ArenaButton.jsx';",
    expected: "import { ArenaButton } from '../../forms/arena-button/ArenaButton.js';",
  },
  {
    name: 'a relative source specifier becomes .js, because the package holds no JSX and no TypeScript (export)',
    input: "export * from './components/display/arena-tag/ArenaTag.jsx';",
    expected: "export * from './components/display/arena-tag/ArenaTag.js';",
  },
  {
    name: 'a bare specifier is untouched, so react stays react',
    input: "import React from 'react';\nimport { render } from 'react-dom/client';",
    expected: "import React from 'react';\nimport { render } from 'react-dom/client';",
  },
  {
    name: 'a .js specifier is already right and is left alone',
    input: "import { arenaCatColor } from '../../../DataVisuals.js';",
    expected: "import { arenaCatColor } from '../../../DataVisuals.js';",
  },
  {
    name: 'the word jsx inside a path is not an extension',
    input: "import x from './jsx-loader.js';",
    expected: "import x from './jsx-loader.js';",
  },
  { name: 'a .ts specifier reaches the tarball as .js, because dist holds no TypeScript', input: "from './UseDialogModal.ts'", expected: "from './UseDialogModal.js'" },
  { name: 'a .ts specifier reaches the tarball as .js (a deeper path)', input: "from '../../../DataVisuals.ts'", expected: "from '../../../DataVisuals.js'" },
  { name: 'a .tsx specifier reaches the tarball as .js', input: "from './ArenaButton.tsx'", expected: "from './ArenaButton.js'" },
  {
    name: 'a .js specifier is a no-op',
    input: "from './Tokens.generated.js'",
    expected: "from './Tokens.generated.js'",
    why: 'already .js, so the rewrite is a no-op rather than a doubling',
  },
  {
    name: 'a bare specifier stays',
    input: "from 'react'",
    expected: "from 'react'",
    why: "a bare specifier is the consumer's peer dependency and is never touched",
  },
  {
    name: 'a relative .tsx specifier becomes .js too, so both extensions land on one package layout',
    input: "import { ArenaBadge } from '../../display/arena-badge/ArenaBadge.tsx';",
    expected: "import { ArenaBadge } from '../../display/arena-badge/ArenaBadge.js';",
  },
  {
    name: 'a relative .js specifier stays beside a .tsx one',
    input: "import { sp1 } from '../../../Tokens.generated.js';",
    expected: "import { sp1 } from '../../../Tokens.generated.js';",
  },
  {
    name: 'an extensionless specifier gains .js, because node16 infers no extension from a declaration',
    input: "import type { ArenaTone } from '../../../Api.generated';",
    expected: "import type { ArenaTone } from '../../../Api.generated.js';",
  },
  {
    name: 'an extensionless specifier gains .js (a sibling)',
    input: "import type { ArenaCatSlot } from './Api.generated';",
    expected: "import type { ArenaCatSlot } from './Api.generated.js';",
  },
  {
    name: 'a dotted stem is not an extension',
    input: "from './Api.generated.js'",
    expected: "from './Api.generated.js'",
    why: 'a dotted stem is not an extension, so the rewrite is idempotent rather than a doubling',
  },
  {
    name: 'a type-position dynamic import is a specifier too, and tsc writes them into declarations',
    input: "declare const x: import('./Api.generated').ArenaTone;",
    expected: "declare const x: import('./Api.generated.js').ArenaTone;",
  },
];

test('rewriteSourceSpecifiers writes every relative specifier as the .js the package ships', () => {
  assert.ok(REWRITES.length > 0, 'the table has rows');
  for (const row of REWRITES) assert.equal(rewriteSourceSpecifiers(row.input), row.expected, row.why ? `${row.name}: ${row.why}` : row.name);
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

test('react and react-dom are the peers, Phosphor is none, and the three of the arena command are the dependencies', () => {
  const m = manifest(repoRoot);
  assert.deepEqual(Object.keys(m.peerDependencies).sort(), ['react', 'react-dom']);
  assert.equal(m.peerDependencies.react, '^18 || ^19',
    'the range is the two majors a real tarball install was rendered under; an open >=18 would promise React 20');
  assert.deepEqual(m.dependencies, CLI_DEPENDENCIES,
    'a component imports none of them; they are the arena command\'s, and a component composes its own class names');
});

test('the React manifest carries a module field pointing at the root entry', () => {
  const m = manifest(repoRoot) as Record<string, any>;
  assert.equal(m.module, m.exports['.'].import);
  assert.equal(m.main, undefined);
});

test('the command the package ships is declared, and it is the one both packages declare', () => {
  assert.deepEqual(manifest(repoRoot).bin, CLI_BINS);
});

test('the stylesheet and the example config are reachable by subpath', () => {
  const { exports } = manifest(repoRoot);
  assert.equal(exports['./arena.css'], './arena.css');
  assert.equal(exports['./css/*'], './css/*');
  assert.ok('./arena.config.example.json' in exports);
  assert.equal(exports['./fonts/*'], './fonts/*', 'the fonts the example config names are reachable by subpath');
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

test('a type-position dynamic import is a specifier the scan reads', () => {
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

test('an interrupt of the React package step ends the tsc it spawned and prints what it wrote', {
  timeout: budgetFor(PROBE_IMPORTED, PROBE_SPAWNED, PROBE_ENDED, TERM_GRACE, TSC_SPAWN),
  skip: platform === 'win32' ? 'a signal sent to a process is a POSIX idea' : false,
}, async () => {
  const probed = await probeInterrupt({
    module: join(import.meta.dirname, 'build-react-package.ts'),
    stubAt: ['node_modules/typescript/lib/tsc.js'],
    body: 'await step.emitDeclarations(root, "");',
  });
  assertCompilerEnded(probed, true);
});

test('the react manifest exports ./palette', () => {
  const entry = manifest(repoRoot).exports['./palette'];
  assert.deepEqual(entry, { types: PALETTE_ENTRY.types, import: PALETTE_ENTRY.module });
  assert.equal(Object.keys(entry)[0], 'types', 'types leads the conditions, or a resolver takes the module first');
});
