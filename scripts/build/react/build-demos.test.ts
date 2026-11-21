import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { relPosix } from '../../utils/posix-path.ts';
import { findSourceFiles, rewriteRelativeSourceImports, loaderFor, outputPathFor, ROOT_MODULES, ROOTS } from './build-demos.ts';

const IMPORTS: { name: string; code: string; expected: string; why?: string }[] = [
  {
    name: 'a relative .jsx import points at the .generated.js sibling this script writes',
    code: 'import { ArenaButton } from "./ArenaButton.jsx";\nimport { A } from "../a/A.jsx";\n',
    expected: 'import { ArenaButton } from "./ArenaButton.generated.js";\nimport { A } from "../a/A.generated.js";\n',
  },
  {
    name: 'a bare package specifier ending in .jsx is left alone',
    code: 'import x from "some-pkg/thing.jsx";\n',
    expected: 'import x from "some-pkg/thing.jsx";\n',
  },
  {
    name: 'a relative .tsx import points at the same .generated.js sibling a .jsx one does',
    code: 'import { ArenaBadge } from "./ArenaBadge.tsx";\nimport { A } from "../a/A.jsx";\n',
    expected: 'import { ArenaBadge } from "./ArenaBadge.generated.js";\nimport { A } from "../a/A.generated.js";\n',
  },
  {
    name: 'a .ts specifier is rewritten too, because a browser cannot execute TypeScript',
    code: 'import { useArenaDialogModal } from "../../../UseDialogModal.ts";\n',
    expected: 'import { useArenaDialogModal } from "../../../UseDialogModal.generated.js";\n',
  },
  {
    name: 'a module already compiled is not rewritten onto itself',
    code: 'import { sp1 } from "../../../Tokens.generated.js";\n',
    expected: 'import { sp1 } from "../../../Tokens.generated.js";\n',
    why: 'a module already compiled must not be rewritten onto itself',
  },
  {
    name: 'a source that already names itself generated does not gain a second segment (the specifier)',
    code: 'import { M } from "./ArenaCard.demo.entry.generated.tsx";\n',
    expected: 'import { M } from "./ArenaCard.demo.entry.generated.js";\n',
    why: 'the specifier and the output path have to agree, or the import resolves to nothing',
  },
];

test('a relative source import is written as the .generated.js a browser can load', () => {
  assert.ok(IMPORTS.length > 0, 'the table has rows');
  for (const row of IMPORTS) {
    assert.equal(rewriteRelativeSourceImports(row.code), row.expected, row.why ? `${row.name}: ${row.why}` : row.name);
  }
});

const LOADERS: { name: string; read: (path: string) => string; path: string; expected: string; why?: string }[] = [
  { name: 'the loader follows the file rather than the call site, so both extensions compile in one pass (tsx)', read: loaderFor, path: '/x/ArenaBadge.tsx', expected: 'tsx' },
  { name: 'the loader follows the file rather than the call site, so both extensions compile in one pass (jsx)', read: loaderFor, path: '/x/ArenaTag.jsx', expected: 'jsx' },
  { name: 'a .tsx output path is the .generated.js sibling', read: outputPathFor, path: 'a/ArenaBadge.tsx', expected: 'a/ArenaBadge.generated.js' },
  { name: 'a .jsx output path is the .generated.js sibling', read: outputPathFor, path: 'a/ArenaTag.jsx', expected: 'a/ArenaTag.generated.js' },
  { name: 'a .ts output path is the .generated.js sibling', read: outputPathFor, path: 'a/DataVisuals.ts', expected: 'a/DataVisuals.generated.js' },
  {
    name: 'a source that already names itself generated does not gain a second segment (the output path)',
    read: outputPathFor,
    path: 'a/ArenaCard.demo.entry.generated.tsx',
    expected: 'a/ArenaCard.demo.entry.generated.js',
    why: 'ArenaCard.demo.entry.generated.generated.js is what the page would then fail to load',
  },
];

test('the loader and the output path follow the source file', () => {
  assert.ok(LOADERS.length > 0, 'the table has rows');
  for (const row of LOADERS) assert.equal(row.read(row.path), row.expected, row.why ? `${row.name}: ${row.why}` : row.name);
});

test('findSourceFiles keeps every module a page loads and drops a suite or a declaration', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-find-jsx-'));
  try {
    const compDir = join(dir, 'display', 'tag');
    mkdirSync(compDir, { recursive: true });
    writeFileSync(join(compDir, 'ArenaTag.jsx'), 'export function ArenaTag() {}\n');
    writeFileSync(join(compDir, 'ArenaTag.test.jsx'), "import test from 'node:test';\n");
    writeFileSync(join(compDir, 'ArenaTag.dom.test.jsx'), "import test from 'node:test';\n");
    writeFileSync(join(dir, 'display', 'Display.card.entry.jsx'), 'export default null;\n');
    const badgeDir = join(dir, 'display', 'badge');
    mkdirSync(badgeDir, { recursive: true });
    writeFileSync(join(badgeDir, 'ArenaBadge.tsx'), 'export function ArenaBadge() {}\n');
    writeFileSync(join(badgeDir, 'ArenaBadge.dom.test.tsx'), "import test from 'node:test';\n");
    writeFileSync(join(badgeDir, 'BadgeInternals.ts'), 'export const n = 1;\n');
    writeFileSync(join(badgeDir, 'ArenaBadge.d.ts'), 'export declare const x: number;\n');

    const found = findSourceFiles(dir).map((p) => relPosix(dir, p));

    assert.deepEqual(found.sort(), [
      'display/Display.card.entry.jsx',
      'display/badge/ArenaBadge.tsx',
      'display/badge/BadgeInternals.ts',
      'display/tag/ArenaTag.jsx',
    ].sort());
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the playground harness is compiled, because the generated entries import it', () => {
  assert.ok(
    ROOTS.includes('frameworks/react/playground'),
    'the harness left out is a module that 404s on all 55 pages with every suite still green',
  );
});

test('every layer-root helper a component imports is compiled, or its page 404s', () => {
  for (const rel of ROOT_MODULES) assert.ok(rel.endsWith('.ts'), `${rel} is not a TypeScript source`);
  assert.ok(ROOT_MODULES.some((r) => r.endsWith('/UseDialogModal.ts')),
    'the modal helper reaches three components and a demo page for each');
});
