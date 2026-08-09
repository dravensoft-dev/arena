import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { relPosix } from '../../utils/posix-path.ts';
import { findSourceFiles, rewriteRelativeSourceImports, loaderFor, outputPathFor, ROOT_MODULES, ROOTS } from './build-demos.ts';

test('a relative .jsx import points at the .generated.js sibling this script writes', () => {
  const code = 'import { ArenaButton } from "./ArenaButton.jsx";\nimport { A } from "../a/A.jsx";\n';
  assert.equal(
    rewriteRelativeSourceImports(code),
    'import { ArenaButton } from "./ArenaButton.generated.js";\nimport { A } from "../a/A.generated.js";\n',
  );
});

test('a bare package specifier ending in .jsx is left alone', () => {
  const code = 'import x from "some-pkg/thing.jsx";\n';
  assert.equal(rewriteRelativeSourceImports(code), code);
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

test('a relative .tsx import points at the same .generated.js sibling a .jsx one does', () => {
  const code = 'import { ArenaBadge } from "./ArenaBadge.tsx";\nimport { A } from "../a/A.jsx";\n';
  assert.equal(
    rewriteRelativeSourceImports(code),
    'import { ArenaBadge } from "./ArenaBadge.generated.js";\nimport { A } from "../a/A.generated.js";\n',
  );
});

test('the loader follows the file rather than the call site, so both extensions compile in one pass', () => {
  assert.equal(loaderFor('/x/ArenaBadge.tsx'), 'tsx');
  assert.equal(loaderFor('/x/ArenaTag.jsx'), 'jsx');
  assert.equal(outputPathFor('a/ArenaBadge.tsx'), 'a/ArenaBadge.generated.js');
  assert.equal(outputPathFor('a/ArenaTag.jsx'), 'a/ArenaTag.generated.js');
});

test('a .ts specifier is rewritten too, because a browser cannot execute TypeScript', () => {
  assert.equal(
    rewriteRelativeSourceImports('import { useArenaDialogModal } from "../../../UseDialogModal.ts";\n'),
    'import { useArenaDialogModal } from "../../../UseDialogModal.generated.js";\n',
  );
  assert.equal(
    rewriteRelativeSourceImports('import { sp1 } from "../../../Tokens.generated.js";\n'),
    'import { sp1 } from "../../../Tokens.generated.js";\n',
    'a module already compiled must not be rewritten onto itself',
  );
  assert.equal(outputPathFor('a/DataVisuals.ts'), 'a/DataVisuals.generated.js');
});

test('a source that already names itself generated does not gain a second segment', () => {
  assert.equal(
    outputPathFor('a/ArenaCard.demo.entry.generated.tsx'), 'a/ArenaCard.demo.entry.generated.js',
    'ArenaCard.demo.entry.generated.generated.js is what the page would then fail to load',
  );
  assert.equal(
    rewriteRelativeSourceImports('import { M } from "./ArenaCard.demo.entry.generated.tsx";\n'),
    'import { M } from "./ArenaCard.demo.entry.generated.js";\n',
    'the specifier and the output path have to agree, or the import resolves to nothing',
  );
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
