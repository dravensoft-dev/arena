import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_CAT_SLOTS, arenaCatColor, arenaCatSlotFor, arenaCatSurface, arenaAreaFill, arenaToneColor,
} from './DataVisuals.ts';
import type { ArenaSeriesTone, ArenaTone } from './Api.generated';

test('every tone in the union resolves to a token reference', () => {
  const tones: ArenaTone[] = ['neutral', 'accent', 'gold', 'success', 'warning', 'danger', 'info'];
  for (const tone of tones) assert.match(arenaToneColor(tone), /^var\(--[a-z-]+\)$/);
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
