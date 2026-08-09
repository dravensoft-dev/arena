/* The JavaScript entry of a dependency's command, read from its own package.json rather than
 * taken from node_modules/.bin. That directory holds an extensionless shell script on POSIX and
 * a .CMD plus a .ps1 on Windows, and nothing named plainly at all, so spawning the shim by its
 * bare path is a file-not-found there. The manifest names the real module, and running it as
 * `process.execPath <entry>` needs no shim on any platform. `typecheck.ts` already resolved tsc
 * this way and is the shape this generalises; ng-packagr spawned the shim DIRECTLY, with no
 * runtime in front of it, which is the same defect twice over. A package with several commands
 * has to be asked for one by name, because guessing which of them was meant is how a build
 * silently runs the wrong tool. */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from './repo-root.ts';

export function nodeBin(pkg: string, command?: string, root = repoRoot): string {
  const home = join(root, 'node_modules', ...pkg.split('/'));
  const manifest = join(home, 'package.json');
  if (!existsSync(manifest)) {
    throw new Error(`${pkg} is not installed at ${home}; run \`bun install\``);
  }

  const bin = readJson(manifest).bin;
  const entries: [string, string][] = typeof bin === 'string'
    ? [[pkg, bin]]
    : Object.entries(bin ?? {});

  if (entries.length === 0) throw new Error(`${pkg} declares no bin, so it has no command to run`);

  const picked = command === undefined
    ? entries.length === 1 ? entries[0] : undefined
    : entries.find(([name]) => name === command);

  if (!picked) {
    throw new Error(
      `${pkg} declares ${entries.map(([name]) => name).join(', ')}, so it must be asked for one `
      + `by name rather than guessed at${command === undefined ? '' : `; there is no ${command}`}`);
  }

  const entry = join(home, picked[1]);
  if (!existsSync(entry)) {
    throw new Error(`${pkg} names ${picked[0]} at ${picked[1]}, and nothing is there`);
  }
  return entry;
}
