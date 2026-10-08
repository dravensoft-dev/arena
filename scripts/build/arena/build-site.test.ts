import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { retargetPages } from './build-site.ts';
import { repositoryBase } from '../../lib/arena/package-assembly.ts';

test('a published Markdown page points what the output lacks at the release tag and keeps the rest', () => {
  const out = mkdtempSync(join(tmpdir(), 'arena-site-'));
  mkdirSync(join(out, 'intro'), { recursive: true });
  mkdirSync(join(out, 'frameworks'), { recursive: true });
  writeFileSync(join(out, 'frameworks', 'INDEX.md'), '# index\n');
  const page = join(out, 'intro', 'AGENTS.md');
  writeFileSync(page, '[a](../AGENTS.md) [b](../frameworks/INDEX.md) [c](../frameworks/GONE.md#x) [d](../nowhere/MISSING.md)\n');
  retargetPages(out, [page, join(out, 'frameworks', 'INDEX.md')]);
  const tag = repositoryBase();
  assert.equal(
    readFileSync(page, 'utf8'),
    `[a](${tag}/AGENTS.md) [b](../frameworks/INDEX.md) [c](../frameworks/GONE.md#x) [d](../nowhere/MISSING.md)\n`,
  );
  rmSync(out, { recursive: true });
});
