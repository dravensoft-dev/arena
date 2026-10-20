/* The suite-read rule, one fixture per shape. Each fixture is a tree made in a temp directory,
 * so the rule reads text it was handed and no case touches the repository. The real-tree case
 * is the one that notices a suite going back to a path only an assembly step writes. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { assemblyRoots, gateFilesOf, suiteFilesOf, suiteReadProblems, suiteReadRule } from './suite-reads.ts';
import { allNodes, COLLECTION } from './nodes.ts';
import { repoRoot } from '../lib/arena/repo-root.ts';
import { budgetFor } from '../lib/arena/deadline.ts';
import type { GraphNode } from './graph.ts';

const ROOTS = ['dist/mcp', 'dist/contracts', 'frameworks/react/dist'];
const GATE = 'check/gate.ts';
const ROOT_IMPORT = "import { repoRoot } from '../lib/arena/repo-root.ts';\n";
const MODULES = {
  'consts.ts': "export const DIST = 'dist/mcp';\nexport const PARTS = ['dist', 'contracts'];\nexport const COUNT = 3;\n",
  'broken.ts': "throw new Error('this module does not load');\n",
  [GATE]: 'export const collect = (base: string, dir?: string) => [base, dir];\n',
};

const made: string[] = [];
test.after(() => { for (const dir of made) rmSync(dir, { recursive: true, force: true }); });

async function scan(suites: Record<string, string>, exceptions = new Map<string, string>()) {
  const base = mkdtempSync(join(tmpdir(), 'arena-suite-reads-'));
  made.push(base);
  for (const [rel, text] of Object.entries({ ...MODULES, ...suites })) {
    mkdirSync(dirname(join(base, rel)), { recursive: true });
    writeFileSync(join(base, rel), text);
  }
  return suiteReadProblems(base, ROOTS, exceptions, { files: Object.keys(suites), gates: new Set([GATE]) });
}

const suite = (body: string, head = ROOT_IMPORT) => ({ 'a/one.test.ts': `${head}${body}\n` });

test('a join from the repository root spelling an assembly root in literals is a problem', async () => {
  const { problems } = await scan(suite("const at = join(repoRoot, 'dist', 'mcp', 'index.js');"));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /^a\/one\.test\.ts joins the repository root to dist\/mcp/);
});

test('a root spelled as one multi-segment literal is a problem', async () => {
  const { problems } = await scan(suite("const at = resolve(repoRoot, 'frameworks/react/dist');"));
  assert.match(problems.join('\n'), /frameworks\/react\/dist/);
});

test('the repository root under another local name is still the repository root', async () => {
  const { problems } = await scan(suite(
    "const at = join(root, ...DIST.split('/'));",
    "import { repoRoot as root } from '../lib/arena/repo-root.ts';\nimport { DIST } from '../consts.ts';\n",
  ));
  assert.match(problems.join('\n'), /dist\/mcp/);
});

test('a root spelled by an imported list is a problem', async () => {
  const { problems } = await scan(suite(
    'const at = join(repoRoot, ...PARTS);',
    `${ROOT_IMPORT}import { PARTS } from '../consts.ts';\n`,
  ));
  assert.match(problems.join('\n'), /dist\/contracts/);
});

test('a root spelled through an imported constant and a template is a problem', async () => {
  const { problems } = await scan(suite(
    'const at = join(repoRoot, `${DIST}/index.js`);',
    `${ROOT_IMPORT}import { DIST } from '../consts.ts';\n`,
  ));
  assert.match(problems.join('\n'), /dist\/mcp/);
});

test('a module-level literal constant in the suite resolves too', async () => {
  const { problems } = await scan(suite("const OUT = 'dist/contracts';\nconst at = join(repoRoot, OUT);"));
  assert.match(problems.join('\n'), /dist\/contracts/);
});

test('a gate collect with no argument is a problem', async () => {
  const { problems } = await scan(suite('const found = collect();', "import { collect } from '../check/gate.ts';\n"));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /runs collect\(\) from \.\.\/check\/gate\.ts over the repository root/);
});

test('a gate collect over the repository root is a problem under any local name', async () => {
  const { problems } = await scan(suite(
    'const found = gather(root);',
    "import { repoRoot as root } from '../lib/arena/repo-root.ts';\nimport { collect as gather } from '../check/gate.ts';\n",
  ));
  assert.match(problems.join('\n'), /runs gather\(root\)/);
});

test('a gate collect handed a second argument is the sanctioned shape and passes', async () => {
  const { problems } = await scan(suite(
    'const a = collect(repoRoot, temp);\nconst b = collect(repoRoot, () => dir);\nconst c = collect(temp);',
    `${ROOT_IMPORT}import { collect } from '../check/gate.ts';\n`,
  ));
  assert.deepEqual(problems, []);
});

test('a collect that is not a gate export is no gate read', async () => {
  const { problems } = await scan(suite('const found = collect();', "import { collect } from '../elsewhere.ts';\n"));
  assert.deepEqual(problems, []);
});

test('a skip that asks the disk is a problem', async () => {
  const { problems } = await scan(suite(
    "test('x', { skip: existsSync(at) ? false : 'the package is not built' }, () => {});",
    "import { existsSync } from 'node:fs';\n",
  ));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /skips on existsSync\(at\)/);
});

test('a skip through a module-level constant that asks the disk is a problem', async () => {
  const { problems } = await scan(suite(
    "const MISSING = !existsSync(at) && 'no package';\ntest('x', { skip: MISSING }, () => {});",
    "import { existsSync } from 'node:fs';\n",
  ));
  assert.match(problems.join('\n'), /skips on MISSING/);
});

test('a skip that asks the platform passes', async () => {
  const { problems } = await scan(suite(
    "const POSIX = process.platform === 'win32' && 'POSIX only';\ntest('x', { skip: POSIX }, () => {});\ntest('y', { skip: process.platform === 'win32' ? 'no' : false }, () => {});",
    "import { existsSync } from 'node:fs';\n",
  ));
  assert.deepEqual(problems, []);
});

test('a root made in a temp directory is the sanctioned shape and passes', async () => {
  const { problems } = await scan(suite(
    "const root = mkdtempSync(join(tmpdir(), 'x-'));\nmkdirSync(join(root, 'dist', 'mcp'), { recursive: true });\nconst one = join(temp, 'frameworks', 'react', 'dist');",
  ));
  assert.deepEqual(problems, []);
});

test('the repository root joined to something that is no assembly root passes', async () => {
  const { problems } = await scan(suite("const at = join(repoRoot, 'dist-probe', 'mcp');\nconst b = join(repoRoot, 'frameworks', 'react', 'components');"));
  assert.deepEqual(problems, []);
});

test('a read written in a comment or a string is no read', async () => {
  const { problems } = await scan(suite([
    "// join(repoRoot, 'dist', 'mcp')",
    "/* const found = collect(); skip: existsSync(x) */",
    "const text = \"join(repoRoot, 'dist', 'mcp')\";",
  ].join('\n'), `${ROOT_IMPORT}import { collect } from '../check/gate.ts';\n`));
  assert.deepEqual(problems, []);
});

