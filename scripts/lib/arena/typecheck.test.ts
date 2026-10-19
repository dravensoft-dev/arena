/* Every refusal asserted here is the vacuous pass in one of its forms: a runner given no
 * project would check nothing and report nothing wrong, a gate holding no project at all
 * would do the same one level up, a listing read past a line it cannot place would answer
 * for files it never saw, and a held verdict handed no candidate would answer for a tree a
 * new file joined after it. The spawning cases compile a project of two files under a
 * temporary root, so none of them pays for a real project or writes into the tree. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { repoRoot } from './repo-root.ts';
import {
  TSC_SPAWN, tscBin, compileListing, splitListing, verdictFor, zeroProjectProblems,
} from './typecheck.ts';
import { budgetFor } from './deadline.ts';
import { TERM_GRACE, childOutput } from './child-output.ts';
import { platform } from './platform.ts';
import { PROBE_ENDED, PROBE_IMPORTED, PROBE_SPAWNED, assertCompilerEnded, probeInterrupt } from './forwarding-probe.ts';

const BUDGET_MS = budgetFor(TSC_SPAWN, PROBE_IMPORTED, PROBE_SPAWNED, PROBE_ENDED, TERM_GRACE);

function project(b: string) {
  const root = mkdtempSync(join(tmpdir(), 'arena-typecheck-'));
  symlinkSync(join(repoRoot, 'node_modules'), join(root, 'node_modules'), 'dir');
  writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      strict: true, module: 'preserve', lib: ['ES2022'], types: [], skipLibCheck: true,
    },
    files: ['a.ts', 'b.ts'],
  }));
  writeFileSync(join(root, 'a.ts'), 'export const a = 1;\n');
  writeFileSync(join(root, 'b.ts'), b);
  return root;
}

test('tsc runs under plain node, so a gate built on this has no skip path to take', () => {
  assert.ok(tscBin(repoRoot).endsWith(join('typescript', 'lib', 'tsc.js')));
});

test('an installation without typescript is named rather than spawned into a confusing failure', () => {
  assert.throws(() => tscBin(join(repoRoot, 'nowhere')), /typescript is not installed at/);
});

test('checking no project is refused, because it would report nothing wrong', async () => {
  await assert.rejects(compileListing(), /no project given/);
});

test('a project tsc cannot read is an error rather than an empty file list',
  { timeout: BUDGET_MS }, async () => {
  const root = project('export const b = 1;\n');
  try {
    await assert.rejects(compileListing({ root, project: 'tsconfig.does-not-exist.json' }),
      /tsc could not read/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a tsc killed from outside is named by its signal rather than read as a red verdict',
  { timeout: BUDGET_MS, skip: platform === 'win32' ? 'a signal sent to a process is a POSIX idea' : false },
  async () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-typecheck-'));
  try {
    mkdirSync(join(root, 'node_modules/typescript/lib'), { recursive: true });
    writeFileSync(join(root, 'node_modules/typescript/lib/tsc.js'),
      "console.log('a.ts(1,1): error TS1: partial');\nprocess.kill(process.pid, 'SIGKILL');\n");
    await assert.rejects(compileListing({ root, project: 'tsconfig.json' }),
      /tsc ended on SIGKILL, which nothing here sent/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('one spawn reports what the project read and what it found wrong, and writes nothing',
  { timeout: BUDGET_MS }, async () => {
  const root = project("import { a } from './a';\nexport const b: number = 'x' + a;\n");
  try {
    const { status, files, diagnostics } = await compileListing({ root, project: 'tsconfig.json' });
    assert.notEqual(status, 0);
    assert.match(diagnostics, /b\.ts\(2,14\): error TS2322/);
    assert.ok(files.some((path) => path.endsWith('/a.ts')) && files.some((path) => path.endsWith('/b.ts')),
      'the program read both files, so both are listed. tsc prints a forward slash on every host, '
      + 'this list being its own output rather than a walk, so a suffix spelled for the machine '
      + 'matches nothing on Windows');
    assert.ok(files.some((path) => path.endsWith('.d.ts')), 'the lib a program reads is listed too');
    assert.deepEqual(readdirSync(root).sort(), ['a.ts', 'b.ts', 'node_modules', 'tsconfig.json'],
      'a check that emitted would shadow the tree it checks');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a clean project lists the same files --listFilesOnly lists, with no diagnostic',
  { timeout: BUDGET_MS }, async () => {
  const root = project("import { a } from './a';\nexport const b: number = a;\n");
  try {
    const { status, files, diagnostics } = await compileListing({ root, project: 'tsconfig.json' });
    assert.equal(status, 0);
    assert.equal(diagnostics, '');
    const alone = childOutput(process.execPath, [tscBin(root), '-p', join(root, 'tsconfig.json'), '--listFilesOnly']);
    const listed = alone.output.split('\n').map((line) => line.trim()).filter(Boolean);
    assert.ok(listed.length > 2);
    assert.deepEqual([...files].sort(), listed.sort());
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a listing is split where the files start, and a line it cannot place fails', () => {
  const at = '/repo';
  const cases: [string, RegExp | { files: string[]; diagnostics: string }][] = [
    [`a.ts(1,1): error TS1: x\n  more\n${at}/lib.d.ts\n${at}/a.ts\n`,
      { files: [`${at}/lib.d.ts`, `${at}/a.ts`], diagnostics: 'a.ts(1,1): error TS1: x\n  more' }],
    [`${at}/lib.d.ts\r\n${at}/a.tsx\r\n${at}/data.json\r\n\r\n`,
      { files: [`${at}/lib.d.ts`, `${at}/a.tsx`, `${at}/data.json`], diagnostics: '' }],
    ['error TS5083: Cannot read file\n', /tsc could not read p: it listed no file/],
    ['', /tsc could not read p/],
    [`${at}/lib.d.ts\nFound 1 error.\n`, /printed "Found 1 error\." among the files/],
    [`${at}/lib.d.ts\n${at}/README.md\n`, /printed "\/repo\/README\.md" among the files/],
  ];
  for (const [output, want] of cases) {
    if (want instanceof RegExp) assert.throws(() => splitListing(output, 'p'), want);
    else assert.deepEqual(splitListing(output, 'p'), want);
  }
  assert.equal(cases.length, 6);
});

test('a gate holding zero projects is a failure, not a clean run', () => {
  assert.equal(zeroProjectProblems(0).length, 1);
  assert.match(zeroProjectProblems(0)[0] ?? '', /reports clean by construction/);
  assert.deepEqual(zeroProjectProblems(1), []);
});

test('verdictFor refuses an empty candidate list, because nothing would then notice a file arriving', async () => {
  await assert.rejects(verdictFor('scripts/tsconfig.check.json', []), /0 candidate\(s\)/);
});

test('an interrupt of a typecheck gate ends the tsc it spawned', {
  timeout: BUDGET_MS,
  skip: platform === 'win32' ? 'a signal sent to a process is a POSIX idea' : false,
}, async () => {
  const probed = await probeInterrupt({
    module: join(import.meta.dirname, 'typecheck.ts'),
    stubAt: ['node_modules/typescript/lib/tsc.js'],
    body: "await step.compileListing({ root, project: 'tsconfig.json' });",
  });
  assertCompilerEnded(probed, true);
  assert.match(probed.stderr, /typecheck: interrupted by SIGTERM/);
});
