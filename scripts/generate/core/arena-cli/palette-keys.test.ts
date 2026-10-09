import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PALETTE_KEYS, OPTIONAL_KEYS, ARENA_CAT_SLOTS, FILL_PAIRS, FONT_ROLES, catKeys, requiredKeys } from './palette-keys.ts';
import { repoRoot as root } from '../../../lib/arena/repo-root.ts';

const skin = (theme: string) => JSON.parse(readFileSync(join(root, `contracts/design/palette.${theme}.json`), 'utf8'));
const keysOf = (json: { color: Record<string, unknown> }) => Object.keys(json.color).filter((k) => !k.startsWith('$'));

test('the key list is exactly the Dravensoft skin, in order', () => {
  assert.deepEqual(PALETTE_KEYS, keysOf(skin('dark')));
});

test('both themes declare the same keys, which is what makes one list right for every palette', () => {
  assert.deepEqual(keysOf(skin('light')), keysOf(skin('dark')));
});

test('the ramp is the catSlots the API contract pins, and every slot is required', () => {
  assert.equal(catKeys().length, ARENA_CAT_SLOTS);
  assert.deepEqual(catKeys().filter((k) => OPTIONAL_KEYS.has(k)), []);
});

test('the two fills are the optional keys, because each is derived when absent', () => {
  assert.deepEqual([...OPTIONAL_KEYS].sort(), ['error-fill', 'primary-fill']);
  assert.equal(requiredKeys().length, PALETTE_KEYS.length - 2);
});

test('primary-content is measured on the primary fill, which is where it sits', () => {
  assert.ok(FILL_PAIRS.some((one) => one.fill === 'primary-fill' && one.content === 'primary-content'),
    'every surface carrying primary-content is filled with primary-fill');
  assert.ok(!FILL_PAIRS.some((one) => one.fill === 'primary'),
    'primary is the accent read as ink and as a line, and nothing sets primary-content on it');
});

test('the font roles are the three --font-* tokens typography.json declares', () => {
  const typography = JSON.parse(readFileSync(join(root, 'contracts/design/typography.json'), 'utf8'));
  const declared = Object.keys(typography.font).filter((k) => !k.startsWith('$'));
  assert.deepEqual(Object.keys(FONT_ROLES).sort(), declared.sort());
});

test('each role carries the generic fallback its own token ends with', () => {
  const typography = JSON.parse(readFileSync(join(root, 'contracts/design/typography.json'), 'utf8'));
  for (const [role, fallback] of Object.entries(FONT_ROLES)) {
    assert.deepEqual(fallback, typography.font[role].$value.slice(1), `${role} falls back to what its token declares`);
  }
});

test('the vendored validator has not drifted from the one the gates read', () => {
  const vendored = readFileSync(join(root, 'scripts/generate/core/arena-cli/validate-palette.mjs'), 'utf8');
  const original = readFileSync(join(root, 'scripts/lib/core/validate-palette.mjs'), 'utf8');
  assert.equal(vendored, original,
    'the copy ships inside both packages and its header says to re-vendor rather than patch, '
    + 'so a change to either file is a change to both');
});
