/* A test that spawns a compiler, or imports every collected script, is not a five-second
 * operation by nature, and node:test defaults to five. A test that outruns its own deadline is
 * worse than a slow one: the callback is abandoned with its child still running, and the next
 * FILE to call test() reports an error naming neither. This one measured 3770ms here, warm, on a
 * machine with nothing else on it, so a shared runner is a coin toss. The budget is stated. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { BANNER, generatedPath, drift } from './check-tailwind-generated.ts';

const COMPILE_BUDGET_MS = 60_000;

test('the committed stylesheet carries the generated banner', () => {
  const css = readFileSync(generatedPath(), 'utf8');
  assert.ok(css.startsWith(BANNER), 'Utilities.generated.css must start with the GENERATED banner');
});

test('the committed stylesheet is what the source compiles to',
  { timeout: COMPILE_BUDGET_MS }, () => {
  assert.equal(drift(), null);
});

test('drift() reports the file when the committed text differs', () => {
  const fake = join(repoRoot, 'no', 'such', 'root');
  assert.notEqual(drift({ root: fake }), null);
});

test('the stylesheet a specimen loads carries real rules, not just the banner', () => {
  const css = readFileSync(generatedPath(), 'utf8');
  assert.ok(css.includes('.inline-flex'), 'a static utility must be present');
  assert.ok(css.includes('--color-primary'), 'the theme layer must be present');
});
