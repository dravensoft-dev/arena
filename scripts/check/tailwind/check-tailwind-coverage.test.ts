import test from 'node:test';
import assert from 'node:assert/strict';
import { presetTokens, checkCoverage, optionRoles, optionPrefixes, OPTION_ROLE_REASON, pluginOptionRoles } from './check-tailwind-coverage.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

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

const size = { family: 'size', variants: { 'arena-size-sm': '' } };
const fill = { family: 'fill', variants: { 'arena-fill': '', 'arena-fit': '' } };

test('a role of a family option is excluded as an option role, and a near name is still reported', () => {
  const excluded = optionRoles(['size-sm-probe', 'sizes-probe', 'size-lg-probe'], [size]);
  assert.equal(excluded.get('size-sm-probe'), OPTION_ROLE_REASON);
  assert.deepEqual(checkCoverage(new Set(['size-sm-probe']), new Set(), excluded), []);
  assert.match(checkCoverage(new Set(['sizes-probe']), new Set(), excluded).join('\n'), /--sizes-probe reaches no Tailwind utility/);
  assert.match(checkCoverage(new Set(['size-lg-probe']), new Set(), excluded).join('\n'), /--size-lg-probe reaches no Tailwind utility/);
});

test('a role equal to an option name less arena-, or that name and a suffix, is an option role', () => {
  const grid = { family: 'grid', variants: { 'arena-grid-min-sm': '' } };
  const excluded = optionRoles(['grid-min-sm', 'grid-min-sm-probe', 'grid-min', 'grid-min-smx'], [grid]);
  assert.equal(excluded.get('grid-min-sm'), OPTION_ROLE_REASON);
  assert.equal(excluded.get('grid-min-sm-probe'), OPTION_ROLE_REASON);
  assert.equal(excluded.has('grid-min'), false);
  assert.equal(excluded.has('grid-min-smx'), false);
});

test('an option role the plugin no longer carries is a stale exclusion', () => {
  const excluded = optionRoles(['size-sm-probe'], [size]);
  assert.match(checkCoverage(new Set(), new Set(), excluded).join('\n'), /--size-sm-probe is excluded but no such token exists/);
});

test('a kernel role that shares a family name but no option is reported, and no reached carve-out is needed', () => {
  const excluded = optionRoles(['fill-probe', 'fill-surface'], [fill]);
  assert.equal(excluded.size, 0);
  assert.match(checkCoverage(new Set(['fill-probe']), new Set(), excluded).join('\n'), /--fill-probe reaches no Tailwind utility/);
  assert.deepEqual(checkCoverage(new Set(['fill-surface']), new Set(['fill-surface']), excluded), []);
});

test('every role of the real plugin that an option of a family names is excluded as an option role', () => {
  const { roles, excluded, families } = pluginOptionRoles(repoRoot);
  const prefixes = optionPrefixes(families);
  for (const role of roles)
    if ([...prefixes].some((prefix) => role.startsWith(prefix)))
      assert.equal(excluded.get(role), OPTION_ROLE_REASON, `${role} is an option role`);
});
