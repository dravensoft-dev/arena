/* What a number field commits, and when: a typed draft never reaches a payload until blur or Enter,
 * a commit is clamped, an emptied field clears once, every key and stepper step commits, an empty
 * field starts from its baseline, and a field with no value bound holds its own number. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { ArenaNumberField, type ArenaNumberFieldHandle, type ArenaNumberFieldProps } from './ArenaNumberField.tsx';

afterEach(cleanup);

const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;

function render(props: Partial<ArenaNumberFieldProps> = {}) {
  const changes: number[] = [];
  let clears = 0;
  const handle = React.createRef<ArenaNumberFieldHandle>();
  function Host() {
    const [value, write] = useState<number | undefined>(props.value);
    const bound = 'value' in props ? { value } : {};
    return (
      <ArenaNumberField ref={handle} label="Replicas" {...props} {...bound}
        onValueChange={(next) => { changes.push(next); write(next); }} onClear={() => { clears += 1; write(undefined); }} />
    );
  }
  const root = mount(<Host />);
  const input = root.querySelector<HTMLInputElement>('input[role="spinbutton"]')!;
  const [decrease, increase] = [...root.querySelectorAll<HTMLButtonElement>('[data-arena-part="number-field.stepper"]')];
  const focus = () => act(() => { input.focus(); });
  const type = (text: string) => act(() => {
    setValue.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const key = (name: string) => {
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
    act(() => { input.dispatchEvent(event); });
    return event;
  };
  const blur = () => act(() => { input.blur(); });
  return { root, input, decrease: decrease!, increase: increase!, handle, changes, clears: () => clears, focus, type, key, blur };
}

test('a typed draft reaches no payload until blur, and then it commits once, clamped', () => {
  const field = render({ min: 1, max: 100 });
  field.focus();
  field.type('5');
  field.type('500');
  assert.deepEqual(field.changes, []);
  field.blur();
  assert.deepEqual(field.changes, [100]);
  assert.equal(field.input.value, '100');
  assert.equal(field.input.getAttribute('aria-valuenow'), '100');
});

test('Enter commits and keeps the field in edit, and Escape puts back the last committed number', () => {
  const field = render({ value: 3 });
  field.focus();
  field.type('7');
  field.key('Enter');
  assert.deepEqual(field.changes, [7]);
  field.type('12');
  field.key('Escape');
  assert.equal(field.input.value, '7');
  field.blur();
  assert.deepEqual(field.changes, [7]);
});

test('an emptied field fires clear once and never change, and an empty field cleared again says nothing', () => {
  const field = render({ value: 3 });
  field.focus();
  field.type('');
  field.blur();
  assert.equal(field.clears(), 1);
  assert.deepEqual(field.changes, []);
  field.focus();
  field.blur();
  assert.equal(field.clears(), 1);
});

test('a draft that is no number commits nothing and the field shows the last committed one', () => {
  const field = render({ value: 3 });
  field.focus();
  field.type('-');
  field.blur();
  assert.deepEqual(field.changes, []);
  assert.equal(field.clears(), 0);
  assert.equal(field.input.value, '3');
});

test('Up and Down step by one step, the page keys by ten, and Up at the maximum does nothing', () => {
  const field = render({ value: 5, min: 0, max: 20, step: 0.5 });
  field.focus();
  assert.equal(field.key('ArrowUp').defaultPrevented, true);
  field.key('PageUp');
  field.key('ArrowDown');
  assert.deepEqual(field.changes, [5.5, 10.5, 10]);
  field.key('End');
  field.key('ArrowUp');
  field.key('PageUp');
  assert.deepEqual(field.changes, [5.5, 10.5, 10, 20]);
});

test('Home and End go to a bound the field has, and leave the caret alone when it has none', () => {
  const bounded = render({ value: 5, min: 1, max: 9 });
  bounded.focus();
  bounded.key('End');
  bounded.key('Home');
  assert.deepEqual(bounded.changes, [9, 1]);
  cleanup();
  const open = render({ value: 5 });
  open.focus();
  assert.equal(open.key('Home').defaultPrevented, false);
  assert.equal(open.key('End').defaultPrevented, false);
  assert.deepEqual(open.changes, []);
});

test('from an empty field the first step commits the baseline, and the next one steps from it', () => {
  const field = render({ min: 4, max: 10 });
  field.focus();
  field.key('ArrowDown');
  field.key('ArrowUp');
  assert.deepEqual(field.changes, [4, 5]);
  cleanup();
  const open = render();
  open.focus();
  open.key('ArrowUp');
  assert.deepEqual(open.changes, [0]);
});

test('a stepper press commits a step, and the one at a bound is disabled', () => {
  const field = render({ value: 19, max: 20 });
  act(() => { field.increase.click(); });
  assert.deepEqual(field.changes, [20]);
  assert.equal(field.increase.disabled, true);
  act(() => { field.decrease.click(); });
  assert.deepEqual(field.changes, [20, 19]);
});

test('a read-only field answers no key and no stepper', () => {
  const field = render({ value: 5, readOnly: true });
  field.focus();
  field.key('ArrowUp');
  assert.equal(field.increase.disabled, true);
  assert.deepEqual(field.changes, []);
});

test('with no value bound the field holds what it commits, and a bound value controls it, empty included', () => {
  const free = render();
  free.focus();
  free.type('8');
  free.blur();
  assert.equal(free.input.value, '8');
  cleanup();
  let set!: (value: number | undefined) => void;
  function Host() {
    const [value, write] = useState<number | undefined>(2);
    set = write;
    return <ArenaNumberField label="Replicas" value={value} />;
  }
  const root = mount(<Host />);
  const input = root.querySelector<HTMLInputElement>('input[role="spinbutton"]')!;
  act(() => { set(11); });
  assert.equal(input.value, '11');
  act(() => { set(undefined); });
  assert.equal(input.value, '');
  act(() => { set(4); });
  act(() => { input.focus(); });
  setValue.call(input, '8');
  act(() => { input.dispatchEvent(new Event('input', { bubbles: true })); });
  act(() => { input.blur(); });
  assert.equal(input.value, '4', 'a bound value the host does not move was overridden by the commit');
});

test('a de-DE field edits with a comma and writes the group separator once it commits', () => {
  const field = render({ format: { locale: 'de-DE' } });
  field.focus();
  field.type('1234,5');
  field.blur();
  assert.deepEqual(field.changes, [1234.5]);
  assert.equal(field.input.value, '1.234,5');
  field.focus();
  assert.equal(field.input.value, '1234,5');
});

test('validate runs on a committed number at blur, on every step when asked to, and never on an empty field', () => {
  const seen: number[] = [];
  const check = (value: number) => { seen.push(value); return value > 5 ? 'Too many.' : ''; };
  const field = render({ validate: check });
  field.focus();
  field.key('ArrowUp');
  assert.deepEqual(seen, []);
  field.type('9');
  field.blur();
  assert.deepEqual(seen, [9]);
  assert.match(field.root.textContent ?? '', /Too many\./);
  cleanup();
  const eager = render({ value: 5, validate: check, validateOn: 'change' });
  eager.focus();
  eager.key('ArrowUp');
  assert.match(eager.root.textContent ?? '', /Too many\./);
  cleanup();
  seen.length = 0;
  const empty = render({ validate: check });
  empty.focus();
  empty.blur();
  assert.deepEqual(seen, []);
});

test('the handle focuses the field and selects its text', () => {
  const field = render({ value: 42 });
  act(() => { field.handle.current?.focus(); });
  assert.equal(document.activeElement, field.input);
  act(() => { field.handle.current?.select(); });
  assert.equal(field.input.selectionEnd! - field.input.selectionStart!, field.input.value.length);
});
