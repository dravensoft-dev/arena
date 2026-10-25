import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_CAT_SLOTS, ARENA_INK_BODY, ARENA_INK_MUTED, arenaCatColor, arenaCatRotate, arenaCatSlotFor, arenaCatSurface, arenaAreaFill, arenaToneColor, arenaRailStyle,
} from './DataVisuals.ts';
import type { ArenaSeriesTone, ArenaTone } from './Api.generated';

test('every tone in the union resolves to a var() or a colour-mix of roles and levels, never a literal colour', () => {
  const tones: ArenaTone[] = ['neutral', 'success', 'warning', 'danger', 'info'];
  for (const tone of tones) assert.match(arenaToneColor(tone), /^(var\(--[a-z-]+\)|color-mix\(in oklab,var\(--[a-z-]+\) var\(--[a-z-]+\),transparent\))$/);
  assert.equal(new Set(tones.map(arenaToneColor)).size, tones.length, 'tones must not share a colour');
});

test('every ArenaSeriesTone is an ArenaTone, so a chart keeps reaching the same colour it always did', () => {
  const series: ArenaSeriesTone[] = ['success', 'warning', 'danger', 'info'];
  for (const tone of series) assert.equal(arenaToneColor(tone), arenaToneColor(tone as ArenaTone));
});

test('arenaCatSlotFor lands inside the ramp for every key, including an empty one', () => {
  for (const key of ['', 'a', 'arena', 'SKU-1042', 'ñ', '日本', 'x'.repeat(500)]) {
    const slot = arenaCatSlotFor(key);
    assert.ok(Number.isInteger(slot) && slot >= 1 && slot <= ARENA_CAT_SLOTS, `arenaCatSlotFor(${key}) = ${slot}`);
  }
});

test('arenaCatSlotFor gives the same key the same slot every time', () => {
  assert.equal(arenaCatSlotFor('SKU-1042'), arenaCatSlotFor('SKU-1042'));
});

test('arenaCatSlotFor spreads over the ramp by these pinned vectors', () => {
  assert.deepEqual(
    ['a', 'arena', 'SKU-1042', 'SKU-1043', 'cliente-7'].map(arenaCatSlotFor),
    [2, 8, 6, 7, 5],
    'the numbers are pinned rather than derived because the point of the function is that one key '
    + 'always draws the same colour: a ninth slot in the --color-cat-* ramp moves every one of them, '
    + 'and re-deriving them here would assert nothing at all',
  );
});

test('arenaCatSurface tints from the slot colour, and the edge is the stronger of the two', () => {
  const surface = arenaCatSurface(3);
  assert.equal(surface.fill, `color-mix(in oklab, ${arenaCatColor(3)} 12%, var(--fill-surface))`,
    'the ground is the surface ROLE, so a chip lands on whatever the style plugin calls a surface');
  assert.equal(surface.border, `color-mix(in oklab, ${arenaCatColor(3)} 26%, transparent)`);
});

test('arenaAreaFill is the tint ArenaLineChart draws under its series', () => {
  assert.equal(arenaAreaFill('var(--success)'), 'color-mix(in oklab, var(--success) 18%, transparent)');
});

test('the neutral tone is the body ink constant, and the muted ink is the body ink at its muted role and level', () => {
  assert.equal(arenaToneColor('neutral'), ARENA_INK_BODY);
  assert.equal(ARENA_INK_BODY, 'color-mix(in oklab,var(--ink-body) var(--level-ink-body),transparent)');
  assert.equal(ARENA_INK_MUTED, 'color-mix(in oklab,var(--ink-muted) var(--level-ink-muted),transparent)');
});

test('arenaCatRotate counts from the start slot and wraps after the last', () => {
  assert.deepEqual([0, 1, 2, 3].map((p) => arenaCatRotate(6, p)), [6, 7, 8, 1]);
  assert.equal(arenaCatRotate(1, ARENA_CAT_SLOTS), 1);
  assert.equal(arenaCatRotate(1, 8 + 2), 3);
});

test('arenaCatRotate clamps the start before counting', () => {
  assert.equal(arenaCatRotate(0, 0), 1);
  assert.equal(arenaCatRotate(99, 0), ARENA_CAT_SLOTS);
  assert.equal(arenaCatRotate(99, 1), 1);
});

test('arenaRailStyle clips on both axes while the rail scrolls and lets the end label overhang while it does not, with the same keys', () => {
  const keys = { display: 'block', outlineOffset: 'var(--focus-offset)' };
  assert.deepEqual(arenaRailStyle(true), { overflowX: 'auto', overflowY: 'hidden', ...keys });
  assert.deepEqual(arenaRailStyle(false), { overflowX: 'visible', overflowY: 'visible', ...keys });
});
