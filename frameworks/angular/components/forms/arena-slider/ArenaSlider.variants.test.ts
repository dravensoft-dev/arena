/* No DOM and no TestBed: the recipe alone. The orientation and range members each write their group,
 * and the root says which way the slider runs, so a sheet can lay a vertical one out. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaSliderStyles } from './ArenaSlider.variants';

test('the default is a single, enabled slider lying across', () => {
  assert.deepEqual(arenaSliderStyles().$data.root(), arenaSliderStyles({ orientation: 'horizontal', range: false, disabled: false }).$data.root());
});

test('a vertical slider says so on the root and on every part that moves', () => {
  const vertical = arenaSliderStyles({ orientation: 'vertical' }).$data;
  for (const slot of ['root', 'track', 'rail', 'fill', 'thumb'] as const)
    assert.equal(vertical[slot]()['data-arena-orientation'], 'vertical', slot);
});

test('a range is a group on the fill alone, which then spans the two thumbs', () => {
  assert.equal(arenaSliderStyles({ range: true }).$data.fill()['data-arena-range'], '');
  assert.equal(arenaSliderStyles({ range: true }).$data.thumb()['data-arena-range'], undefined);
});
