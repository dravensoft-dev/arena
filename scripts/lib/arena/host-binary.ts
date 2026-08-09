/* A binary the host provides, resolved to a path before it is spawned. Six sites passed a bare
 * name to spawnSync, which works on POSIX and is a coin toss on Windows: there is no `git`
 * there, there is `git.exe`, and which extensions count is PATHEXT's answer rather than node's.
 * Resolving also turns the failure from a status nobody reads into a message: a spawn of a name
 * that is not there reports ENOENT with no hint of which of the six it was or why Arena wanted
 * it, so each caller states the reason here and gets it back in the error. It is for a binary
 * the HOST supplies -- git, node -- and never for one this tree installs, which is `node-bin.ts`
 * and a different question. Both the platform and the path module are parameters, so the win32
 * half is asserted from anywhere. */

import { existsSync } from 'node:fs';
import nodePath from 'node:path';
import { platform, type Platform } from './platform.ts';
import type { PathModule } from '../../utils/posix-path.ts';

export const WINDOWS_DEFAULT_PATHEXT = '.COM;.EXE;.BAT;.CMD';

type Env = Record<string, string | undefined>;

type Where = { env?: Env; on?: Platform; exists?: (path: string) => boolean; path?: PathModule };

export function candidateNames(name: string, env: Env = process.env, on: Platform = platform) {
  if (on !== 'win32') return [name];
  if (/\.[^.\\/]+$/.test(name)) return [name];
  const listed = (env.PATHEXT ?? WINDOWS_DEFAULT_PATHEXT).split(';').filter(Boolean);
  return listed.map((ext) => `${name}${ext.toLowerCase()}`);
}

export function hostBinary(name: string, why: string, where: Where = {}): string {
  const { env = process.env, on = platform, exists = existsSync, path = nodePath } = where;
  const dirs = (env.PATH ?? '').split(on === 'win32' ? ';' : ':').filter(Boolean);

  for (const dir of dirs) {
    for (const candidate of candidateNames(name, env, on)) {
      const full = path.join(dir, candidate);
      if (exists(full)) return full;
    }
  }
  throw new Error(
    `${name} is not on PATH, and Arena needs it ${why}. Install it, or put it on PATH. `
    + `Looked through ${dirs.length} PATH entr${dirs.length === 1 ? 'y' : 'ies'} for `
    + `${candidateNames(name, env, on).join(', ')}.`,
  );
}
