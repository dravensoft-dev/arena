/* Two steps, because neither tool does the other's job: ngc compiles the templates
 * AOT into ESM that still carries bare @angular/* specifiers and extensionless
 * relative imports, and Bun.build resolves both into something a browser loads.
 * `splitting` keeps the Angular runtime in one shared chunk across every page. */

import { spawnSync } from 'node:child_process';
import { basename, join, relative } from 'node:path';
import { existsSync, rmSync } from 'node:fs';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { ngcBin } from '../../check/angular/check-angular.ts';
import { angularEmitRoot } from '../../lib/angular/emit-root.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
const PROJECT = 'frameworks/angular/tsconfig.demo.json';
const OUT_DIR = join(repoRoot, 'frameworks', 'angular', 'build', 'demo');
const TSC_DIR = join(OUT_DIR, 'tsc');
const JS_DIR = join(OUT_DIR, 'js');
const LAYER_ROOT = join(repoRoot, 'frameworks', 'angular');
const EMIT_DIR = angularEmitRoot(join(repoRoot, PROJECT));
const EMITTED = join(repoRoot, 'frameworks', 'angular', 'build');

export const LAYER = 'frameworks/angular';

export const node = {
  name: 'build:angular-demo',
  reads: [
    `${LAYER}/components/**/*.ts`, `${LAYER}/components/**/*.html`,
    `${LAYER}/playground/**/*.ts`,
    `${LAYER}/*.ts`, `${LAYER}/tsconfig*.json`, 'package.json', 'bun.lock',
  ],
  writes: [`${LAYER}/build/demo/**`],
  feeds: [
    'check:angular-demos',
    'check:focus-trap',
    'check:playgrounds',
  ],
};

export const ENTRY_SUFFIXES = ['.demo.entry.generated.js'];

export const isEntry = (name: string, ext = '.js') => ENTRY_SUFFIXES.some((s) => name.endsWith(s.replace('.js', ext)));

function pruneOrphans(dir: string) {
  const pruned: string[] = [];
  if (!existsSync(dir)) return pruned;
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

export function collectEntries(dir: string) {
  if (!existsSync(dir)) return [];
  return walkFiles(dir).filter((full) => isEntry(basename(full))).sort();
}

export function unbundledProblems(entryNames: string[], landed: string[], dir: string) {
  const there = new Set(landed);
  return entryNames
    .filter((name: string) => !there.has(name))
    .map((name: string) => `${dir}/${name} is not there after bundling. Every page loads its own `
      + 'entry from that directory BY NAME, so a bundler that lands it anywhere else, or under '
      + `any other name, leaves the page fetching nothing: it renders an empty document and the `
      + 'gates that open one wait out their whole timeout for a component that was never served. '
      + `What did land: ${landed.length === 0 ? 'nothing at all' : landed.slice(0, 5).join(', ')}`);
}

export function missingEntryProblems(sourceEntries: string[], emittedEntries: string[], emitDir = relPosix(repoRoot, EMIT_DIR)) {
  const emitted = new Set(emittedEntries.map((f: string) => f.slice(0, -'.js'.length)));
  const problems = [];
  for (const src of sourceEntries) {
    const stem = src.slice(0, -'.ts'.length);
    if (!emitted.has(stem)) {
      problems.push(
        `${src} has no corresponding emit in ${emitDir} -- `
        + `ngc never compiled it (check tsconfig.demo.json's "include"), so its page loads nothing`,
      );
    }
  }
  return problems;
}

function collectSourceEntries(dir: string) {
  if (!existsSync(dir)) return [];
  return walkFiles(dir, { skip: (_name, path) => path === EMITTED })
    .filter((full) => isEntry(basename(full), '.ts'))
    .map((full) => relPosix(dir, full));
}

async function main() {
  if (typeof Bun === 'undefined' || typeof Bun.build !== 'function') {
    console.error(
      'build-angular-demo: needs Bun.build to bundle the compiled layer for a browser, '
      + 'and this runtime has no bundler. Run it under bun.',
    );
    process.exit(2);
  }

  let bin;
  try {
    bin = ngcBin(repoRoot);
  } catch (err) {
    console.error(`build-angular-demo: ${(err as Error).message}`);
    process.exit(1);
  }

  const r = spawnSync(process.execPath, [bin, '-p', join(repoRoot, PROJECT)], { stdio: 'inherit', cwd: repoRoot });
  if (r.error) {
    console.error(`build-angular-demo: ngc failed to spawn: ${r.error.message || r.error}`);
    process.exit(1);
  }
  if (r.status !== 0) {
    console.error('\nbuild-angular-demo: the Angular layer does not compile, so its demo pages cannot be built');
    process.exit(r.status ?? 1);
  }

  const pruned = pruneOrphans(TSC_DIR);
  if (pruned.length > 0) console.log(`build-angular-demo: pruned ${pruned.length} orphaned output file(s)`);

  const emitProblems = missingEntryProblems(
    collectSourceEntries(LAYER_ROOT),
    collectEntries(EMIT_DIR).map((p) => relPosix(EMIT_DIR, p)),
  );
  if (emitProblems.length > 0) {
    console.error(`\nbuild-angular-demo: ${emitProblems.length} page entr(y/ies) compiled into nothing:\n`);
    for (const p of emitProblems) console.error(`  ${p}`);
    process.exit(1);
  }

  const entrypoints = collectEntries(EMIT_DIR);
  if (entrypoints.length === 0) {
    console.error(
      'build-angular-demo: found 0 page entries to bundle. An empty result set is a failure, '
      + 'not a clean pass -- every demo page would load a script that was never written.',
    );
    process.exit(1);
  }

  rmSync(JS_DIR, { recursive: true, force: true });
  const built = await Bun.build({ entrypoints, target: 'browser', splitting: true, outdir: JS_DIR, naming: '[name].[ext]' });
  if (!built.success) {
    console.error('\nbuild-angular-demo: bundling failed\n');
    for (const log of built.logs) console.error(String(log));
    process.exit(1);
  }

  const unbundled = unbundledProblems(
    entrypoints.map((entry) => basename(entry)),
    collectEntries(JS_DIR).map((full) => basename(full)),
    relPosix(repoRoot, JS_DIR),
  );
  if (unbundled.length > 0) {
    console.error(`\nbuild-angular-demo: ${unbundled.length} page(s) bundled to somewhere else\n`);
    for (const p of unbundled) console.error(`  ${p}`);
    process.exit(1);
  }

  console.log(`build-angular-demo: bundled ${entrypoints.length} page(s) into frameworks/angular/build/demo/js`);
}

if (isMainModule(import.meta.url)) await main();
