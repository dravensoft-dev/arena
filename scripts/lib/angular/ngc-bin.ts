/* The path of ngc's entry script under node_modules, refused with the install command when
 * @angular/compiler-cli is missing, so every step that compiles the Angular layer spawns the
 * same binary. */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../arena/repo-root.ts';

export function ngcBin(root = repoRoot) {
  const bin = join(root, 'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js');
  if (!existsSync(bin))
    throw new Error(`@angular/compiler-cli is not installed at ${bin}; run \`bun install\` before compiling the Angular layer`);
  return bin;
}