test('a segment from a module that does not load is a problem naming the file and the expression', async () => {
  const { problems } = await scan(suite(
    'const at = join(repoRoot, WHERE);',
    `${ROOT_IMPORT}import { WHERE } from '../broken.ts';\n`,
  ));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /^a\/one\.test\.ts joins the repository root to WHERE, which cannot be settled/);
});

test('a segment imported as something that is no string is a problem', async () => {
  const { problems } = await scan(suite(
    'const at = join(repoRoot, COUNT);',
    `${ROOT_IMPORT}import { COUNT } from '../consts.ts';\n`,
  ));
  assert.match(problems.join('\n'), /COUNT.*cannot be settled.*not a string/);
});

test('a segment imported from a module that is not there is a problem', async () => {
  const { problems } = await scan(suite(
    'const at = join(repoRoot, WHERE);',
    `${ROOT_IMPORT}import { WHERE } from '../missing.ts';\n`,
  ));
  assert.match(problems.join('\n'), /WHERE.*resolves to no module/);
});

test('a segment the suite computes locally is no assembly read and passes', async () => {
  const { problems } = await scan(suite('const at = join(repoRoot, relative(file), name);'));
  assert.deepEqual(problems, []);
});

test('an exception silences the file it names', async () => {
  const why = 'this suite builds the package it reads in a step of its own';
  const { problems } = await scan(suite("const at = join(repoRoot, 'dist', 'mcp');"), new Map([['a/one.test.ts', why]]));
  assert.deepEqual(problems, []);
});

test('an exception whose file has no match is stale', async () => {
  const why = 'this suite builds the package it reads in a step of its own';
  const { problems } = await scan(suite("const at = join(temp, 'dist', 'mcp');"), new Map([['a/one.test.ts', why]]));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /^SUITE_READ_EXCEPTIONS names a\/one\.test\.ts, which no longer has a match/);
});

test('an exception with a reason under forty characters is a problem', async () => {
  const { problems } = await scan(suite("const at = join(repoRoot, 'dist', 'mcp');"), new Map([['a/one.test.ts', 'too short']]));
  assert.match(problems.join('\n'), /a\/one\.test\.ts is excepted from the suite-read rule and the record does not say why/);
});

test('an empty root set is a problem rather than a rule over nothing', async () => {
  const node: GraphNode = { name: 'build:x', reads: [], writes: ['out/**'], feeds: [] };
  const problems = await suiteReadRule(repoRoot, [node], new Map());
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /no node is releaseOnly with a writes/);
});

test('the roots are the releaseOnly writes cut at their first glob', () => {
  const nodes: GraphNode[] = [
    { name: 'a', reads: [], writes: ['x/y/**', '!x/y/z/**', 'x/file.json'], feeds: [], releaseOnly: 'a reason of any length at all, long enough' },
    { name: 'b', reads: [], writes: ['not/a/root/**'], feeds: [] },
  ];
  assert.deepEqual(assemblyRoots(nodes), ['x/file.json', 'x/y']);
});

test('the suites tracked exclude the Angular test build', () => {
  assert.deepEqual(
    suiteFilesOf(['a/b.test.ts', 'a/c.test.tsx', 'a/d.ts', 'frameworks/angular/build/test/e.test.ts']),
    ['a/b.test.ts', 'a/c.test.tsx'],
  );
});

test('no tracked suite reads what only an assembly step writes, over the real tree',
  { timeout: budgetFor(COLLECTION) }, async () => {
    const { nodes, declaredIn } = await allNodes(repoRoot);
    const roots = assemblyRoots(nodes);
    assert.deepEqual(roots, [
      'dist/contracts', 'dist/mcp', 'frameworks/angular/build/package', 'frameworks/angular/dist', 'frameworks/react/dist',
    ]);
    const gates = gateFilesOf(nodes, declaredIn, roots);
    assert.ok(gates.has('scripts/check/arena/check-mcp.ts') && gates.has('scripts/check/arena/check-packages.ts'),
      `the gates reaching a root are ${[...gates].join(', ')}`);
    const { problems, read } = await suiteReadProblems(repoRoot, roots, undefined, { gates });
    assert.ok(read > 700, `${read} suites read; a rule over so few reads nothing`);
    assert.deepEqual(problems, []);
  });
