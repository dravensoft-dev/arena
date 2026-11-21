/* A suite's temporary directories: `tree` lays a file map out under a fresh root and answers
 * the root, `clean` removes every root made. The cleanup is registered here, on the suite that
 * imports this, so a caller never writes the `after` of its own. */

import { after } from 'node:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export function scratchTree(prefix: string): { tree(files: Record<string, string>): string; clean(): void } {
  const made: string[] = [];
  const clean = () => {
    for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
  };
  after(clean);
  return {
    tree(files) {
      const base = mkdtempSync(join(tmpdir(), `${prefix}-`));
      made.push(base);
      for (const [rel, body] of Object.entries(files)) {
        const path = join(base, rel);
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, body);
      }
      return base;
    },
    clean,
  };
}
