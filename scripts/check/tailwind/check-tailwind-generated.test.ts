import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { BANNER, COMPILE, generatedPath, drift } from './check-tailwind-generated.ts';
import { buildTailwind } from '../../build/tailwind/build-tailwind.ts';
import { linkDir } from '../../lib/arena/platform.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { budgetFor } from '../../lib/arena/deadline.ts';

const BUDGET_MS = budgetFor(COMPILE);

test('the committed stylesheet carries the generated banner', () => {
  const css = readFileSync(generatedPath(), 'utf8');
  assert.ok(css.startsWith(BANNER), 'Utilities.generated.css must start with the GENERATED banner');
});

test('the committed stylesheet is what the source compiles to',
  { timeout: BUDGET_MS }, () => {
  assert.equal(drift(), null);
});

test('drift() reports a root with no committed sheet', () => {
  const fake = join(repoRoot, 'no', 'such', 'root');
  assert.notEqual(drift({ root: fake }), null);
});

test('drift() reports the committed sheet when its text differs from a fresh compile',
  { timeout: BUDGET_MS * 2 }, () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-drift-'));
  try {
    const link = (from: string, to: string) => (statSync(from).isDirectory() ? linkDir(from, to) : symlinkSync(from, to));
    link(join(repoRoot, 'node_modules'), join(root, 'node_modules'));
    for (const entry of readdirSync(repoRoot)) {
      if (entry === 'node_modules' || entry === 'frameworks') continue;
      link(join(repoRoot, entry), join(root, entry));
    }
    mkdirSync(join(root, 'frameworks', 'tailwind'), { recursive: true });
    for (const entry of readdirSync(join(repoRoot, 'frameworks'))) {
      if (entry !== 'tailwind') link(join(repoRoot, 'frameworks', entry), join(root, 'frameworks', entry));
    }
    for (const entry of readdirSync(join(repoRoot, 'frameworks/tailwind'))) {
      if (entry !== 'Utilities.generated.css') link(join(repoRoot, 'frameworks/tailwind', entry), join(root, 'frameworks/tailwind', entry));
    }
    const sheet = generatedPath({ root });
    const rel = relPosix(repoRoot, sheet);
    writeFileSync(sheet, `${BANNER}.stale { color: red; }\n`);
    assert.ok(existsSync(sheet), 'the stale sheet exists, so the differs branch is the one reached');
    assert.equal(drift({ root }), rel, 'a sheet that is not the fresh compile is the drift');
    writeFileSync(sheet, buildTailwind({ root }));
    assert.notEqual(drift({ root }), rel, 'equal text passes the sheet comparison');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the stylesheet a specimen loads carries real rules, not just the banner', () => {
  const css = readFileSync(generatedPath(), 'utf8');
  assert.ok(css.includes('.inline-flex'), 'a static utility must be present');
  assert.ok(css.includes('--color-primary'), 'the theme layer must be present');
});
