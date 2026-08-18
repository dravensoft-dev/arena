import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_CAT_SLOTS, ARENA_CHART_HEIGHT, ARENA_PAD, ARENA_SR_ONLY,
  arenaCatColor, arenaCatSlotFor, arenaCatSurface, arenaAreaFill, arenaToneColor,
} from './DataVisuals';
import type { ArenaSeriesTone, ArenaTone } from './Api.generated';

test('arenaCatColor reads the ramp token for an in-range slot', () => {
  for (let n = 1; n <= ARENA_CAT_SLOTS; n++) assert.equal(arenaCatColor(n), `var(--color-cat-${n})`);
});

test('arenaCatColor NEVER cycles past the ramp -- a 9th series clamps, it does not wrap', () => {

  for (const over of [ARENA_CAT_SLOTS + 1, 9, 12, 100, 1e6])
    assert.equal(arenaCatColor(over), `var(--color-cat-${ARENA_CAT_SLOTS})`, `slot ${over}`);
  assert.notEqual(arenaCatColor(ARENA_CAT_SLOTS + 1), arenaCatColor(1));
});

test('arenaCatColor clamps at the low end, including the falsy slots', () => {

  for (const under of [1, 0, -3, Number.NaN]) assert.equal(arenaCatColor(under), 'var(--color-cat-1)');
});

test('arenaCatColor rounds a fractional slot rather than truncating it', () => {
  assert.equal(arenaCatColor(2.4), 'var(--color-cat-2)');
  assert.equal(arenaCatColor(2.5), 'var(--color-cat-3)');
  assert.equal(arenaCatColor(2.6), 'var(--color-cat-3)');
});

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
  assert.match(surface.fill, /^color-mix\(in oklab, var\(--color-cat-3\) 12%, var\(--fill-surface\)\)$/,
    'the ground is the surface ROLE, so a chip lands on whatever the style plugin calls a surface');
  assert.match(surface.border, /^color-mix\(in oklab, var\(--color-cat-3\) 26%, transparent\)$/);
});

test('arenaAreaFill is the tint ArenaLineChart draws under its series', () => {
  assert.equal(arenaAreaFill('var(--success)'), 'color-mix(in oklab, var(--success) 18%, transparent)');
});

test('the layout constants carry the values the chart family shares', () => {
  assert.equal(ARENA_CAT_SLOTS, 8);
  assert.equal(ARENA_CHART_HEIGHT, 280);
  assert.deepEqual({ ...ARENA_PAD }, { t: 8, r: 8, b: 28, l: 44 });
});

test('ARENA_SR_ONLY hides the element without removing it from the accessibility tree', () => {

  assert.equal(ARENA_SR_ONLY.position, 'absolute');
  assert.equal(ARENA_SR_ONLY.clip, 'rect(0 0 0 0)');
  assert.equal(ARENA_SR_ONLY.overflow, 'hidden');
  assert.ok(!('display' in ARENA_SR_ONLY), 'display:none would drop it from the accessibility tree');
});

test('every ARENA_SR_ONLY value carries its unit, because Angular appends none', () => {

  for (const [key, value] of Object.entries(ARENA_SR_ONLY)) {
    assert.equal(typeof value, 'string', `${key} must be a string`);

    if (/^-?\d/.test(value)) assert.match(value, /^(0|-?\d+px)$/, `${key} must carry a unit or be 0`);
  }
});

test('ARENA_SR_ONLY cancels its own footprint so the hidden table shifts no sibling', () => {
  assert.equal(ARENA_SR_ONLY.margin, `-${ARENA_SR_ONLY.width}`);
  assert.equal(ARENA_SR_ONLY.width, ARENA_SR_ONLY.height);
});
