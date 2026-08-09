/* The tooling answers to a compiler, which nothing under scripts/ did before. The project
 * names the strict family flag by flag rather than setting strict, because two of the seven
 * cost four figures here and arrive on their own: what is on is on because it was free or
 * nearly so. A .mjs is resolved and never checked, which is what the two vendored copies
 * need. It also holds that no script reaches for syntax bare node cannot strip, which is
 * what keeps one runnable by both runtimes check-all targets. A tsconfig
 * whose globs match nothing compiles nothing and reports clean, so this counts what the
 * project actually reached against what is on disk rather than trusting the globs. */

import { join, relative } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { typecheck, projectFiles, zeroProjectProblems } from '../../lib/arena/typecheck.ts';
import { relPosix } from '../../utils/posix-path.ts';

export const PROJECTS = [
  { project: 'scripts/tsconfig.check.json',
    reaches: 'every script and suite under scripts/, and the tailwind modules two of them import' },
];

export const CHECKED_EXTENSIONS = ['.ts', '.mjs'];

export function sourcesUnder(dir: string): string[] {
  return walkFiles(dir).filter((full) => CHECKED_EXTENSIONS.some((ext) => full.endsWith(ext)));
}

export function unreachedProblems(onDisk: string[], included: string[], root = repoRoot) {
  const reached = new Set(included);
  return onDisk
    .filter((path: string) => !reached.has(path))
    .map((path: string) => `${relPosix(root, path)} is on disk and the project's globs do not reach it`);
}

function main() {
  const empty = zeroProjectProblems(PROJECTS.length);
  for (const problem of empty) console.error(`check-script-types: ${problem}`);
  if (empty.length) process.exit(1);

  for (const { project, reaches } of PROJECTS) {
    let unreached;
    try {
      unreached = unreachedProblems(sourcesUnder(join(repoRoot, 'scripts')), projectFiles({ project }));
    } catch (err) {
      console.error(`check-script-types: ${(err as Error).message}`);
      process.exit(1);
    }
    if (unreached.length) {
      console.error(`check-script-types: ${project} leaves ${unreached.length} file(s) unchecked\n`);
      for (const problem of unreached) console.error(`  ${problem}`);
      process.exit(1);
    }

    let result;
    try {
      result = typecheck({ project });
    } catch (err) {
      console.error(`check-script-types: ${(err as Error).message}`);
      process.exit(1);
    }
    if (result.status !== 0) {
      console.error(`check-script-types: ${project} does not typecheck -- it reaches ${reaches}\n`);
      console.error(result.output.trim());
      process.exit(1);
    }
  }
  console.log(`check-script-types: ${PROJECTS.length} project(s) typecheck, reaching every source under scripts/`);
}

if (isMainModule(import.meta.url)) main();
