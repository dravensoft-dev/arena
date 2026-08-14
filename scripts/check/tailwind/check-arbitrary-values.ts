/* A compiled copy is not a second source. dist/ and vendor/ are skipped by name, as three
 * neighbouring gates already skip them, and the Angular emit is skipped by its ANCHORED
 * path rather than by the name build, on layers.ts's own reasoning. Until the CLI shipped
 * as TypeScript nothing under dist/ matched, so this walk read 414 generated copies and
 * nobody noticed; what it holds is the hand-written tree. The rule itself is not stated here:
 * it lives in the shipped audit module, which decides the same question over a consumer's tree,
 * and this gate is a caller so that the two can never drift apart. What stays is the walk, which
 * is repo-shaped and ships nowhere. */

import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { emittedTree } from '../../lib/arena/layers.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { scanFile } from '../../generate/core/arena-to-prod/audit.ts';

export { isLegalBracket, scanText, findMarkers, markerAllowlist, scanFile } from '../../generate/core/arena-to-prod/audit.ts';

export const SKIPPED_NAMES = new Set(['node_modules', 'dist', 'vendor']);

const EXTENSIONS = ['.json', '.ts', '.tsx', '.jsx', '.html', '.md'];

export const node = {
  name: 'check:arbitrary',
  reads: [
    ...EXTENSIONS.map((ext) => `frameworks/**/*${ext}`),
    '!frameworks/**/*.manifest.generated.ts',
  ],
  writes: [],
  feeds: [],
};
export function walk(dir: string, emitted = emittedTree()): string[] {
  return walkFiles(dir, { skip: (name, p) => SKIPPED_NAMES.has(name) || p === emitted })
    .filter((p) => !p.endsWith('.manifest.generated.ts') && EXTENSIONS.some((e) => p.endsWith(e)));
}

function main() {
  const root = join(repoRoot, 'frameworks');
  const errs = [];
  let scanned = 0;
  for (const file of walk(root)) {
    scanned++;
    errs.push(...scanFile(relPosix(repoRoot, file), readFileSync(file, 'utf8')));
  }
  if (errs.length) {
    console.error(`check-arbitrary-values: ${errs.length} problem(s) under frameworks/\n`);
    for (const e of errs) console.error(`  ${e}`);
    console.error('\nExpose the token in frameworks/tailwind/Theme.css and use the utility, or reference the token as var(--name). In .md, exempt a genuine counterexample with a check-arbitrary-values marker naming it.');
    process.exit(1);
  }
  console.log(`check-arbitrary-values: ${scanned} file(s) scanned, none`);
}

if (isMainModule(import.meta.url)) main();
