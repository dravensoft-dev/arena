/* Runs a node under the tracer and reports what FILES it opened and does not declare, answering
 * what check:graph cannot: that gate holds the edges BETWEEN declarations, so a `reads` that is too
 * narrow leaves no disagreement to find, and only a run is a witness. A directory it listed is not
 * counted, because the digest is over a sorted list and a file appearing under a spec already moves
 * it. Neither is a probe on a path that is not there, and that is the one place two rules here
 * disagree: it IS a dependency, and check:graph refuses a spec whose directory holds nothing, so it
 * cannot be written down; the day the tree exists the read becomes real and this reports it.
 * A node that spawns a process is reported unaudited and never clean, because measuring nothing and
 * finding nothing have to read differently. */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../lib/arena/repo-root.ts';
import { matchesSpec } from './pathspecs.ts';
import { TRACE_VAR, traceFile } from './fs-trace.ts';
import type { GraphNode } from './graph.ts';

export const UNTRACEABLE = new Map([
  ['check:react-types', 'it spawns tsc, and the compiler opens the layer in the other process'],
  ['check:angular', 'it spawns ngc once per project, and the compiler opens the layer in there'],
  ['check:angular-demos', 'it reads what ngc emitted, and ngc ran elsewhere'],
  ['check:focus-trap', 'it drives a browser, which fetches over a socket rather than opening a file'],
  ['check:consumer', 'it runs the shipped CLI in a scratch project, in another process'],
  ['check:packages', 'it reads dist/, which ng-packagr and the React emit wrote in other processes'],
  ['build:tailwind', 'it compiles through Tailwind, which resolves its own imports'],
  ['build:angular-demo', 'it spawns ngc and then bundles'],
  ['build:angular-tests', 'it spawns ngc, which reads the layer in a process this cannot enter'],
  ['build:angular-package', 'it spawns ng-packagr, which resolves and reads the layer itself'],
  ['build:react-package', 'it spawns tsc, which reads the layer in a process this cannot enter'],
]);

export const NOT_AN_INPUT = [
  '.cache/**/*', 'node_modules/**/*', '.git/**/*', 'scripts/**/*',
];

export const isDirectory = (root: string, rel: string) => {
  try { return statSync(join(root, rel)).isDirectory(); } catch { return false; }
};

export function undeclaredReads(
  node: GraphNode, opened: string[], root = repoRoot,
  onDisk = (rel: string) => existsSync(join(root, rel)),
) {
  return opened
    .filter(onDisk)
    .filter((rel) => !isDirectory(root, rel))
    .filter((rel) => !NOT_AN_INPUT.some((spec) => matchesSpec(spec, rel)))
    .filter((rel) => ![...node.reads, ...node.writes]
      .some((spec) => matchesSpec(spec.replace(/^!/, ''), rel)))
    .sort();
}

export function traceRun(script: string, name: string, root = repoRoot) {
  const path = traceFile(root, name);
  rmSync(path, { force: true });
  const result = spawnSync(
    process.execPath,
    ['--preload', join(root, 'scripts/graph/trace-preload.ts'), join(root, script)],
    { cwd: root, stdio: 'ignore', env: { ...process.env, [TRACE_VAR]: path } },
  );
  const opened = existsSync(path) ? readFileSync(path, 'utf8').split('\n').filter(Boolean) : [];
  return { status: result.status, opened };
}

export function auditProblems(node: GraphNode, script: string, root = repoRoot) {
  const reason = UNTRACEABLE.get(node.name);
  if (reason) return { unaudited: reason, undeclared: [] as string[], opened: 0 };

  const { opened } = traceRun(script, node.name, root);
  if (opened.length === 0) {
    return {
      unaudited: 'the tracer recorded no read at all, and a gate that opens nothing is not a gate',
      undeclared: [] as string[],
      opened: 0,
    };
  }
  return { unaudited: null, undeclared: undeclaredReads(node, opened, root), opened: opened.length };
}
