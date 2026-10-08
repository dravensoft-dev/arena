/* arenaSwatchHue names the hue a legend swatch wears. An unknown tone resolves to colorId '1',
 * which is what the plot paints for it, so the swatch and the series agree. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaSwatchHue } from './ChartSeries.ts';

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
