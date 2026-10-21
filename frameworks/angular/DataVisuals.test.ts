import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_CAT_SLOTS, ARENA_CHART_HEIGHT, ARENA_INK_BODY, ARENA_INK_MUTED, ARENA_PAD, ARENA_SR_ONLY,
  arenaCatColor, arenaCatRotate, arenaCatSlotFor, arenaCatSurface, arenaAreaFill, arenaToneColor,
  arenaPercentWriter, arenaValueWriter, ARENA_HEAT_STEPS, arenaHeatFill,
} from './DataVisuals';
import { forgetArenaWarnings } from './WarnOnce';
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
  assert.equal(ARENA_SR_ONLY.clipPath, 'inset(50%)');
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

test('the neutral tone is the body ink constant, and the muted ink is the body ink at its muted role and level', () => {
  assert.equal(arenaToneColor('neutral'), ARENA_INK_BODY);
  assert.equal(ARENA_INK_BODY, 'color-mix(in oklab,var(--ink-body) var(--level-ink-body),transparent)');
  assert.equal(ARENA_INK_MUTED, 'color-mix(in oklab,var(--ink-muted) var(--level-ink-muted),transparent)');
});

function warnings(body: () => void): string[] {
  const captured: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => { captured.push(args.map(String).join(' ')); };
  try { body(); } finally { console.warn = original; }
  return captured;
}

test('the raw percent writer keeps one digit and never rounds a ratio to a whole percent', () => {
  const write = arenaPercentWriter();
  assert.equal(write(0.624), '62.4%');
  assert.equal(write(1), '100%');
  assert.equal(write(1.5), '150%', 'a ratio above one is written as it is');
  assert.equal(write(0), '0%');
  assert.equal(write(-0.05), '-5%');
});

test('a formatted percent writer keeps one fraction digit whatever the number format asks', () => {
  const write = arenaPercentWriter({ locale: 'en-US', fractionDigits: 0 });
  assert.equal(write(0.624), '62.4%', 'the count\'s fraction digits never reach the conversion');
  assert.equal(write(0.5), '50%');
  assert.equal(arenaPercentWriter({ locale: 'en-US', fractionDigits: 3, compact: true, grouping: false })(0.6249), '62.5%');
  assert.match(arenaPercentWriter({ locale: 'de-DE' })(0.624), /^62,4\s%$/, 'the locale decides the separator');
});

test('an invalid locale warns once with the value writer\'s message and writes the raw percent', () => {
  forgetArenaWarnings();
  const seen = warnings(() => {
    const percent = arenaPercentWriter({ locale: 'not a locale' });
    assert.equal(percent(0.624), '62.4%');
    arenaPercentWriter({ locale: 'not a locale' });
    arenaValueWriter({ format: { locale: 'not a locale' } });
  });
  assert.equal(seen.length, 1, 'the two writers share one message, so it prints once');
  assert.match(seen[0] as string, /number format: the locale "not a locale" is not a tag Intl accepts/);
});

test('the heat ladder has five steps and each step fills with its own role', () => {
  assert.equal(ARENA_HEAT_STEPS, 5);
  const fills = Array.from({ length: ARENA_HEAT_STEPS }, (_, index) => arenaHeatFill(index + 1));
  assert.deepEqual(fills, ['var(--heat-step-1)', 'var(--heat-step-2)', 'var(--heat-step-3)', 'var(--heat-step-4)', 'var(--heat-step-5)']);
  assert.equal(new Set(fills).size, ARENA_HEAT_STEPS, 'no two steps share a fill');
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
