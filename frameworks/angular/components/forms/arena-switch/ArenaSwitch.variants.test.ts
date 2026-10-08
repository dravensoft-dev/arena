/* No DOM and no TestBed: assertions about the recipe alone. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaSwitchStyles } from './ArenaSwitch.variants';

test('the default is a switch that is off and enabled', () => {
  assert.equal(
    JSON.stringify(arenaSwitchStyles().$data.track()),
    JSON.stringify(arenaSwitchStyles({
      state: false, disabled: false,
    }).$data.track()),
  );
});

