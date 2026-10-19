/* A temp root of its own for one suite step. The step's child process reads TMPDIR (and TEMP and
 * TMP, which Windows reads), so every directory a suite makes with `mkdtemp(tmpdir())` lands under
 * this root, and the runner removes the root when the step ends, whatever its result. The root is
 * made under the runner's own temp directory, never under the step's. Setting all three names on
 * every platform is harmless where only one is read. */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const SUITE_TMP_PREFIX = 'arena-run-';

export type SuiteTmp = { root: string; env: NodeJS.ProcessEnv; remove: () => void };

export function suiteTmp(base = tmpdir(), inherited: NodeJS.ProcessEnv = process.env): SuiteTmp {
  const root = mkdtempSync(join(base, SUITE_TMP_PREFIX));
  return {
    root,
    env: { ...inherited, TMPDIR: root, TEMP: root, TMP: root },
    remove: () => rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }),
  };
}
