/* The number field binds spinbutton to its text field, which carries the role explicitly because
 * only a text field can show a grouped, localized number. Every key the pattern requires is acted
 * on and its result read back, both polarities of a conditional state are rendered, and the
 * steppers are proved to stay out of the Tab sequence, which is Arena's choice. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React, { useState } from 'react';
import { mount, cleanup, act } from '../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../test/AssertPattern.tsx';
import { ArenaNumberField, type ArenaNumberFieldProps } from './arena-number-field/ArenaNumberField.tsx';

afterEach(cleanup);

const BINDING = join(REACT_COMPONENTS, 'forms/arena-number-field/ArenaNumberField.behaviour.json');

function render(props: Partial<ArenaNumberFieldProps> = {}) {
  const changes: number[] = [];
  function Host() {
    const [value, write] = useState<number | undefined>(props.value);
    return <ArenaNumberField label="Replicas" {...props} value={value} onChange={(next) => { changes.push(next); write(next); }} />;
  }
  const root = mount(<Host />);
  const input = root.querySelector<HTMLInputElement>('input[data-arena-part="number-field.input"]')!;
  const press = (key: string) => act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); });
  return { root, input, changes, press };
}

const valueOf = (input: HTMLInputElement) => input.getAttribute('aria-valuenow');

test('Up and Down move the value by one step and announce it', () => {
  const { input, press } = render({ value: 3, step: 2 });
  press('ArrowUp');
  assert.equal(valueOf(input), '5');
  press('ArrowDown');
  press('ArrowDown');
  assert.equal(valueOf(input), '1');
});

test('Home and End reach the bounds the field has', () => {
  const { input, press } = render({ value: 3, min: 1, max: 9 });
  press('End');
  assert.equal(valueOf(input), '9');
  press('Home');
  assert.equal(valueOf(input), '1');
});

test('the value states follow the field: present with a value or a bound, absent without', () => {
  const full = render({ value: 3, min: 1, max: 9, suffix: 'kg' }).input;
  assert.deepEqual(['aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'aria-valuetext'].map((a) => full.getAttribute(a)), ['3', '1', '9', '3kg']);
  cleanup();
  const empty = render().input;
  assert.deepEqual(['aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'aria-valuetext'].map((a) => empty.getAttribute(a)), [null, null, null, null]);
});

test('the steppers stay out of the Tab sequence, so the field is the one stop', () => {
  const { root } = render({ value: 3 });
  const stops = [...root.querySelectorAll('button, input:not([type="hidden"])')].filter((el) => el.getAttribute('tabindex') !== '-1');
  assert.deepEqual(stops.map((el) => el.getAttribute('data-arena-part')), ['number-field.input']);
});

test('ArenaNumberField meets the spinbutton pattern on its text field', () => {
  const { root, input, press } = render({ value: 3, min: 1, max: 9, prefix: '$' });
  press('ArrowUp');
  const up = valueOf(input) === '4';
  press('ArrowDown');
  const down = valueOf(input) === '3';
  press('Home');
  const home = valueOf(input) === '1';
  press('End');
  const end = valueOf(input) === '9';
  assertPattern({
    root,
    bindingPath: BINDING,
    subjects: { default: input },
    behavioural: {
      'keyboard.ArrowUp': up,
      'keyboard.ArrowDown': down,
      'keyboard.Home': home,
      'keyboard.End': end,
      'states.valuenow': valueOf(input) === '9',
      'states.valuemin': input.getAttribute('aria-valuemin') === '1',
      'states.valuemax': input.getAttribute('aria-valuemax') === '9',
      'states.valuetext': input.getAttribute('aria-valuetext') === '$9',
    },
  });
});
