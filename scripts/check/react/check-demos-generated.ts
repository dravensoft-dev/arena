import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { relPosix } from '../../utils/posix-path.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { buildDemos, BANNER, ROOTS, ROOT_MODULES, COMPILED_EXTENSIONS } from '../../build/react/build-demos.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { skipExitCode } from '../../lib/arena/arena-scripts-vars.ts';

export function emittedName(path: string) {
  const stem = path.replace(/\.tsx?$/, '');
  return stem.endsWith('.generated') ? `${stem}.js` : `${stem}.generated.js`;
}

export const node = {
  name: 'check:demos',
  reads: [
    ...ROOTS.flatMap((root) => COMPILED_EXTENSIONS.map((ext) => `${root}/**/*${ext}`)),
    ...ROOTS.map((root) => `${root}/**/*.generated.js`),
    ...ROOT_MODULES,
    ...ROOT_MODULES.map(emittedName),
  ],
  writes: [],
  feeds: [],
};

function skip(reason: string) {
  const code = skipExitCode();
  console.error(`check-demos-generated: ${code === 1 ? 'FAILED (strict)' : 'SKIPPED'} — ${reason}`);
  if (code === 2) console.error('  check-all reports the run INCOMPLETE; the repository declares ARENA_CHECK_STRICT=1, so this environment overrides it.');
  process.exit(code);
}

function findJsFiles(dir: string) {
  return walkFiles(dir).filter((path) => path.endsWith('.generated.js'));
}

async function main() {
  if (!process.versions.bun) skip('Bun.Transpiler is Bun-only, and this is not running under Bun');

  const built = await buildDemos({ root });
  const drift = [];

  for (const [outRel, expected] of built) {
    const path = join(root, outRel);
    let actual;
    try {
      actual = readFileSync(path, 'utf8');
    } catch {
      drift.push(`${outRel}: missing — run bun run build:demos`);
      continue;
    }
    if (actual !== expected) drift.push(`${outRel}: stale`);
  }

  for (const treeRoot of ROOTS) {
    for (const absPath of findJsFiles(join(root, treeRoot))) {
      const outRel = relPosix(root, absPath);
      if (built.has(outRel)) continue;
      let content;
      try {
        content = readFileSync(absPath, 'utf8');
      } catch {
        continue;
      }
      if (content.startsWith(BANNER)) drift.push(`${outRel}: orphaned — no source sibling produces it anymore; remove it or run bun run build:demos`);
    }
  }

  if (drift.length) {
    console.error(`check-demos-generated: ${drift.length} drift(s) between a component source and its committed *.js sibling\n`);
    for (const d of drift) console.error(`  ${d}`);
    console.error('\nRun: bun run build:demos');
    process.exit(1);
  }
  console.log(`check-demos-generated: ${built.size} file(s) in sync`);
}

if (isMainModule(import.meta.url)) await main();
