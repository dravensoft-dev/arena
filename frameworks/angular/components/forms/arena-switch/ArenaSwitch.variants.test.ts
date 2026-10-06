/* No DOM and no TestBed: assertions about the recipe alone, plus the two key builders beside it.
 * `footprint` and `thumb` exist because the track's box depends on BOTH orientation and size, and
 * the knob's travel on BOTH state and orientation -- genuine compound variants, flattened into
 * enumerated ones because ManifestClasses.js (the Tailwind specimen harness) supports no
 * compoundVariants. The component computes the crossed key; these tests pin how. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaFootprintFor, arenaThumbFor } from './ArenaSwitch';
import { arenaSwitchStyles } from './ArenaSwitch.variants';

const SIZES = ['sm', 'md', 'lg', 'xl', '2xl'] as const;

test('the default is a horizontal md switch that is off and enabled', () => {
  assert.equal(
    arenaSwitchStyles().track(),
    arenaSwitchStyles({
      size: 'md', orientation: 'horizontal', state: false, disabled: false,
      footprint: 'horizontal-md', thumb: 'off-horizontal',
    }).track(),
  );
});

