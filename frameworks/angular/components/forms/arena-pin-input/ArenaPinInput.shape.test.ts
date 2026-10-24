/* What the component draws for a pin input before anyone types: a group named by the label, one
 * real text field per character named by its position, one tab stop, no name on any cell, and the
 * whole code in a single hidden field a form submits. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TAILWIND_COMPONENTS } from '../../../test/Compliance';
import { TestBed } from '@angular/core/testing';
import { ArenaPinInput } from './ArenaPinInput';
import { assertNoNode } from '../../../test/NodeAssert';

type Inputs = Record<string, unknown>;

function render(inputs: Inputs = {}) {
  const fixture = TestBed.createComponent(ArenaPinInput);
  fixture.componentRef.setInput('label', 'Verification code');
  for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const cells = [...root.querySelectorAll<HTMLInputElement>('[data-arena-part="pin-input.cell"]')];
  return { fixture, root, cells };
}

test('six cells in a group the label names, each a text field named by its position', () => {
  const { fixture, root, cells } = render();
  try {
    const group = root.querySelector('[data-arena-part="pin-input.group"]') as HTMLElement;
    assert.equal(group.getAttribute('role'), 'group');
    assert.equal(root.ownerDocument.getElementById(group.getAttribute('aria-labelledby') ?? '')?.textContent?.trim(), 'Verification code');
    assert.equal(cells.length, 6);
    cells.forEach((cell, i) => {
      assert.deepEqual(
        [cell.getAttribute('type'), cell.getAttribute('inputmode'), cell.getAttribute('pattern'), cell.getAttribute('autocomplete'), cell.getAttribute('aria-label')],
        ['text', 'numeric', '[0-9]*', 'one-time-code', `Character ${i + 1} of 6`],
        `cell ${i}`,
      );
      assert.equal(cell.hasAttribute('name'), false, `cell ${i} carries a name`);
      assert.equal(cell.hasAttribute('maxlength'), false, `cell ${i} caps its length, which cuts an autofilled code`);
    });
  } finally { fixture.destroy(); }
});

test('exactly one cell is a tab stop: the first empty one, or the last when the code is full', () => {
  for (const [value, stop] of [['', 0], ['48', 2], ['482913', 5]] as const) {
    const { fixture, cells } = render({ value });
    try {
      assert.deepEqual(cells.flatMap((cell, i) => (cell.getAttribute('tabindex') === '0' ? [i] : [])), [stop], value);
    } finally { fixture.destroy(); }
  }
});

test('the code fills the first cells, and a character the set refuses is dropped', () => {
  const { fixture, cells } = render({ length: 4, value: '4x8' });
  try {
    assert.deepEqual(cells.map((cell) => cell.value), ['4', '8', '', '']);
  } finally { fixture.destroy(); }
});

test('the form gets the whole code once, through a hidden field, and nothing without a name', () => {
  const named = render({ name: 'otp', value: '4829' });
  try {
    const fields = [...named.root.querySelectorAll<HTMLInputElement>('[name]')];
    assert.deepEqual(fields.map((field) => [field.getAttribute('name'), field.type, field.value]), [['otp', 'hidden', '4829']]);
  } finally { named.fixture.destroy(); }
  const bare = render({ value: '4829' });
  try {
    assertNoNode(bare.root.querySelector('input[type="hidden"]'));
  } finally { bare.fixture.destroy(); }
});

test('masked cells are password fields, alphanumeric asks for the full keyboard, and required is native on every cell', () => {
  const { fixture, cells } = render({ length: 4, masked: true, characters: 'alphanumeric', required: true });
  try {
    assert.equal(cells.length, 4);
    for (const cell of cells) {
      assert.deepEqual([cell.getAttribute('type'), cell.getAttribute('inputmode'), cell.required], ['password', 'text', true]);
      assert.equal(cell.hasAttribute('pattern'), false);
      assert.equal(cell.hasAttribute('aria-required'), false);
    }
  } finally { fixture.destroy(); }
});

test('an error turns every cell invalid and describes each one, and a hint describes them without one', () => {
  const failed = render({ hint: 'Sent to your phone.', error: 'That code does not match.' });
  try {
    const note = failed.root.querySelector('[data-arena-part="pin-input.error"]');
    assert.ok(note?.id);
    assertNoNode(failed.root.querySelector('[data-arena-part="pin-input.hint"]'));
    for (const cell of failed.cells) assert.deepEqual([cell.getAttribute('aria-invalid'), cell.getAttribute('aria-describedby')], ['true', note!.id]);
  } finally { failed.fixture.destroy(); }
  const helped = render({ hint: 'Sent to your phone.' });
  try {
    const note = helped.root.querySelector('[data-arena-part="pin-input.hint"]');
    assert.ok(note?.id);
    for (const cell of helped.cells) assert.deepEqual([cell.getAttribute('aria-invalid'), cell.getAttribute('aria-describedby')], ['false', note!.id]);
  } finally { helped.fixture.destroy(); }
  const bare = render();
  try {
    for (const cell of bare.cells) assert.equal(cell.hasAttribute('aria-describedby'), false);
  } finally { bare.fixture.destroy(); }
});

test('the root and the group both shrink, so six cells fit the width they are given', () => {
  const source = JSON.parse(readFileSync(join(TAILWIND_COMPONENTS, 'forms/arena-pin-input/ArenaPinInput.manifest.json'), 'utf8')) as { slots: Record<string, string> };
  for (const slot of [source.slots['root']!, source.slots['group']!]) assert.ok(slot.split(/\s+/).includes('min-w-0'), slot);
});
