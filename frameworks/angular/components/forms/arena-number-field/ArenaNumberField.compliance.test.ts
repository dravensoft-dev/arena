/* spinbutton binds to the text field, which carries the role explicitly because only a text field
 * can show a grouped, localized number. Every key the pattern requires is pressed and its result
 * read back, a conditional state is rendered both ways, and the steppers are proved to stay out of
 * the Tab sequence. change is an output named after a DOM event and the field's own change bubbles
 * to the host, so the component stops it there and a consumer hears a commit once. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaNumberField } from './ArenaNumberField';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'forms/arena-number-field/ArenaNumberField.behaviour.json');

@Component({
  selector: 'number-field-compliance-host',
  standalone: true,
  imports: [ArenaNumberField],
  template: `<arena-number-field label="Replicas" name="replicas" [value]="value()" [min]="min()" [max]="max()" [step]="step()"
                                 prefix="$" (valueChange)="seen.push($event); value.set($event)" />`,
})
class Host {
  readonly value = signal<number | undefined>(3);
  readonly min = signal<number | undefined>(1);
  readonly max = signal<number | undefined>(9);
  readonly step = signal(1);
  seen: unknown[] = [];
}

function render(patch: { value?: number; min?: number; max?: number; step?: number } = {}) {
  const fixture = TestBed.createComponent(Host);
  const host = fixture.componentInstance;
  if ('value' in patch) host.value.set(patch.value);
  if ('min' in patch) host.min.set(patch.min);
  if ('max' in patch) host.max.set(patch.max);
  if (patch.step !== undefined) host.step.set(patch.step);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const input = root.querySelector('input[data-arena-part="number-field.input"]') as HTMLInputElement;
  const press = (key: string) => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  return { fixture, root, input, press, seen: host.seen };
}

const valueOf = (input: HTMLInputElement) => input.getAttribute('aria-valuenow');

test('Up and Down move the value by one step and announce it', () => {
  const { fixture, input, press } = render({ step: 2, max: 20 });
  try {
    press('ArrowUp');
    assert.equal(valueOf(input), '5');
    press('ArrowDown');
    press('ArrowDown');
    assert.equal(valueOf(input), '1');
  } finally { fixture.destroy(); }
});

test('Home and End reach the bounds the field has', () => {
  const { fixture, input, press } = render();
  try {
    press('End');
    assert.equal(valueOf(input), '9');
    press('Home');
    assert.equal(valueOf(input), '1');
  } finally { fixture.destroy(); }
});

test('the value states follow the field: present with a value or a bound, absent without', () => {
  const full = render();
  try {
    assert.deepEqual(['aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'aria-valuetext'].map((a) => full.input.getAttribute(a)), ['3', '1', '9', '$3']);
  } finally { full.fixture.destroy(); }
  const empty = render({ value: undefined, min: undefined, max: undefined });
  try {
    assert.deepEqual(['aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'aria-valuetext'].map((a) => empty.input.getAttribute(a)), [null, null, null, null]);
  } finally { empty.fixture.destroy(); }
});

test('the steppers stay out of the Tab sequence, so the field is the one stop', () => {
  const { fixture, root } = render();
  try {
    const stops = [...root.querySelectorAll('button, input:not([type="hidden"])')].filter((el) => el.getAttribute('tabindex') !== '-1');
    assert.deepEqual(stops.map((el) => el.getAttribute('data-arena-part')), ['number-field.input']);
  } finally { fixture.destroy(); }
});

test('the field\'s own change event stops at the component, so a consumer hears each commit once', () => {
  const { fixture, input, press, seen } = render();
  try {
    press('ArrowUp');
    input.dispatchEvent(new Event('change', { bubbles: true }));
    assert.deepEqual(seen, [4]);
  } finally { fixture.destroy(); }
});

test('the host clears the global attributes the component takes as members', () => {
  const { fixture, root } = render();
  try {
    const host = root.querySelector('arena-number-field') as HTMLElement;
    assert.equal(host.getAttribute('name'), null);
    assert.equal(host.getAttribute('id'), null);
    assert.equal((root.querySelector('input[type="hidden"]') as HTMLInputElement).value, '3');
  } finally { fixture.destroy(); }
});

test('ArenaNumberField meets the spinbutton pattern on its text field', () => {
  const { fixture, root, input, press } = render();
  try {
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
  } finally { fixture.destroy(); }
});
