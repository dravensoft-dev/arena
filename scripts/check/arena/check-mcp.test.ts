import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  collect, dependencyProblems, importedPackages, binProblems, corpusProblems, catalogueProblems,
} from './check-mcp.ts';
import { RUNTIME_DEPENDENCIES, ENTRY, NAME } from '../../build/arena/build-mcp-package.ts';

test('the tree passes its own claims', () => {
  const { problems } = collect();
  assert.deepEqual(problems, []);
});

test('the gate read a real result set rather than an empty one', () => {
  const imported = importedPackages();
  assert.ok(imported.size > 0, 'no bare import was found, so a clean pass says nothing');
  assert.deepEqual([...imported].sort(), Object.keys(RUNTIME_DEPENDENCIES).sort());
});

test('an import with no dependency behind it is a server that throws at spawn', () => {
  const problems = dependencyProblems(undefined, { zod: '^4' });
  assert.ok(problems.some((one) => /@modelcontextprotocol\/server and declares no dependency/.test(one)));
});

test('a dependency nothing imports is one every consumer installs for nothing', () => {
  const problems = dependencyProblems(undefined, { ...RUNTIME_DEPENDENCIES, 'left-pad': '^1' });
  assert.ok(problems.some((one) => /left-pad and imports it nowhere/.test(one)));
});

test('a bin the package declares and does not carry is a command an editor cannot spawn', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-mcp-pkg-'));
  assert.match(binProblems(dir)[0] ?? '', /is declared as the bin and is not there/);
  mkdirSync(join(dir, 'bin'), { recursive: true });
  writeFileSync(join(dir, ...ENTRY.split('/')), '');
  assert.deepEqual(binProblems(dir), []);
  rmSync(dir, { recursive: true });
});

test('a document inside the package is the third copy this design refuses', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-mcp-pkg-'));
  writeFileSync(join(dir, 'README.md'), 'the npm page, which is the one document it may carry');
  assert.deepEqual(corpusProblems(dir), []);
  writeFileSync(join(dir, 'page.md'), 'a reference that should not be here');
  assert.match(corpusProblems(dir)[0] ?? '', /third copy of the language/);
  rmSync(dir, { recursive: true });
});

test('the catalogue claim is measured against what the tree declares, and it names the package', () => {
  assert.deepEqual(catalogueProblems(), []);
  assert.equal(NAME, '@dravensoft/arena-mcp');
});
