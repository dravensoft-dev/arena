import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { relPosix } from '../utils/posix-path.ts';
import { repoRoot } from '../lib/arena/repo-root.ts';
import { relativeSpecifiers, scriptClosure } from './script-closure.ts';

const withScripts = (files: Record<string, string>, run: (root: string) => void) => {
  const root = mkdtempSync(join(tmpdir(), 'arena-closure-'));
  try {
    for (const [rel, source] of Object.entries(files)) {
      const path = join(root, rel);
      mkdirSync(join(path, '..'), { recursive: true });
      writeFileSync(path, source);
    }
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

test('a specifier written into a generator output is not one this script imports', () => {
  const source = [
    "import { a } from './a.ts';",
    "const emitted = `import { b } from './b.ts';`;",
    "const interpolated = await import(`./${name}.ts`);",
  ].join('\n');
  assert.deepEqual(relativeSpecifiers(source), ['./a.ts'],
    'the keyword tells them apart and the specifier cannot, because a specifier is a string in '
    + 'both cases');
});

test('a closure is the entry and everything under scripts/ it reaches, however deep', () => {
  withScripts({
    'scripts/graph/a.ts': "import { b } from './b.ts';\nimport { c } from '../lib/c.ts';",
    'scripts/graph/b.ts': "import { c } from '../lib/c.ts';",
    'scripts/lib/c.ts': 'export const c = 1;',
  }, (root) => {
    assert.deepEqual(scriptClosure(join(root, 'scripts/graph/a.ts'), root),
      ['scripts/graph/a.ts', 'scripts/graph/b.ts', 'scripts/lib/c.ts']);
  });
});

test('a cycle is walked once rather than followed until the stack ends', () => {
  withScripts({
    'scripts/graph/a.ts': "import { b } from './b.ts';",
    'scripts/graph/b.ts': "import { a } from './a.ts';",
  }, (root) => {
    assert.deepEqual(scriptClosure(join(root, 'scripts/graph/a.ts'), root),
      ['scripts/graph/a.ts', 'scripts/graph/b.ts']);
  });
});

test('a reach out of scripts/ stops there, because the graph fingerprints those paths itself', () => {
  withScripts({
    'scripts/graph/a.ts': "import { t } from '../../frameworks/react/Tokens.ts';",
    'frameworks/react/Tokens.ts': 'export const t = 1;',
  }, (root) => {
    assert.deepEqual(scriptClosure(join(root, 'scripts/graph/a.ts'), root), ['scripts/graph/a.ts'],
      'a layer file is declared reading, and following it here would count it twice under two '
      + 'different names');
  });
});

test('a specifier that resolves to nothing is skipped, not thrown on', () => {
  withScripts({ 'scripts/graph/a.ts': "import { gone } from './gone.ts';" }, (root) => {
    assert.deepEqual(scriptClosure(join(root, 'scripts/graph/a.ts'), root), ['scripts/graph/a.ts'],
      'check/arena/script-imports.test.ts is what fails a broken specifier; a fingerprint that '
      + 'threw on one would take the whole run down over a defect another gate reports');
  });
});

test('this module reaches the two it was extracted to serve, in this repository', () => {
  const closure = scriptClosure(join(repoRoot, 'scripts/graph/script-closure.ts'), repoRoot);
  assert.ok(closure.includes(relPosix(repoRoot, join(repoRoot, 'scripts/lib/arena/comments.ts'))),
    'the lexer is what tells a written specifier from a performed one, so an edit to it has to '
    + 'invalidate every node whose script reads a specifier');
  assert.ok(closure.length >= 3, 'a closure of one is a scan that found nothing');
});
