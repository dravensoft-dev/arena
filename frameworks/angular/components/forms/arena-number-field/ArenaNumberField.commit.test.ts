/* What a number field commits, and when: a typed draft never reaches a payload until blur or Enter,
 * a commit is clamped, an emptied field clears once, every key and stepper step commits, an empty
 * field starts from its baseline, and a field with no value bound holds its own number. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { ArenaNumberFormat, ArenaValidateOn } from '../../../Api.generated';
import { ArenaNumberField } from './ArenaNumberField';

type Inputs = {
  value?: number; min?: number; max?: number; step?: number; readOnly?: boolean; format?: ArenaNumberFormat;
  validate?: (value: number) => string; validateOn?: ArenaValidateOn;
};

function render(inputs: Inputs = {}) {
  const fixture: ComponentFixture<ArenaNumberField> = TestBed.createComponent(ArenaNumberField);
  fixture.componentRef.setInput('label', 'Replicas');
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  const changes: number[] = [];
  let clears = 0;
  fixture.componentInstance.change.subscribe((value: number) => {
    changes.push(value);
    if ('value' in inputs) fixture.componentRef.setInput('value', value);
  });
  fixture.componentInstance.clear.subscribe(() => {
    clears += 1;
    if ('value' in inputs) fixture.componentRef.setInput('value', undefined);
  });
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const input = root.querySelector('input[role="spinbutton"]') as HTMLInputElement;
  const [decrease, increase] = [...root.querySelectorAll('[data-arena-part="number-field.stepper"]')] as HTMLButtonElement[];
  const settle = () => fixture.detectChanges();
  const focus = () => { input.focus(); input.dispatchEvent(new FocusEvent('focus')); settle(); };
  const type = (text: string) => { input.value = text; input.dispatchEvent(new Event('input', { bubbles: true })); settle(); };
  const key = (name: string) => {
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
    input.dispatchEvent(event);
    settle();
    return event;
  };
  const blur = () => { input.blur(); input.dispatchEvent(new FocusEvent('blur')); settle(); };
  return { fixture, root, input, decrease: decrease!, increase: increase!, changes, clears: () => clears, focus, type, key, blur, settle };
}

test('a typed draft reaches no payload until blur, and then it commits once, clamped', () => {
  const field = render({ min: 1, max: 100 });
  try {
    field.focus();
    field.type('5');
    field.type('500');
    assert.deepEqual(field.changes, []);
    field.blur();
    assert.deepEqual(field.changes, [100]);
    assert.equal(field.input.value, '100');
    assert.equal(field.input.getAttribute('aria-valuenow'), '100');
  } finally { field.fixture.destroy(); }
});

test('Enter commits and keeps the field in edit, and Escape puts back the last committed number', () => {
  const field = render({ value: 3 });
  try {
    field.focus();
    field.type('7');
    field.key('Enter');
    assert.deepEqual(field.changes, [7]);
    field.type('12');
    field.key('Escape');
    assert.equal(field.input.value, '7');
    field.blur();
    assert.deepEqual(field.changes, [7]);
  } finally { field.fixture.destroy(); }
});

test('an emptied field fires clear once and never change, and an empty field cleared again says nothing', () => {
  const field = render({ value: 3 });
  try {
    field.focus();
    field.type('');
    field.blur();
    assert.equal(field.clears(), 1);
    assert.deepEqual(field.changes, []);
    field.focus();
    field.blur();
    assert.equal(field.clears(), 1);
  } finally { field.fixture.destroy(); }
});

test('a draft that is no number commits nothing and the field shows the last committed one', () => {
  const field = render({ value: 3 });
  try {
    field.focus();
    field.type('-');
    field.blur();
    assert.deepEqual(field.changes, []);
    assert.equal(field.clears(), 0);
    assert.equal(field.input.value, '3');
  } finally { field.fixture.destroy(); }
});

test('Up and Down step by one step, the page keys by ten, and Up at the maximum does nothing', () => {
  const field = render({ value: 5, min: 0, max: 20, step: 0.5 });
  try {
    field.focus();
    assert.equal(field.key('ArrowUp').defaultPrevented, true);
    field.key('PageUp');
    field.key('ArrowDown');
    assert.deepEqual(field.changes, [5.5, 10.5, 10]);
    field.key('End');
    field.key('ArrowUp');
    field.key('PageUp');
    assert.deepEqual(field.changes, [5.5, 10.5, 10, 20]);
  } finally { field.fixture.destroy(); }
});

test('Home and End go to a bound the field has, and leave the caret alone when it has none', () => {
  const bounded = render({ value: 5, min: 1, max: 9 });
  try {
    bounded.focus();
    bounded.key('End');
    bounded.key('Home');
    assert.deepEqual(bounded.changes, [9, 1]);
  } finally { bounded.fixture.destroy(); }
  const open = render({ value: 5 });
  try {
    open.focus();
    assert.equal(open.key('Home').defaultPrevented, false);
    assert.equal(open.key('End').defaultPrevented, false);
    assert.deepEqual(open.changes, []);
  } finally { open.fixture.destroy(); }
});

test('from an empty field the first step commits the baseline, and the next one steps from it', () => {
  const field = render({ min: 4, max: 10 });
  try {
    field.focus();
    field.key('ArrowDown');
    field.key('ArrowUp');
    assert.deepEqual(field.changes, [4, 5]);
  } finally { field.fixture.destroy(); }
  const open = render();
  try {
    open.focus();
    open.key('ArrowUp');
    assert.deepEqual(open.changes, [0]);
  } finally { open.fixture.destroy(); }
});

test('a stepper press commits a step, and the one at a bound is disabled', () => {
  const field = render({ value: 19, max: 20 });
  try {
    field.increase.click();
    field.settle();
    assert.deepEqual(field.changes, [20]);
    assert.equal(field.increase.disabled, true);
    field.decrease.click();
    field.settle();
    assert.deepEqual(field.changes, [20, 19]);
  } finally { field.fixture.destroy(); }
});

test('a read-only field answers no key and no stepper', () => {
  const field = render({ value: 5, readOnly: true });
  try {
    field.focus();
    field.key('ArrowUp');
    assert.equal(field.increase.disabled, true);
    assert.deepEqual(field.changes, []);
  } finally { field.fixture.destroy(); }
});

test('with no value bound the field holds what it commits, and a bound value controls it, empty included', () => {
  const free = render();
  try {
    free.focus();
    free.type('8');
    free.blur();
    assert.equal(free.input.value, '8');
  } finally { free.fixture.destroy(); }
  const fixture = TestBed.createComponent(ArenaNumberField);
  try {
    fixture.componentRef.setInput('label', 'Replicas');
    fixture.componentRef.setInput('value', 2);
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector('input[role="spinbutton"]') as HTMLInputElement;
    fixture.componentRef.setInput('value', 11);
    fixture.detectChanges();
    assert.equal(input.value, '11');
    fixture.componentRef.setInput('value', undefined);
    fixture.detectChanges();
    assert.equal(input.value, '');
    fixture.componentRef.setInput('value', 4);
    fixture.detectChanges();
    input.focus();
    input.dispatchEvent(new FocusEvent('focus'));
    input.value = '8';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.blur();
    input.dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();
    assert.equal(input.value, '4', 'a bound value the host does not move was overridden by the commit');
  } finally { fixture.destroy(); }
});

test('a de-DE field edits with a comma and writes the group separator once it commits', () => {
  const field = render({ format: { locale: 'de-DE' } });
  try {
    field.focus();
    field.type('1234,5');
    field.blur();
    assert.deepEqual(field.changes, [1234.5]);
    assert.equal(field.input.value, '1.234,5');
    field.focus();
    assert.equal(field.input.value, '1234,5');
  } finally { field.fixture.destroy(); }
});

test('validate runs on a committed number at blur, on every step when asked to, and never on an empty field', () => {
  const seen: number[] = [];
  const check = (value: number) => { seen.push(value); return value > 5 ? 'Too many.' : ''; };
  const field = render({ validate: check });
  try {
    field.focus();
    field.key('ArrowUp');
    assert.deepEqual(seen, []);
    field.type('9');
    field.blur();
    assert.deepEqual(seen, [9]);
    assert.match(field.root.textContent ?? '', /Too many\./);
  } finally { field.fixture.destroy(); }
  const eager = render({ value: 5, validate: check, validateOn: 'change' });
  try {
    eager.focus();
    eager.key('ArrowUp');
    assert.match(eager.root.textContent ?? '', /Too many\./);
  } finally { eager.fixture.destroy(); }
  seen.length = 0;
  const empty = render({ validate: check });
  try {
    empty.focus();
    empty.blur();
    assert.deepEqual(seen, []);
  } finally { empty.fixture.destroy(); }
});

test('focus and select reach the field and its text', () => {
  const field = render({ value: 42 });
  try {
    field.fixture.componentInstance.focus();
    assert.equal(field.input.ownerDocument.activeElement, field.input);
    field.fixture.componentInstance.select();
    assert.equal(field.input.selectionEnd! - field.input.selectionStart!, field.input.value.length);
  } finally { field.fixture.destroy(); }
});
