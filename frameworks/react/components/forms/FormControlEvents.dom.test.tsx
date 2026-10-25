import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../test/Harness.tsx';
import { ArenaInput } from './arena-input/ArenaInput.tsx';
import { ArenaCheckbox } from './arena-checkbox/ArenaCheckbox.tsx';
import { ArenaSelect } from './arena-select/ArenaSelect.tsx';
import { ArenaTextarea } from './arena-textarea/ArenaTextarea.tsx';
import { ArenaRadioGroup } from './arena-radio-group/ArenaRadioGroup.tsx';
import { ArenaRadio } from './arena-radio/ArenaRadio.tsx';

afterEach(cleanup);

function setNativeValue(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, next: string) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')!.set;
  setter!.call(el, next);
}

function typeInto(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, next: string) {
  act(() => {
    setNativeValue(el, next);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

test('ArenaCheckbox change hands the consumer a boolean, not the DOM event', () => {
  const seen: unknown[] = [];
  const root = mount(<ArenaCheckbox label="Notify" checked={false} onValueChange={(v) => seen.push(v)} />);
  const box = root.querySelector<HTMLElement>('input[type="checkbox"]');
  act(() => { box!.click(); });
  assert.equal(seen.length, 1, 'the change handler did not fire');
  assert.equal(typeof seen[0], 'boolean', 'the payload is not a boolean -- a DOM event is travelling');
  assert.equal(seen[0], true, 'the payload is not the new checked state');
});

test('ArenaInput change hands the consumer the string value, not the DOM event', () => {
  const seen: unknown[] = [];
  const root = mount(<ArenaInput label="Email" value="" onValueChange={(v) => seen.push(v)} />);
  typeInto(root!.querySelector<HTMLInputElement>('input')!, 'ana@dravensoft.dev');
  assert.equal(seen.length, 1, 'the change handler did not fire');
  assert.equal(typeof seen[0], 'string', 'the payload is not a string -- a DOM event is travelling');
  assert.equal(seen[0], 'ana@dravensoft.dev', 'the payload is not the edited value');
});

test('ArenaInput blur hands the consumer the value, and validate runs on it', () => {
  const seen: unknown[] = [];
  const root = mount(
    <ArenaInput label="Email" value="nope" validate={(v) => (v.includes('@') ? '' : 'Bad email')}
      onBlur={(v) => seen.push(v)} />,
  );
  const field = root.querySelector<HTMLInputElement>('input');
  act(() => { field!.focus(); });
  act(() => { field!.blur(); });
  assert.equal(seen.length, 1, 'the blur handler did not fire');
  assert.equal(typeof seen[0], 'string', 'the payload is not a string -- a DOM event is travelling');
  assert.deepEqual(seen, ['nope'], 'blur did not carry the value');
  assert.match(root.textContent, /Bad email/, 'validate did not run on blur');
});

test('ArenaSelect change hands the consumer the chosen value as a string', () => {
  const seen: unknown[] = [];
  const root = mount(
    <ArenaSelect label="Environment" value="prod"
      options={[{ value: 'prod', label: 'Production' }, { value: 'stage', label: 'Staging' }]}
      onValueChange={(v) => seen.push(v)} />,
  );
  const select = root.querySelector<HTMLSelectElement>('select');
  act(() => {
    setNativeValue(select!, 'stage');
    select!.dispatchEvent(new Event('change', { bubbles: true }));
  });
  assert.equal(seen.length, 1, 'the change handler did not fire');
  assert.equal(typeof seen[0], 'string', 'the payload is not a string -- a DOM event is travelling');
  assert.equal(seen[0], 'stage', "the payload is not the chosen option's value");
});

test('ArenaTextarea change hands the consumer the new text as a string', () => {
  const seen: unknown[] = [];
  const root = mount(<ArenaTextarea label="Notes" value="" onValueChange={(v) => seen.push(v)} />);
  typeInto(root!.querySelector<HTMLTextAreaElement>('textarea')!, 'Shipped on Friday.');
  assert.equal(seen.length, 1, 'the change handler did not fire');
  assert.equal(typeof seen[0], 'string', 'the payload is not a string -- a DOM event is travelling');
  assert.equal(seen[0], 'Shipped on Friday.', 'the payload is not the edited text');
});

test("ArenaRadioGroup change hands the consumer the selected option's value as a string", () => {
  const seen: unknown[] = [];
  const root = mount(
    <ArenaRadioGroup ariaLabel="Deployment target" value="prod" name="env" onValueChange={(v) => seen.push(v)}>
      <ArenaRadio value="prod" label="Production" />
      <ArenaRadio value="stage" label="Staging" />
    </ArenaRadioGroup>,
  );
  const radios = root.querySelectorAll<HTMLElement>('input[type="radio"]');
  assert.equal(radios.length, 2, 'ArenaRadioGroup did not render one native radio per child');
  act(() => { radios[1]!.click(); });
  assert.equal(seen.length, 1, 'the change handler did not fire');
  assert.equal(typeof seen[0], 'string', 'the payload is not a string -- a DOM event is travelling');
  assert.equal(seen[0], 'stage', "the payload is not the selected ArenaRadio's value");
});
