/* A file's fingerprint, with the stat as the filter and the content hash as the arbiter. Size and
 * mtime agreeing with the record is taken as the file, and nothing is read; either moving costs one
 * read, and a hash that comes back equal updates the stat and leaves the fingerprint where it was,
 * so a branch switch or a touch re-reads once and invalidates nothing. A file rewritten to the same
 * size AND the same mtime is read as unchanged, which is the one blind spot and takes a deliberate
 * mtime restore to reach; --force is what answers it. The walk is not git's file list, so an
 * artifact git ignores is fingerprinted like any other file and needs no rule of its own. restamp
 * re-reads what one step's writes reach, under the directories they name, so a runner keeps the
 * record current as each step ends without walking the tree under the steps still running. */

import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { walkFiles, type WalkOptions } from '../utils/walk-files.ts';
import { relPosix } from '../utils/posix-path.ts';
import { withForeignTrees } from '../lib/arena/foreign-trees.ts';
import { globFreePrefix, normalizeSpec, partition, resolveSpecs, specMatcher } from './pathspecs.ts';

export type Stamp = { size: number; mtimeMs: number; hash: string };

export const SKIPPED_DIRECTORIES = withForeignTrees('.cache');

export const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');

export function universe(root: string) {
  return walkFiles(root, { skip: (name) => SKIPPED_DIRECTORIES.has(name) })
    .map((full) => relPosix(root, full));
}

export function stampOf(path: string, previous?: Stamp): Stamp {
  const { size, mtimeMs } = statSync(path);
  if (previous && previous.size === size && previous.mtimeMs === mtimeMs) return previous;
  return { size, mtimeMs, hash: sha256(readFileSync(path)) };
}

export function stampAll(root: string, paths: string[], previous: Map<string, Stamp> = new Map()) {
  const stamps = new Map<string, Stamp>();
  for (const path of paths) {
    try {
      stamps.set(path, stampOf(join(root, path), previous.get(path)));
    } catch {
      continue;
    }
  }
  return stamps;
}

const GLOB = /[*?]/;

export function restamp(
  root: string,
  specs: string[],
  paths: string[],
  stamps: Map<string, Stamp>,
  walk: (dir: string, options: WalkOptions) => string[] = walkFiles,
) {
  const found = new Set<string>();
  const { included, excluded } = partition(specs);
  const pruned = excluded
    .filter((spec) => spec.endsWith('/**'))
    .map((spec) => specMatcher(spec.slice(0, -'/**'.length)));
  const skip = (name: string, path: string, isDirectory: boolean) =>
    SKIPPED_DIRECTORIES.has(name) || (isDirectory && pruned.some((test) => test(relPosix(root, path))));
  for (const spec of included) {
    const normal = normalizeSpec(spec);
    const at = GLOB.test(normal) ? globFreePrefix(spec) : normal;
    let directory;
    try {
      directory = statSync(join(root, at)).isDirectory();
    } catch {
      continue;
    }
    if (!directory) {
      found.add(at);
      continue;
    }
    for (const full of walk(join(root, at), { skip })) {
      found.add(relPosix(root, full));
    }
  }
  const reached = new Set(resolveSpecs(specs, paths));
  const kept: string[] = [];
  for (const path of resolveSpecs(specs, found)) {
    try {
      stamps.set(path, stampOf(join(root, path), stamps.get(path)));
      kept.push(path);
    } catch {
      stamps.delete(path);
    }
  }
  const landed = new Set(kept);
  for (const path of reached) if (!landed.has(path)) stamps.delete(path);
  return [...paths.filter((path) => !reached.has(path)), ...kept];
}

export function digestOf(paths: string[], stamps: Map<string, Stamp>) {
  return sha256(JSON.stringify(paths.map((path) => [path, stamps.get(path)?.hash ?? null])));
}
