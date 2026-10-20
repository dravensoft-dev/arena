/* A temp root of its own for one suite step. The step's child process reads TMPDIR (and TEMP and
 * TMP, which Windows reads), so every directory a suite makes with `mkdtemp(tmpdir())` lands under
 * this root, and the runner removes the root when the step ends, whatever its result. The root is
 * made under the runner's own temp directory, never under the step's. Setting all three names on
 * every platform is harmless where only one is read. `left()` reads the names the root holds before
 * the removal, and `leftoverLine` words the line a runner prints when a step left any. `leftoverFails`
 * says whether that line fails the step (Linux, where the leftovers were measured) or only warns. */

import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { platform, type Platform } from './platform.ts';

export const SUITE_TMP_PREFIX = 'arena-run-';

const SHOWN = 20;

export function leftoverFails(on: Platform = platform) {
  return on !== 'win32' && on !== 'darwin';
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
        return readdirSync(root).sort();
      } catch {
        return [];
      }
    },
    remove: () => rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }),
  };
}
