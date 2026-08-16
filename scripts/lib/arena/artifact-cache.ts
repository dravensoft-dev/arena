/* A derived answer kept under .cache/artifacts/, so a step that spawns a compiler pays it once for
 * a given set of bytes. It is NOT the graph's cache and shares nothing with it: that one keeps
 * stamps and decides whether a NODE runs, this one keeps the answer a step would recompute, under
 * its own directory and its own VERSION, and neither reads the other's files. Two rules make it
 * safe to have a gate read one: the digest covers every input BYTE, with no stat filter, because
 * here a stale entry is a wrong answer rather than a step that failed to re-run; and only what the
 * builder asks to KEEP is written, so a verdict out of a broken install re-runs instead of
 * becoming permanent. An entry is therefore never authoritative: a miss recomputes, and a hit is
 * the value a miss would have produced. */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { byCodeUnit } from '../../utils/compare.ts';
import { arch, platform } from './platform.ts';
import { repoRoot } from './repo-root.ts';

export const VERSION = 1;

export const CACHE_DIR = join('.cache', 'artifacts');

export type Held<T> = { version: number; platform: string; arch: string; digest: string; count: number; value: T };

export const entryPath = (name: string, root = repoRoot) =>
  join(root, CACHE_DIR, `${name.replace(/[^A-Za-z0-9._-]/g, '-')}.json`);

export function digestOf(paths: string[], root = repoRoot) {
  const rows = [...new Set(paths)].sort(byCodeUnit).map((path) => {
    const full = join(root, path);
    try {
      return [path, createHash('sha256').update(readFileSync(full)).digest('hex')];
    } catch {
      return [path, null];
    }
  });
  return { digest: createHash('sha256').update(JSON.stringify(rows)).digest('hex'), count: rows.length };
}

export function read<T>(name: string, root = repoRoot): Held<T> | null {
  const path = entryPath(name, root);
  if (!existsSync(path)) return null;
  try {
    const held = readJson(path) as Held<T>;
    if (held.version !== VERSION || held.platform !== platform || held.arch !== arch) return null;
    return held;
  } catch {
    return null;
  }
}

export function write<T>(name: string, inputs: string[], value: T, root = repoRoot) {
  const { digest, count } = digestOf(inputs, root);
  const path = entryPath(name, root);
  mkdirSync(join(root, CACHE_DIR), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ version: VERSION, platform, arch, digest, count, value }, null, 1)}\n`);
  return digest;
}

export function purge(root = repoRoot) {
  const dir = join(root, CACHE_DIR);
  if (!existsSync(dir)) return 0;
  const held = readdirSync(dir).filter((name) => name.endsWith('.json'));
  rmSync(dir, { recursive: true, force: true });
  return held.length;
}

export type Built<T> = { value: T; read: string[]; keep: boolean };

export function cachedReading<T>(
  name: string, candidates: string[], build: () => Built<T>, root = repoRoot,
): T {
  const held = read<{ value: T; read: string[] }>(name, root);
  if (held && Array.isArray(held.value?.read)) {
    const now = digestOf([...candidates, ...held.value.read], root);
    if (now.digest === held.digest && now.count === held.count) return held.value.value;
  }
  const built = build();
  if (built.keep) write(name, [...candidates, ...built.read], { value: built.value, read: built.read }, root);
  return built.value;
}

export function cached<T>(name: string, inputs: string[], build: () => T, root = repoRoot): T {
  return cachedReading(name, inputs, () => ({ value: build(), read: [], keep: true }), root);
}
