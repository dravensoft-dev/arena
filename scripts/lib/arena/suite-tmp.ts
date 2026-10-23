/* A temp root of its own for one suite step. The step's child process reads TMPDIR (and TEMP and
 * TMP, which Windows reads), so every directory a suite makes with `mkdtemp(tmpdir())` lands under
 * this root, and the runner removes the root when the step ends, whatever its result. The root is
 * made under the runner's own temp directory, never under the step's. Setting all three names on
 * every platform is harmless where only one is read. `left()` reads what the root holds before the
 * removal, each entry with its kind and, for a file, its size, mtime and first bytes, which is what
 * finding its writer takes; `leftoverLine` words the line a runner fails a step with. An empty
 * fetcher directory a browser left is swept first: only once the step has ended is no browser of
 * its own alive to use one, and a teardown in a shared root cannot tell its own from another's. */

import { closeSync, lstatSync, mkdtempSync, openSync, readSync, readdirSync, rmSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const SUITE_TMP_PREFIX = 'arena-run-';

export const FETCHER_DIR = 'chrome_url_fetcher_';

const SHOWN = 20;

const HEAD = 24;

export function describeEntry(path: string, name: string) {
  try {
    const stat = lstatSync(path);
    if (stat.isDirectory()) return `${name} (directory)`;
    const head = Buffer.alloc(Math.min(HEAD, stat.size));
    const fd = openSync(path, 'r');
    try { readSync(fd, head, 0, head.length, 0); } finally { closeSync(fd); }
    const start = stat.size === 0 ? 'empty' : `starts ${JSON.stringify(head.toString('latin1'))}`;
    return `${name} (file, ${stat.size} B, mtime ${stat.mtime.toISOString()}, ${start})`;
  } catch (e) {
    return `${name} (unreadable: ${(e as NodeJS.ErrnoException).code ?? (e as Error).message})`;
  }
}

export type SuiteTmp = { root: string; env: NodeJS.ProcessEnv; left: () => string[]; remove: () => void };

export function leftoverLine(step: string, names: string[]) {
  const shown = names.slice(0, SHOWN).join(', ');
  const more = names.length > SHOWN ? `, and ${names.length - SHOWN} more` : '';
  return `${step} left ${names.length} ${names.length === 1 ? 'entry' : 'entries'} in its temp root: ${shown}${more}`;
}

export function suiteTmp(base = tmpdir(), inherited: NodeJS.ProcessEnv = process.env): SuiteTmp {
  const root = mkdtempSync(join(base, SUITE_TMP_PREFIX));
  return {
    root,
    env: { ...inherited, TMPDIR: root, TEMP: root, TMP: root },
    left: () => {
      try {
        for (const name of readdirSync(root))
          if (name.includes(FETCHER_DIR)) try { rmdirSync(join(root, name)); } catch {  }
        return readdirSync(root).sort().map((name) => describeEntry(join(root, name), name));
      } catch {
        return [];
      }
    },
    remove: () => rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }),
  };
}
