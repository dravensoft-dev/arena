/* textbox binds flat to every cell, passed as the subject because the host is not a cell. Each cell
 * is a single-line text field named by its position, required natively and invalid with the error.
 * The wrapper's group role and name are Arena's own design, asserted here directly. The platform
 * owns Tab, so the suite asserts the precondition: one cell is a tab stop in every state. change is
 * an output named after a DOM event, so a cell's native change stops at the component. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaPinInput } from './ArenaPinInput';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'forms/arena-pin-input/ArenaPinInput.behaviour.json');

@Component({
  selector: 'pin-input-compliance-host',
  standalone: true,
  imports: [ArenaPinInput],
  template: `<arena-pin-input label="Verification code" name="otp" [value]="value()" [required]="required()" [error]="error()"
                              (change)="seen.push($event); value.set($event)" />`,
})
class Host {
  readonly value = signal('');
  readonly required = signal(false);
  readonly error = signal<string | undefined>(undefined);
  seen: unknown[] = [];
}

function render(patch: { value?: string; required?: boolean; error?: string } = {}) {
  const fixture = TestBed.createComponent(Host);
  const host = fixture.componentInstance;
  if (patch.value !== undefined) host.value.set(patch.value);
  if (patch.required !== undefined) host.required.set(patch.required);
  if (patch.error !== undefined) host.error.set(patch.error);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const cells = [...root.querySelectorAll<HTMLInputElement>('[data-arena-part="pin-input.cell"]')];
  return { fixture, root, cells, seen: host.seen };
}

test('the wrapper is a group that the label names', () => {
  const { fixture, root } = render();
  try {
    const group = root.querySelector('[data-arena-part="pin-input.group"]') as HTMLElement;
    assert.equal(group.getAttribute('role'), 'group');
    assert.equal(root.ownerDocument.getElementById(group.getAttribute('aria-labelledby') ?? '')?.textContent?.trim(), 'Verification code');
  } finally { fixture.destroy(); }
});

test('one cell is a tab stop whatever the code holds', () => {
  for (const value of ['', '4', '48291', '482913']) {
    const { fixture, cells } = render({ value });
    try {
      assert.equal(cells.filter((cell) => cell.getAttribute('tabindex') === '0').length, 1, value);
    } finally { fixture.destroy(); }
  }
});

test('required is the native attribute on each cell, with no aria-required beside it', () => {
  const { fixture, cells } = render({ required: true });
  try {
    for (const cell of cells) assert.deepEqual([cell.required, cell.getAttribute('aria-required')], [true, null]);
  } finally { fixture.destroy(); }
});

test('a cell\'s own change event stops at the component, so a consumer hears each edit once', () => {
  const { fixture, cells, seen } = render();
  try {
    cells[0]!.focus();
    cells[0]!.value = '4';
    cells[0]!.dispatchEvent(new Event('input', { bubbles: true }));
    cells[0]!.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    assert.deepEqual(seen, ['4']);
  } finally { fixture.destroy(); }
});

test('the host clears the name attribute the component takes as a member, and the hidden field holds the code', () => {
  const { fixture, root } = render({ value: '4829' });
  try {
    assert.equal((root.querySelector('arena-pin-input') as HTMLElement).getAttribute('name'), null);
    const named = [...root.querySelectorAll('[name]')];
    assert.equal(named.length, 1);
    assert.deepEqual([(named[0] as HTMLInputElement).type, (named[0] as HTMLInputElement).value], ['hidden', '4829']);
  } finally { fixture.destroy(); }
});

test('ArenaPinInput meets the textbox pattern on every cell', () => {
  const { fixture, root, cells } = render({ required: true, error: 'That code does not match.' });
  try {
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
  } finally { fixture.destroy(); }
});
