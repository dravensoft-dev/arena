/* The React layer answers to a compiler. It is the only gate that can catch a component
 * disagreeing with the interface beside it, which is what 54 hand-written .d.ts could not.
 * tsc runs under plain node, so unlike check:demos and check:vendor this gate never skips. */

import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { verdictFor, zeroProjectProblems } from '../../lib/arena/typecheck.ts';

export const node = {
  name: 'check:react-types',
  reads: ['frameworks/react/**/*.ts', 'frameworks/react/**/*.tsx', 'frameworks/react/tsconfig*.json'],
  writes: [],
  feeds: [],
};

export const PROJECTS = [
  { project: 'frameworks/react/tsconfig.check.json', reaches: 'every component, helper and suite in the layer' },
];

export const SOURCE_EXTENSIONS = ['.ts', '.tsx'];

export const CANDIDATE_SKIP = new Set(['node_modules', 'dist', 'build']);

export function candidates(root = repoRoot) {
  return walkFiles(join(root, 'frameworks/react'), { skip: (name) => CANDIDATE_SKIP.has(name) })
    .filter((path) => SOURCE_EXTENSIONS.some((ext) => path.endsWith(ext)) || path.endsWith('.json'))
    .map((path) => relPosix(root, path));
}

function main() {
  const empty = zeroProjectProblems(PROJECTS.length);
  for (const problem of empty) console.error(`check-react-types: ${problem}`);
  if (empty.length) process.exit(1);

  for (const { project, reaches } of PROJECTS) {
    let verdict;
    try {
      verdict = verdictFor(project, candidates());
    } catch (err) {
      console.error(`check-react-types: ${(err as Error).message}`);
      process.exit(1);
    }
    if (verdict.status !== 0) {
      console.error(`check-react-types: ${project} does not typecheck — it reaches ${reaches}\n`);
      console.error(verdict.output.trim());
      process.exit(1);
    }
  }
  console.log(`check-react-types: ${PROJECTS.length} project(s) typecheck under strict`);
}

if (isMainModule(import.meta.url)) main();
