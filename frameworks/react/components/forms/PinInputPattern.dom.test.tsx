/* The pin input binds textbox flat to its cells, which the suite passes as the subject because no
 * cell is the root's first child. Each cell is a single-line text field named by its position,
 * required natively and invalid with the error. The wrapper's group role and name are Arena's
 * design, not a bound pattern, so this suite asserts them directly. The platform owns Tab, so
 * happy-dom asserts its precondition: exactly one cell is a tab stop in every state. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React from 'react';
import { mount, cleanup } from '../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../test/AssertPattern.tsx';
import { ArenaPinInput, type ArenaPinInputProps } from './arena-pin-input/ArenaPinInput.tsx';

afterEach(cleanup);

const BINDING = join(REACT_COMPONENTS, 'forms/arena-pin-input/ArenaPinInput.behaviour.json');

function render(props: Partial<ArenaPinInputProps> = {}) {
  const root = mount(<ArenaPinInput label="Verification code" onValueChange={() => {}} {...props} />);
  const cells = [...root.querySelectorAll<HTMLInputElement>('[data-arena-part="pin-input.cell"]')];
  return { root, cells };
}

test('the wrapper is a group the label names', () => {
  const { root } = render();
  const group = root.querySelector('[data-arena-part="pin-input.group"]')!;
  assert.equal(group.getAttribute('role'), 'group');
  const label = root.ownerDocument.getElementById(group.getAttribute('aria-labelledby')!);
  assert.equal(label?.textContent, 'Verification code');
});

test('exactly one cell is a tab stop whatever the code holds', () => {
  for (const value of ['', '4', '48291', '482913']) {
    const { cells } = render({ value });
    assert.equal(cells.filter((cell) => cell.tabIndex === 0).length, 1, value);
    cleanup();
  }
});

test('the required state is the native attribute on every cell, never a second claim beside it', () => {
  const { cells } = render({ required: true });
  for (const cell of cells) assert.deepEqual([cell.required, cell.getAttribute('aria-required')], [true, null]);
});

test('ArenaPinInput meets the textbox pattern on every cell', () => {
  const { root, cells } = render({ required: true, error: 'That code does not match.' });
  assertPattern({
    root,
    bindingPath: BINDING,
    subjects: { default: cells },
    behavioural: {
      'states.required': cells.every((cell) => cell.required),
      'states.readonly': cells.every((cell) => !cell.readOnly),
    },
  });
  for (const cell of cells) {
    assert.equal(cell.getAttribute('aria-multiline'), null);
    assert.equal(cell.getAttribute('aria-invalid'), 'true');
  }
});
