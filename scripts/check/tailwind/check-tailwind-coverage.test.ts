import test from 'node:test';
import assert from 'node:assert/strict';
import { presetTokens, checkCoverage } from './check-tailwind-coverage.ts';

test('reads the Arena tokens a preset references', () => {
  const css = `@import 'tailwindcss';\n@theme {\n  --color-*: initial;\n  --color-primary: var(--color-primary);\n  --spacing: var(--sp-1);\n  --text-h1: var(--fs-h1);\n}\n`;
  assert.deepEqual([...presetTokens(css)].sort(), ['color-primary', 'fs-h1', 'sp-1']);
});

test('reads every var() inside a calc', () => {
  const css = `@theme {\n  --spacing-row-x: calc(var(--pad-row-x) * var(--dz-row-scale-x));\n}\n`;
  assert.deepEqual([...presetTokens(css)].sort(), ['dz-row-scale-x', 'pad-row-x']);
});

test('a --default-* wiring does not count as exposing the token', () => {
  const css = `@theme {\n  --ease-out: var(--ease-out);\n  --default-transition-duration: var(--dur-fast);\n}\n`;
  assert.deepEqual([...presetTokens(css)], ['ease-out']);
});

test('a single-line comment above a declaration does not hide it', () => {
  const css = `@theme {\n  /* surfaces + base content */\n  --color-base-100: var(--color-base-100);\n}\n`;
  assert.deepEqual([...presetTokens(css)], ['color-base-100']);
});

test('a multi-line comment above a declaration does not hide it', () => {
  const css = `@theme {\n  /* status (meaning, never series) — the -content half is\n     the other half of the contract a skin defines */\n  --color-info: var(--color-info);\n}\n`;
  assert.deepEqual([...presetTokens(css)], ['color-info']);
});

test('a comment containing a colon or a semicolon does not corrupt the next key', () => {
  const css = `@theme {\n  /* Without it v4 emits an unnamed step as calc(var(--spacing) * N)\n     against its own 0.25rem default; a value that coincides with Arena's\n     grid: only while the root font size is 16px. */\n  --spacing: var(--sp-1);\n}\n`;
  assert.deepEqual([...presetTokens(css)], ['sp-1']);
});

test('passes when every token is exposed or excluded', () => {
  const tokens = new Set(['color-primary', 'sp-1', 'bp-sm']);
  const exposed = new Set(['color-primary', 'sp-1']);
  const excluded = new Map([['bp-sm', 'read by JS, never a media query']]);
  assert.deepEqual(checkCoverage(tokens, exposed, excluded), []);
});

test('fails a token that is neither exposed nor excluded', () => {
  const errs = checkCoverage(new Set(['fs-h1']), new Set(), new Map());
  assert.equal(errs.length, 1);
  assert.match(errs[0] ?? '', /--fs-h1 reaches no Tailwind utility/);
});

test('fails an exclusion for a token that is also exposed', () => {
  const errs = checkCoverage(new Set(['sp-1']), new Set(['sp-1']), new Map([['sp-1', 'stale']]));
  assert.match(errs.join('\n'), /--sp-1 is both exposed and excluded/);
});

test('fails an exclusion naming a token that no longer exists', () => {
  const errs = checkCoverage(new Set(['sp-1']), new Set(['sp-1']), new Map([['sp-99', 'gone']]));
  assert.match(errs.join('\n'), /--sp-99 is excluded but no such token exists/);
});

test('fails a preset that references a token that does not exist', () => {
  const errs = checkCoverage(new Set(['sp-1']), new Set(['sp-1', 'sp-7']), new Map());
  assert.match(errs.join('\n'), /--sp-7.*no such token/);
});
