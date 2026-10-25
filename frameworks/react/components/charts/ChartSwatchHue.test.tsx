/* arenaSwatchHue names the hue a legend swatch wears. An unknown tone resolves to colorId '1',
 * which is what the plot paints for it, so the swatch and the series agree. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_CAT_SLOTS } from '../../DataVisuals.ts';
import { arenaSeriesColors, arenaSwatchHue } from './ChartSeries.ts';

test('a known tone is the swatch hue', () => {
  assert.deepEqual(arenaSwatchHue({ tone: 'success' }, 0, 3), { tone: 'success' });
});

test('an unknown tone resolves to colorId 1, as the plot paints it', () => {
  assert.deepEqual(arenaSwatchHue({ tone: 'bogus' as never }, 0, 3), { colorId: '1' });
});

test('identity falls to the series colour, the index of colorIds, then the fallback slot', () => {
  assert.deepEqual(arenaSwatchHue({ colorId: 4 }, 0, 3), { colorId: '4' });
  assert.deepEqual(arenaSwatchHue({ colorIds: [2, 5] }, 1, 3), { colorId: '5' });
  assert.deepEqual(arenaSwatchHue({}, 0, 3), { colorId: '3' });
});

test('`colorIds` shorter than `count` falls back to the rotated position, which wraps after the last slot', () => {
  const colours = arenaSeriesColors({ label: 'One', values: [], colorIds: [] }, 12, 1, 'ArenaLineChart', 1);
  assert.equal(colours[8], 'var(--color-cat-1)');
  assert.equal(colours[11], 'var(--color-cat-4)');
});

test('the colorIds fallback counts from `start`', () => {
  assert.deepEqual(arenaSeriesColors({ label: 'One', values: [], colorIds: [5] }, 3, 1, 'ArenaLineChart', 6),
    ['var(--color-cat-5)', 'var(--color-cat-7)', 'var(--color-cat-8)']);
});

test('an explicit colorId ignores `start` and still clamps', () => {
  assert.deepEqual(arenaSeriesColors({ label: 'One', values: [], colorId: 9 }, 1, 1, 'ArenaLineChart', 3),
    [`var(--color-cat-${ARENA_CAT_SLOTS})`]);
});

test('the swatch counts the colorIds fallback from `start`', () => {
  assert.deepEqual(arenaSwatchHue({ colorIds: [] }, 2, 1, 6), { colorId: '8' });
});
