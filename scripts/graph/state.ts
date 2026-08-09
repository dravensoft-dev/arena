/* What the last green run left behind, under .cache/, which this tree ignores. Two files, because
 * the two are sized differently: a stamp belongs to a FILE and is shared by every node reading it,
 * so it is written once and is the size of the repository; a node's entry keeps a digest and a
 * count of what it read rather than the pairs, since the gates with the widest subjects resolve
 * thousands of paths and a copy per node turns a cache into a database. Only a green run writes an
 * entry, and every other outcome deletes it: a SKIP recorded as green is a gate that never runs
 * again, and an entry is written after each node so a crash keeps the greens before it. Both files
 * carry the machine too, and a mismatch is discarded as an older version is: one tree is reachable
 * by two operating systems, where the schema agrees and the answer does not. */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { readJson } from '../utils/read-file.ts';
import { repoRoot } from '../lib/arena/repo-root.ts';
import { arch, platform } from '../lib/arena/platform.ts';
import type { Stamp } from './inputs.ts';
import type { Fingerprint } from './fingerprint.ts';

export const VERSION = 2;

export const FILES_PATH = join('.cache', 'graph', 'files.json');
export const STATE_PATH = join('.cache', 'graph', 'state.json');

export type NodeEntry = Fingerprint & { at: string };

function read(root: string, rel: string, key: string) {
  const path = join(root, rel);
  if (!existsSync(path)) return { fresh: true, value: {} as Record<string, unknown> };
  try {
    const held = readJson(path);
    if (held.version !== VERSION) return { fresh: true, value: {} as Record<string, unknown> };
    if (held.platform !== platform || held.arch !== arch) {
      return { fresh: true, value: {} as Record<string, unknown> };
    }
    return { fresh: false, value: (held[key] ?? {}) as Record<string, unknown> };
  } catch {
    return { fresh: true, value: {} as Record<string, unknown> };
  }
}

function write(root: string, rel: string, key: string, value: unknown) {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ version: VERSION, platform, arch, [key]: value }, null, 1)}\n`);
}

export function readFiles(root = repoRoot) {
  return new Map(Object.entries(read(root, FILES_PATH, 'files').value as Record<string, Stamp>));
}

export function writeFiles(stamps: Map<string, Stamp>, root = repoRoot) {
  write(root, FILES_PATH, 'files', Object.fromEntries([...stamps].sort(([a], [b]) => (a < b ? -1 : 1))));
}

export function readState(root = repoRoot) {
  return new Map(Object.entries(read(root, STATE_PATH, 'nodes').value as Record<string, NodeEntry>));
}

export function writeState(state: Map<string, NodeEntry>, root = repoRoot) {
  write(root, STATE_PATH, 'nodes', Object.fromEntries([...state].sort(([a], [b]) => (a < b ? -1 : 1))));
}

export function recordGreen(state: Map<string, NodeEntry>, name: string, entry: Fingerprint, at: string) {
  state.set(name, { ...entry, at });
  return state;
}

export function forget(state: Map<string, NodeEntry>, name: string) {
  state.delete(name);
  return state;
}
