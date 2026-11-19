/* No DOM and no TestBed: the recipe alone. state comes from error and valid, so what this file pins
 * is what each arm writes onto the cells and the status icon. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaPinInputStyles } from './ArenaPinInput.variants';

test('the default is a neutral, enabled pin input', () => {
  assert.equal(
    JSON.stringify(arenaPinInputStyles().$data.cell()),
    JSON.stringify(arenaPinInputStyles({ state: 'neutral', disabled: false }).$data.cell()),
  );
});

test('the state reaches every cell and the status icon, and disabled marks the label, the hint, the error and the status icon, which fade on their own', () => {
  assert.equal(arenaPinInputStyles({ state: 'error' }).$data.cell()['data-arena-state'], 'error');
  assert.equal(arenaPinInputStyles({ state: 'valid' }).$data.statusIcon()['data-arena-state'], 'valid');
  for (const slot of ['label', 'hint', 'error', 'statusIcon'] as const) assert.equal(arenaPinInputStyles({ disabled: true }).$data[slot]()['data-arena-disabled'], '', slot);
  assert.equal(JSON.stringify(arenaPinInputStyles({ disabled: true }).$data.root()), JSON.stringify({}), 'the root carries no fade');
});
