/* No DOM and no TestBed: the recipe alone. `state` is derived from error, validate and valid, and
 * the steppers member decides whether the field pads its own ends, so what this file pins is what
 * each arm writes onto the field. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaNumberFieldStyles } from './ArenaNumberField.variants';

test('the default is a neutral, enabled, editable field with steppers', () => {
  assert.equal(
    JSON.stringify(arenaNumberFieldStyles().$data.field()),
    JSON.stringify(arenaNumberFieldStyles({ state: 'neutral', steppers: true, disabled: false, readOnly: false }).$data.field()),
  );
});

test('a field without steppers says so on the field, which then pads its own ends', () => {
  assert.equal(arenaNumberFieldStyles({ steppers: false }).$data.field()['data-arena-steppers'], undefined);
  assert.equal(arenaNumberFieldStyles({ steppers: true }).$data.field()['data-arena-steppers'], '');
});

test('readOnly is a group on the field and the input, and the state reaches the status icon', () => {
  assert.equal(arenaNumberFieldStyles({ readOnly: true }).$data.input()['data-arena-read-only'], '');
  assert.equal(arenaNumberFieldStyles({ state: 'error' }).$data.statusIcon()['data-arena-state'], 'error');
});
