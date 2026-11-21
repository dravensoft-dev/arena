import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { numericConstants, sourceFiles } from './check-duplicate-constants.ts';

test('numericConstants reads a module-level numeric const or flat numeric object, through an as const suffix, and ignores anything else', () => {
  const rows: { name: string; source: string; expected: Map<string, string> }[] = [
    { name: 'finds a module-level numeric const', source: 'export const ARENA_CHART_HEIGHT = 280;', expected: new Map([['ARENA_CHART_HEIGHT', '280']]) },
    { name: 'finds a const that is not exported', source: 'const HOUR_H = 44;', expected: new Map([['HOUR_H', '44']]) },
    { name: 'finds a flat numeric object and normalises its whitespace', source: 'export const ARENA_PAD = { t: 8, r: 8, b: 28, l: 44 };', expected: new Map([['ARENA_PAD', '{t:8,r:8,b:28,l:44}']]) },
    { name: 'reads through an as const suffix', source: 'export const ARENA_PAD = { t: 8 } as const;', expected: new Map([['ARENA_PAD', '{t:8}']]) },
    { name: 'ignores a const initialised from an identifier', source: 'export const ARENA_CHART_HEIGHT = chartHeight;', expected: new Map() },
    { name: 'ignores a string const', source: "const GUTTER = 'calc(var(--sp-1) * 14)';", expected: new Map() },
    { name: 'ignores a const declared inside a function body', source: 'function f() {\n  const W = 320;\n}', expected: new Map() },
  ];
  for (const row of rows) assert.deepEqual(numericConstants(row.source), row.expected, row.name);
});

test('a dist tree is assembled output, so its copy of a constant is never a duplicate', () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-dup-'));
  mkdirSync(join(root, 'react', 'dist', 'components'), { recursive: true });
  writeFileSync(join(root, 'react', 'Widget.jsx'), 'const HOUR_H = 44;\n');
  writeFileSync(join(root, 'react', 'dist', 'components', 'Widget.jsx'), 'const HOUR_H = 44;\n');
  assert.deepEqual([...sourceFiles(root)], [join(root, 'react', 'Widget.jsx')]);
  rmSync(root, { recursive: true });
});

test('generated output is out of scope, because a file emitted into every layer is one declaration', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-dupe-generated-'));
  try {
    mkdirSync(join(dir, 'react'), { recursive: true });
    mkdirSync(join(dir, 'angular'), { recursive: true });
    writeFileSync(join(dir, 'react', 'Codec.generated.ts'), 'export const LOG_LIMIT = 40;\n');
    writeFileSync(join(dir, 'angular', 'Codec.generated.ts'), 'export const LOG_LIMIT = 40;\n');
    assert.deepEqual([...sourceFiles(dir)], [],
      'one source emitted twice cannot drift, and the gate holding it to that source would say so if it did');

    writeFileSync(join(dir, 'react', 'Hand.ts'), 'export const LOG_LIMIT = 40;\n');
    assert.equal([...sourceFiles(dir)].length, 1, 'a hand-written file beside it is still in scope');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
