/* A git ref built as a tree of its own, so check:pixel-parity can compare a phase against the
 * commit before it rather than one layer against the other. A worktree shares the object store
 * and costs a checkout, an install and a build; the marker is written last, so a directory
 * without it is a build that failed or was killed and is removed before it is tried again; a
 * registration whose directory is gone is pruned first, and a directory git does not know is deleted. */

import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deadline, type Deadline } from './deadline.ts';
import { hostBinary } from './host-binary.ts';

export const BASELINE_BUILD: Deadline = deadline('pixel-parity:baseline-build', 1_800_000,
  'the baseline is a fresh worktree, so it installs every dependency and runs the whole build, both '
  + 'layers bundled and every page emitted, which is the slowest thing this repository does from cold');

export const BUILT_MARKER = '.arena-baseline-built';

export type Run = (command: string, args: string[], cwd: string, timeout?: number) =>
  { status: number | null; stdout: string; stderr: string };

export const run: Run = (command, args, cwd, timeout) => {
  const r = spawnSync(command, args, { cwd, encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'] });
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
};

export function resolveBinary(name: string) {
  if (name === 'bun') return process.execPath;
  return hostBinary(name, 'to check a commit out as a worktree of its own, which only git can do');
}

export function baselineDir(sha: string, under = tmpdir()) {
  return join(under, `arena-baseline-${sha.slice(0, 12)}`);
}

export function resolveRef(ref: string, root: string, exec: Run = run, bin = resolveBinary) {
  const r = exec(bin('git'), ['rev-parse', '--verify', `${ref}^{commit}`], root);
  if (r.status !== 0) {
    throw new Error(`pixel-parity: ${JSON.stringify(ref)} names no commit in this repository, so there `
      + `is no tree to build a baseline from:\n${r.stderr.trim()}`);
  }
  return r.stdout.trim();
}

export function prepareBaseline(ref: string, root: string, {
  exec = run, under = tmpdir(), exists = existsSync, mark = (path: string) => writeFileSync(path, ''), bin = resolveBinary,
  remove = (path: string) => rmSync(path, { recursive: true, force: true }),
}: { exec?: Run; under?: string; exists?: (path: string) => boolean; mark?: (path: string) => void; remove?: (path: string) => void; bin?: (name: string) => string } = {}) {
  const sha = resolveRef(ref, root, exec, bin);
  const dir = baselineDir(sha, under);
  if (exists(join(dir, BUILT_MARKER))) return { dir, sha, reused: true };
  if (exists(dir)) {
    exec(bin('git'), ['worktree', 'remove', '--force', dir], root);
    remove(dir);
  }
  const steps: [string, string[], string, number | undefined][] = [
    [bin('git'), ['worktree', 'prune'], root, undefined],
    [bin('git'), ['worktree', 'add', '--detach', dir, sha], root, undefined],
    [bin('bun'), ['install', '--frozen-lockfile'], dir, BASELINE_BUILD.ms],
    [bin('bun'), ['run', 'build'], dir, BASELINE_BUILD.ms],
  ];
  for (const [command, args, cwd, timeout] of steps) {
    const r = exec(command, args, cwd, timeout);
    if (r.status !== 0) {
      throw new Error(`pixel-parity: building the baseline at ${sha.slice(0, 12)} failed at `
        + `${command} ${args.join(' ')} in ${cwd}:\n${r.stdout}${r.stderr}`);
    }
  }
  mark(join(dir, BUILT_MARKER));
  return { dir, sha, reused: false };
}
