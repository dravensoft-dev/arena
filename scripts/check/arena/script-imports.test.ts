/* A script nothing imports has its specifiers proven by nothing. scripts/serve.ts kept
 * importing ./lib/repo-root.ts for three commits after that module moved into lib/arena/,
 * because `bun test scripts` loads the suites and whatever those reach, and no suite reaches
 * serve.ts -- it calls Bun.serve() at module top level, so importing it starts a server.
 * A suite is excluded on the opposite reasoning: running it proves its imports, and its
 * fixtures are import statements inside STRING literals, which a text scan cannot tell apart.
 * A generator writing an import into its OUTPUT is that same class, and a static one there is
 * indistinguishable by text alone. What tells them apart is where the KEYWORD sits, never the
 * specifier: a specifier is a string in both cases, so blanking strings would blank the very
 * thing being resolved and leave the scan reporting nothing about every file. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { basename, join, dirname, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { relPosix } from '../../utils/posix-path.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { literalRanges, insideLiteral } from '../../lib/arena/comments.ts';
import { isScript, isSuite } from '../../lib/arena/domains.ts';
import { relativeSpecifiers, isInterpolated } from '../../graph/script-closure.ts';
import { walkFiles } from '../../utils/walk-files.ts';

const ANY_SPECIFIER = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;

export const UTILS = join(repoRoot, 'scripts', 'utils');

const EXTENSION_COUPLED_GUARD = /process\.argv\[1\]\s*(?:&&\s*process\.argv\[1\]\s*)?\.endsWith\(/;

export const VENDORED_VERBATIM = new Set([
  'scripts/lib/core/validate-palette.mjs',
  'scripts/generate/core/arena-to-prod/validate-palette.mjs',
]);

export function guardProblems(paths: string[], root = repoRoot) {
  return paths
    .map((p) => relPosix(root, p))
    .filter((rel: string) => !VENDORED_VERBATIM.has(rel))
    .filter((rel: string) => EXTENSION_COUPLED_GUARD.test(readFileSync(join(root, rel), 'utf8')))
    .map((rel: string) => `${rel} decides whether it is the program by matching its own filename`);
}

export function scriptsUnder(dir: string): string[] {
  return walkFiles(dir).filter((full) => isScript(basename(full)));
}

export const COLLECTED_PHASES = ['build', 'generate', 'check'];

const MAIN_GUARD = /^if \([^)]*\bimport\.meta\.(?:url|main)\b/;

const IMPORT_TIME_EFFECTS: [RegExp, string][] = [
  [/\bprocess\.exit\(/, 'exits the process'],
  [/^await\s|=\s*await\s/, 'awaits'],
  [/\bconsole\.\w+\(/, 'prints'],
  [/\b(?:readFileSync|writeFileSync|readdirSync|statSync|readJson)\(/, 'reads or writes a file'],
  [/\b(?:spawnSync|execFileSync|execSync)\(/, 'spawns a process'],
];

export function importTimeEffects(path: string) {
  const source = readFileSync(path, 'utf8');
  const literals = literalRanges(source);
  const found = [];
  let offset = 0;
  for (const line of source.split('\n')) {
    const start = offset;
    offset += line.length + 1;
    if (line === '' || /^\s/.test(line) || line.includes('=>') || MAIN_GUARD.test(line)) continue;
    if (insideLiteral(literals, start)) continue;
    const effect = IMPORT_TIME_EFFECTS.find(([re]) => re.test(line));
    if (effect) found.push(`${effect[1]} at import: ${line.trim()}`);
  }
  return found;
}

export { isInterpolated };

export function reachesOutOfUtils(path: string) {
  const source = readFileSync(path, 'utf8');
  const literals = literalRanges(source);
  const escaping = [];
  for (const m of source.matchAll(ANY_SPECIFIER)) {
    const spec = m[1] ?? '';
    if (isInterpolated(spec)) continue;
    if (insideLiteral(literals, m.index)) continue;
    if (spec.startsWith('node:')) continue;
    if (!spec.startsWith('.')) { escaping.push(spec); continue; }
    if (!join(dirname(path), spec).startsWith(`${UTILS}${sep}`)) escaping.push(spec);
  }
  return escaping;
}

export function unresolvedSpecifiers(path: string) {
  const bad = [];
  for (const spec of relativeSpecifiers(readFileSync(path, 'utf8'))) {
    if (!existsSync(join(dirname(path), spec))) bad.push(spec);
  }
  return bad;
}

test('every relative import in a non-suite script resolves to a file that is there', () => {
  const scripts = scriptsUnder(join(repoRoot, 'scripts'));
  assert.ok(scripts.length > 30, 'this suite found almost no scripts, so it proves almost nothing');

  const broken = scripts.flatMap((p) =>
    unresolvedSpecifiers(p).map((s) => `${relPosix(repoRoot, p)} imports ${s}`));
  assert.deepEqual(broken, []);
});

test('nothing under scripts/utils/ imports past scripts/utils/, which is the whole of what a util is', () => {
  const files = walkFiles(UTILS).filter((p) => isScript(p) || isSuite(p));
  assert.ok(files.length >= 4, 'an empty directory proves no boundary, so this counts what it walked');

  const escaping = files.flatMap((p) =>
    reachesOutOfUtils(p).map((s) => `${relPosix(repoRoot, p)} imports ${s}`));
  assert.deepEqual(escaping, [],
    'a util speaks no vocabulary of this repository, and its import list is where that stops being '
    + 'a claim: one specifier into lib/ makes it a lib module sitting in the wrong directory, and '
    + 'flat utils/ stops meaning anything. A node: builtin is not a reach out and a package name '
    + 'is, since a util carrying a dependency is a dependency with a util inside it. A suite here '
    + 'is in scope where the scan above excludes one, because running a suite proves its imports '
    + 'RESOLVE and proves nothing about where they point.');
});

test('a specifier a generator is writing into its output is not one this script imports', () => {
  assert.equal(isInterpolated('./${helper}.js'), true);
  assert.equal(isInterpolated('./lib/arena/repo-root.ts'), false);
});

test('serve.ts is in scope, and it is the reason this suite exists', () => {
  const scripts = scriptsUnder(join(repoRoot, 'scripts')).map((p) => relPosix(repoRoot, p));
  assert.ok(scripts.includes('scripts/serve.ts'));
});

test('a suite is out of scope, because its fixtures are imports inside strings', () => {
  const scripts = scriptsUnder(join(repoRoot, 'scripts')).map((p) => relPosix(repoRoot, p));
  assert.equal(scripts.some((p) => isSuite(p)), false);
  assert.deepEqual(unresolvedSpecifiers(join(repoRoot, 'scripts/check/arena/script-imports.test.ts')), [],
    'and this suite is its own witness: scanned directly it is clean, so exclusion is not hiding a break');
});

test('no script decides it is the program by matching its own filename, which a rename silently falsifies', () => {
  const problems = guardProblems(scriptsUnder(join(repoRoot, 'scripts')));
  assert.deepEqual(problems, [],
    'call isMainModule(import.meta.url) from utils/main-module.ts instead: a gate whose main() '
    + 'stops running exits 0 having read nothing, and check-all reports that as PASS');
});

test('a script the graph collects does no work when it is imported', () => {
  const collected = COLLECTED_PHASES.flatMap((phase) => scriptsUnder(join(repoRoot, 'scripts', phase)));
  assert.ok(collected.length > 50, 'this scan found almost no scripts, so it proves almost nothing');

  const working = collected.flatMap((p) =>
    importTimeEffects(p).map((effect) => `${relPosix(repoRoot, p)} ${effect}`));
  assert.deepEqual(working, [],
    'the graph collects a node by importing the script that declares it, so a script under these '
    + 'three phases has to survive an import having done nothing. Put the work in main() behind '
    + 'isMainModule(import.meta.url). serve.ts is out of scope because it is under no phase and '
    + 'nothing collects it, which is the same reason the specifier scan above keeps it in.');
});

test('the scan reads what a line does, not what a line defines', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-import-time-'));
  try {
    const clean = join(dir, 'Clean.ts');
    writeFileSync(clean, [
      "const read = (p) => readFileSync(p, 'utf8');",
      'function main() {',
      "  console.log(read('x'));",
      '  process.exit(0);',
      '}',
      'if (isMainModule(import.meta.url)) main();',
      'if (import.meta.main) main();',
      'if (invokedAs === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));',
      '',
    ].join('\n'));
    assert.deepEqual(importTimeEffects(clean), [],
      'a reader defined at the top level is a definition, and a guard line is the one top-level '
      + 'call that only runs when the module is the program. A guard is recognised by naming '
      + 'import.meta, in any of the three shapes here: the shipped CLI carries its own because '
      + 'scripts/utils/ is not inside the npm packages. What a guard may NOT compare against is '
      + 'the module filename, which guardProblems holds separately.');

    const working = join(dir, 'Working.ts');
    writeFileSync(working, ["const css = readFileSync('a.css', 'utf8');", 'process.exit(0);', ''].join('\n'));
    assert.deepEqual(importTimeEffects(working), [
      "reads or writes a file at import: const css = readFileSync('a.css', 'utf8');",
      'exits the process at import: process.exit(0);',
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the two vendored copies are exempt on the record, because re-vendoring is the only edit they take', () => {
  for (const rel of VENDORED_VERBATIM) {
    const source = readFileSync(join(repoRoot, rel), 'utf8');
    assert.match(source, EXTENSION_COUPLED_GUARD,
      `${rel} no longer carries the guard this exemption exists for, so the exemption is stale`);
    assert.match(source, /Vendored verbatim/,
      `${rel} is exempt only for as long as it says it is vendored`);
  }
});

test('a script is in scope in either extension, and a suite is not', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-imports-ext-'));
  try {
    for (const name of ['a.mjs', 'b.ts', 'a.test.mjs', 'b.test.ts', 'notes.md'])
      writeFileSync(join(dir, name), '// fixture\n');
    assert.deepEqual(scriptsUnder(dir).map((p) => relPosix(dir, p)).sort(),
      ['a.mjs', 'a.test.mjs', 'b.ts'],
      'the four modules that stay JavaScript are still scanned, and a .test.mjs is no longer a '
      + 'suite, so it falls to this walk rather than out of every one');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a real import that resolves to nothing is still caught, which is what the blanking must not cost', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-imports-'));
  try {
    const path = join(dir, 'Broken.mjs');
    writeFileSync(path, "import { x } from './gone.mjs';\nconst t = `import { y } from './alsoGone.mjs';`;\n");
    assert.deepEqual(unresolvedSpecifiers(path), ['./gone.mjs'],
      'the real import must be reported and the one inside the template must not');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
