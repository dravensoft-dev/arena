/* Bundles the page entries build:angular-tests compiled. ngc emits ESM that still carries bare
 * @angular/* specifiers and extensionless relative imports, and Bun.build resolves both into
 * something a browser loads. `splitting` keeps the Angular runtime in one shared chunk across
 * every page. The compile is not this step's: the layer is compiled once, into build/test, and
 * read from there by the suites and by this bundle alike. */

import { basename, join } from 'node:path';
import { existsSync, rmSync } from 'node:fs';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { angularEmitRoot } from '../../lib/angular/emit-root.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { emitStaleness } from './build-angular-tests.ts';

const PROJECT = 'frameworks/angular/tsconfig.test.json';
const OUT_DIR = join(repoRoot, 'frameworks', 'angular', 'build', 'demo');
const JS_DIR = join(OUT_DIR, 'js');
const LAYER_ROOT = join(repoRoot, 'frameworks', 'angular');
const EMIT_DIR = angularEmitRoot(join(repoRoot, PROJECT));
const EMITTED = join(repoRoot, 'frameworks', 'angular', 'build');

export const LAYER = 'frameworks/angular';

export const node = {
  name: 'build:angular-demo',
  reads: [
    `${LAYER}/build/test/**`, `${LAYER}/components/**/*.entry.generated.ts`,
    `${LAYER}/kitchen-sink/**/*.entry.generated.ts`, 'scripts/build/angular/build-angular-tests.ts',
    'package.json', 'bun.lock',
  ],
  writes: [`${LAYER}/build/demo/**`],
  feeds: [
    'check:angular-demos',
    'check:focus-trap',
    'check:anchoring',
    'check:pixel-parity',
    'check:target-size',
    'check:playgrounds',
    'build:site',
    'check:site',
  ],
};

export const ENTRY_SUFFIXES = ['.demo.entry.generated.js', '.sink.entry.generated.js'];

export const isEntry = (name: string, ext = '.js') => ENTRY_SUFFIXES.some((s) => name.endsWith(s.replace('.js', ext)));

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

export function staleEmitMessage(reason: string | null) {
  if (reason === null) return null;
  return `build-angular-demo: the emit in frameworks/angular/build/test is out of date, because ${reason}. `
    + 'This step bundles that emit and compiles nothing, so run bun run build, or bun run '
    + 'build:angular-tests, first';
}

export function missingEntryProblems(sourceEntries: string[], emittedEntries: string[], emitDir = relPosix(repoRoot, EMIT_DIR)) {
  const emitted = new Set(emittedEntries.map((f: string) => f.slice(0, -'.js'.length)));
  const problems = [];
  for (const src of sourceEntries) {
    const stem = src.slice(0, -'.ts'.length);
    if (!emitted.has(stem)) {
      problems.push(
        `${src} has no corresponding emit in ${emitDir} -- `
        + `ngc never compiled it (check tsconfig.test.json's "include"), so its page loads nothing`,
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

  const stale = staleEmitMessage(emitStaleness());
  if (stale !== null) {
    console.error(`\n${stale}\n`);
    process.exit(1);
  }

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
