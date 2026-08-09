/* The emit is skipped when no input has moved since the last one, because `bun run test` and
 * `bun run check` both run this first and the compile costs around 17 seconds against suites that
 * cost around 12. Freshness is a stamp this script writes after a successful emit, never the
 * outputs' own times: `ngc` is incremental and does not rewrite a file it did not change, so the
 * oldest output stays as old as the last time that one file changed. An equal timestamp rebuilds.
 * The stamp also records which inputs it compiled, because deleting a source bumps no surviving
 * file's time and a compared timestamp alone would skip. `--force` compiles unconditionally. */

import { spawnSync } from 'node:child_process';
import { join, relative } from 'node:path';
import { existsSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { readJson } from '../../utils/read-file.ts';
import { ngcBin } from '../../check/angular/check-angular.ts';
import { angularEmitRoot } from '../../lib/angular/emit-root.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

const PROJECT = 'frameworks/angular/tsconfig.test.json';
const OUT_DIR = join(repoRoot, 'frameworks', 'angular', 'build', 'test');

const EMITTED = join(repoRoot, 'frameworks', 'angular', 'build');

const LAYER_ROOT = join(repoRoot, 'frameworks', 'angular');
const EMIT_DIR = angularEmitRoot(join(repoRoot, PROJECT));
const STAMP = join(OUT_DIR, '.arena-emit-stamp');
const EXTERNAL_INPUTS = [
  join(repoRoot, 'package.json'),
  join(repoRoot, 'bun.lock'),
  fileURLToPath(import.meta.url),
];

export const LAYER = 'frameworks/angular';

export const node = {
  name: 'build:angular-tests',
  reads: [
    `${LAYER}/**/*.ts`, `${LAYER}/**/*.json`, '!frameworks/angular/build/**',
    'package.json', 'bun.lock',
  ],
  writes: [`${LAYER}/build/test/**`],
  feeds: [],
  runsBeforeSuites: 'bun run test and check-all\'s testStep() run it immediately before the suites '
    + 'that read the emit, so staleness there is prevented by ordering rather than by a gate. A '
    + 'build that emitted it would be emitting a tree no build step reads',
};

function pruneOrphans(dir: string) {
  const pruned: string[] = [];
  for (const full of walkFiles(dir)) {
    const rel = relative(EMIT_DIR, full);
    let srcRel;
    if (rel.endsWith('.js.map')) srcRel = rel.slice(0, -'.js.map'.length) + '.ts';
    else if (rel.endsWith('.d.ts')) srcRel = rel.slice(0, -'.d.ts'.length) + '.ts';
    else if (rel.endsWith('.js')) srcRel = rel.slice(0, -'.js'.length) + '.ts';
    else continue;
    if (srcRel.startsWith('..') || !existsSync(join(LAYER_ROOT, srcRel))) {
      rmSync(full);
      pruned.push(relative(repoRoot, full));
    }
  }
  return pruned;
}

function collectTestSources(dir: string) {
  return walkFiles(dir, { skip: (_name, path) => path === EMITTED })
    .filter((full) => full.endsWith('.test.ts'))
    .map((full) => relPosix(dir, full));
}

function collectEmittedTests(dir: string) {
  if (!existsSync(dir)) return [];
  return walkFiles(dir).filter((full) => full.endsWith('.test.js')).map((full) => relPosix(dir, full));
}

export function missingEmitProblems(sourceTests: string[], emittedTests: string[], emitDir = relPosix(repoRoot, EMIT_DIR)) {
  const emittedStems = new Set(emittedTests.map((f: string) => f.slice(0, -'.js'.length)));
  const problems = [];
  for (const src of sourceTests) {
    const stem = src.slice(0, -'.ts'.length);
    if (!emittedStems.has(stem)) {
      problems.push(
        `${src} has no corresponding .test.js in ${emitDir} -- ` +
        `ngc never compiled it (check tsconfig.test.json's "include"), so this suite never runs`,
      );
    }
  }
  return problems;
}

function collectInputs() {
  const out = walkFiles(LAYER_ROOT, { skip: (_name, path) => path === EMITTED })
    .filter((full) => full.endsWith('.ts') || full.endsWith('.json'))
    .map(stamp);
  for (const path of EXTERNAL_INPUTS) if (existsSync(path)) out.push(stamp(path));
  return out;
}

function stamp(path: string) {
  return { path: relPosix(repoRoot, path), mtimeMs: statSync(path).mtimeMs };
}

function readStamp() {
  if (!existsSync(STAMP)) return null;
  try {
    return { mtimeMs: statSync(STAMP).mtimeMs, paths: readJson(STAMP).paths };
  } catch {
    return null;
  }
}

export function stalenessReason(
  inputs: { path: string; mtimeMs: number }[],
  stamped: { paths?: string[]; mtimeMs: number } | null,
) {
  if (stamped === null) return 'no emit stamp is present, so nothing is known about what was compiled';
  if (inputs.length === 0) return 'no input was found to compare the emit against';
  const compiled = new Set(stamped.paths ?? []);
  const added = inputs.find((one: { path: string }) => !compiled.has(one.path));
  if (added) return `${added.path} was not compiled into the last emit`;
  if (compiled.size !== inputs.length) {
    const present = new Set(inputs.map((one: { path: string }) => one.path));
    return `${[...compiled].find((path) => !present.has(path))} is gone since the last emit`;
  }
  const newestInput = inputs.reduce((a, b) => (b.mtimeMs > a.mtimeMs ? b : a));
  if (newestInput.mtimeMs >= stamped.mtimeMs) return `${newestInput.path} is not older than the last emit`;
  return null;
}

function main() {
  if (!process.argv.includes('--force')) {
    const reason = stalenessReason(collectInputs(), readStamp());
    if (reason === null) {
      console.log(
        'build-angular-tests: no input has moved since the last emit, so ngc is not run. '
        + 'Compile anyway with --force.',
      );
      verifyEmit();
      return;
    }
    console.log(`build-angular-tests: compiling, because ${reason}`);
  }

  let bin;
  try {
    bin = ngcBin(repoRoot);
  } catch (err) {
    console.error(`build-angular-tests: ${(err as Error).message}`);
    process.exit(1);
  }
  const r = spawnSync(process.execPath, [bin, '-p', join(repoRoot, PROJECT)], { stdio: 'inherit', cwd: repoRoot });
  if (r.error) {
    console.error(`build-angular-tests: ngc failed to spawn: ${r.error.message || r.error}`);
    process.exit(1);
  }
  if (r.status !== 0) {
    console.error('\nbuild-angular-tests: the Angular test surface does not compile, so its suites cannot run');
    process.exit(r.status ?? 1);
  }
  console.log('build-angular-tests: the Angular test surface compiled to frameworks/angular/build/test');
  verifyEmit();
  writeFileSync(STAMP, JSON.stringify({ at: new Date().toISOString(), paths: collectInputs().map((one) => one.path) }));
}

function verifyEmit() {
  const pruned = pruneOrphans(OUT_DIR);
  if (pruned.length > 0) {
    console.log(`build-angular-tests: pruned ${pruned.length} orphaned output file(s):`);
    for (const p of pruned) console.log(`  ${p}`);
  } else {
    console.log('build-angular-tests: no orphaned output to prune');
  }

  const emitProblems = missingEmitProblems(
    collectTestSources(LAYER_ROOT),
    collectEmittedTests(EMIT_DIR),
  );
  if (emitProblems.length > 0) {
    console.error(`\nbuild-angular-tests: ${emitProblems.length} suite(s) compiled into nothing:\n`);
    for (const p of emitProblems) console.error(`  ${p}`);
    console.error('');
    process.exit(1);
  }
}

if (isMainModule(import.meta.url)) main();
