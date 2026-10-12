/* One ngc program over the whole Angular layer, its suites and every page entry, under
 * strictTemplates: its exit is the layer's type verdict, its tree is what the suites run and what
 * build:angular-demo bundles, so the layer is compiled once rather than once per reader. The emit
 * is skipped when no input differs from the last one, because `bun run build`, `bun run test` and
 * `bun run check` all run it. Freshness is a stamp this script writes after a successful emit,
 * never the outputs' own times: `ngc` is incremental and does not rewrite a file it did not
 * change. The stamp records each compiled input's path, size, mtime and sha256. An input whose
 * size and mtime match is unchanged unread; one whose time moved is hashed, and only other
 * content is stale, so a rewrite of the same bytes costs no compile. The package in dist/ is no
 * input: ngc never reads it. An added or deleted input is stale too. `--force` compiles. */

import { join, relative } from 'node:path';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { readJson } from '../../utils/read-file.ts';
import { ngcBin } from '../../lib/angular/ngc-bin.ts';
import { angularEmitRoot } from '../../lib/angular/emit-root.ts';
import { stampOf, type Stamp } from '../../graph/inputs.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { endIfInterrupted, spawnForwarding } from '../../lib/arena/spawn-forwarding.ts';

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
    `${LAYER}/**/*.ts`, `${LAYER}/**/*.json`, '!frameworks/angular/build/**', '!frameworks/angular/dist/**',
    '!frameworks/angular/*.md/**',
    'package.json', 'bun.lock',
  ],
  writes: [`${LAYER}/build/test/**`],
  feeds: ['build:angular-demo'],
  pool: 'compiler' as const,
  cost: 21.2,
};

function pruneOrphans(dir: string) {
  const pruned: string[] = [];
  for (const full of walkFiles(dir)) {
    const rel = relPosix(EMIT_DIR, full);
    let srcRel;
    if (rel.endsWith('.js.map')) srcRel = rel.slice(0, -'.js.map'.length) + '.ts';
    else if (rel.endsWith('.d.ts')) srcRel = rel.slice(0, -'.d.ts'.length) + '.ts';
    else if (rel.endsWith('.js')) srcRel = rel.slice(0, -'.js'.length) + '.ts';
    else continue;
    if (srcRel.startsWith('..') || !existsSync(join(LAYER_ROOT, srcRel))) {
      rmSync(full);
      pruned.push(relPosix(repoRoot, full));
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

export type Recorded = Record<string, Stamp>;

export function collectInputs(
  repo = repoRoot, layer = LAYER_ROOT, skipDirs = [join(layer, 'build'), join(layer, 'dist')],
  external = EXTERNAL_INPUTS,
) {
  const out = walkFiles(layer, { skip: (_name, path) => skipDirs.includes(path) })
    .filter((full) => full.endsWith('.ts') || full.endsWith('.json'));
  for (const path of external) if (existsSync(path)) out.push(path);
  return out.map((full) => relPosix(repo, full));
}

export function emitStaleness(
  repo = repoRoot, layer = LAYER_ROOT, stampFile = STAMP, skipDirs?: string[], external = EXTERNAL_INPUTS,
) {
  return stalenessReason(repo, collectInputs(repo, layer, skipDirs, external), readStamp(stampFile));
}

export function recordInputs(repo: string, paths: string[], previous: Recorded = {}) {
  const out: Recorded = {};
  for (const path of paths) out[path] = stampOf(join(repo, path), previous[path]);
  return out;
}

const isStamp = (one: any): one is Stamp => one !== null && typeof one === 'object'
  && typeof one.size === 'number' && typeof one.mtimeMs === 'number' && typeof one.hash === 'string';

export function readStamp(file = STAMP): { inputs: Recorded } | { problem: string } | null {
  if (!existsSync(file)) return null;
  let parsed;
  try {
    parsed = readJson(file);
  } catch (err) {
    return { problem: `the emit stamp cannot be read (${(err as Error).message})` };
  }
  const inputs = parsed?.inputs;
  if (inputs === null || typeof inputs !== 'object' || !Object.values(inputs).every(isStamp)) {
    return { problem: 'the emit stamp is in a shape that holds no content hashes, so nothing is known about what was compiled' };
  }
  return { inputs };
}

export function stalenessReason(
  repo: string,
  paths: string[],
  stamped: { inputs: Recorded } | { problem: string } | null,
) {
  if (stamped === null) return 'no emit stamp is present, so nothing is known about what was compiled';
  if ('problem' in stamped) return stamped.problem;
  if (paths.length === 0) return 'no input is found to compare the emit against';
  const compiled = stamped.inputs;
  const added = paths.find((path) => !(path in compiled));
  if (added) return `${added} is not among the inputs the last emit compiled`;
  if (Object.keys(compiled).length !== paths.length) {
    const present = new Set(paths);
    return `${Object.keys(compiled).find((path) => !present.has(path))} is among the inputs the last emit compiled and is not on disk`;
  }
  for (const path of paths) {
    let current;
    try {
      current = stampOf(join(repo, path), compiled[path]);
    } catch (err) {
      return `${path} cannot be read (${(err as Error).message})`;
    }
    if (current.hash !== compiled[path]!.hash) return `${path} holds other content than the last emit compiled`;
  }
  return null;
}

export async function compileTests(bin: string, project: string, cwd: string) {
  const r = await spawnForwarding(process.execPath, [bin, '-p', project], { cwd });
  endIfInterrupted('build-angular-tests', r);
  return r;
}

async function main() {
  if (!process.argv.includes('--force')) {
    const reason = emitStaleness();
    if (reason === null) {
      console.log(
        'build-angular-tests: no input differs from what the last emit compiled, so ngc is not run. '
        + 'Compile anyway with --force.',
      );
      verifyEmit();
      return;
    }
    console.log(`build-angular-tests: compiling, because ${reason}`);
  }

  const inputs = recordInputs(repoRoot, collectInputs());
  let bin;
  try {
    bin = ngcBin(repoRoot);
  } catch (err) {
    console.error(`build-angular-tests: ${(err as Error).message}`);
    process.exit(1);
  }
  const r = await compileTests(bin, join(repoRoot, PROJECT), repoRoot);
  if (r.error) {
    console.error(`build-angular-tests: ngc failed to spawn: ${r.error.message || r.error}`);
    process.exit(1);
  }
  if (r.signal) {
    console.error(`build-angular-tests: ngc ended on ${r.signal}, which this step did not send, so the Angular layer is not compiled`);
    process.exit(1);
  }
  if (r.status !== 0) {
    console.error('\nbuild-angular-tests: the Angular layer does not compile under strictTemplates, so its suites cannot run and its demo pages cannot be built');
    process.exit(r.status ?? 1);
  }
  console.log('build-angular-tests: the Angular layer compiled to frameworks/angular/build/test');
  verifyEmit();
  writeFileSync(STAMP, JSON.stringify({ at: new Date().toISOString(), inputs }));
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

if (isMainModule(import.meta.url)) await main();
