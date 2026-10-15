/* The chip keyboard, which the combobox pattern does not cover: the field is the one tab stop, an empty
 * field's ArrowLeft or Backspace moves to the last chip and never removes silently, the arrows walk the
 * chips and ArrowRight past the last returns to the field, and removing a chip hands focus to its
 * neighbour or back to the field. Each remove is named by the remove word and the chip's text. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { ArenaMultiSelect } from './ArenaMultiSelect.tsx';

afterEach(cleanup);

const REGIONS = [
  { value: 'berlin', label: 'Berlin' },
  { value: 'lisbon', label: 'Lisbon' },
  { value: 'oslo', label: 'Oslo' },
];

function Host({ sets, maxVisible }: { sets: (readonly string[])[]; maxVisible?: number }) {
  const [value, setValue] = useState<readonly string[]>(['berlin', 'lisbon', 'oslo']);
  return <ArenaMultiSelect label="Cities" options={REGIONS} value={value} maxVisible={maxVisible} onChange={(set) => { sets.push(set.values); setValue(set.values); }} />;
}

function render(maxVisible?: number) {
  const sets: (readonly string[])[] = [];
  const root = mount(<Host sets={sets} maxVisible={maxVisible} />);
  const input = root.querySelector<HTMLInputElement>('[role="combobox"]')!;
  act(() => { input.focus(); });
  const removes = () => [...root.querySelectorAll<HTMLElement>('[data-arena-part="tag.close"]')];
  return { root, input, sets, removes };
}

function key(target: Element, name: string) {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
  act(() => { target.dispatchEvent(event); });
  return event;
}

const nameOf = (button: HTMLElement) => (button.getAttribute('aria-labelledby') ?? '').split(' ')
  .map((id) => document.getElementById(id)?.textContent?.trim()).join(' ');

test('the field is the one tab stop, and each remove reads the word and its own chip', () => {
  const { removes } = render();
  const tabbable = [...document.querySelectorAll<HTMLElement>('input, button')].filter((one) => one.tabIndex >= 0);
  assert.deepEqual(tabbable.map((one) => one.getAttribute('role')), ['combobox']);
  assert.deepEqual(removes().map(nameOf), ['Remove Berlin', 'Remove Lisbon', 'Remove Oslo']);
});

test('Backspace on an empty field moves to the last chip, and the second press removes it', () => {
  const { input, sets, removes } = render();
  key(input, 'Backspace');
  assert.equal(document.activeElement, removes()[2]);
  assert.deepEqual(sets, [], 'the first Backspace removed a chip silently');
  key(removes()[2]!, 'Backspace');
  assert.deepEqual(sets, [['berlin', 'lisbon']]);
  assert.equal(document.activeElement, removes()[1], 'focus did not land on the neighbour');
});

test('ArrowLeft at the start of an empty field walks the chips, and ArrowRight past the last returns to the field', () => {
  const { input, removes } = render();
  key(input, 'ArrowLeft');
  assert.equal(document.activeElement, removes()[2]);
  key(removes()[2]!, 'ArrowLeft');
  key(removes()[1]!, 'ArrowLeft');
  key(removes()[0]!, 'ArrowLeft');
  assert.equal(document.activeElement, removes()[0], 'the walk did not stop at the first chip');
  key(removes()[0]!, 'ArrowRight');
  key(removes()[1]!, 'ArrowRight');
  key(removes()[2]!, 'ArrowRight');
  assert.equal(document.activeElement, input);
});

test('Delete removes the focused chip and hands focus to the one after it; the last one left hands it to the field', () => {
  const { input, sets, removes } = render();
  key(input, 'ArrowLeft');
  key(removes()[2]!, 'ArrowLeft');
  key(removes()[1]!, 'ArrowLeft');
  key(removes()[0]!, 'Delete');
  assert.deepEqual(sets.at(-1), ['lisbon', 'oslo']);
  assert.equal(document.activeElement, removes()[0]);
  key(removes()[0]!, 'Delete');
  key(removes()[0]!, 'Delete');
  assert.deepEqual(sets.at(-1), []);
  assert.equal(document.activeElement, input);
});

test('a text in the field keeps Backspace and ArrowLeft for the text', () => {
  const { input, removes } = render();
  act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(input, 'os');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  assert.equal(key(input, 'Backspace').defaultPrevented, false);
  assert.equal(document.activeElement, input);
  assert.equal(removes().includes(document.activeElement as HTMLElement), false);
});

test('only the drawn chips are walked, and the collapsed ones stay in the list', () => {
  const { root, input, removes } = render(2);
  assert.equal(removes().length, 2);
  assert.equal(root.querySelector('[data-arena-part="combobox.more"]')?.textContent, '+1');
  key(input, 'Backspace');
  assert.equal(document.activeElement, removes()[1]);
});

test('Enter and Space on a remove button are left to its own activation; a click removes that chip and walks focus', () => {
  const { removes, sets } = render();
  act(() => { removes()[1]!.focus(); });
  for (const name of ['Enter', ' ']) {
    const event = key(removes()[1]!, name);
    assert.equal(event.defaultPrevented, false, `${JSON.stringify(name)} keydown was taken`);
  }
  assert.deepEqual(sets, [], 'a keydown alone removed a chip');
  act(() => { removes()[1]!.click(); });
  assert.deepEqual(sets, [['berlin', 'oslo']]);
  assert.equal(document.activeElement, removes()[1], 'focus moves to the neighbour');
});

function Late({ pending }: { pending: { apply: (() => void) | null } }) {
  const [value, setValue] = useState<readonly string[]>(['berlin', 'lisbon', 'oslo']);
  pending.apply = null;
  return (
    <ArenaMultiSelect label="Cities" options={REGIONS} value={value}
      onChange={(set) => { pending.apply = () => setValue(set.values); }} />
  );
}

test('focus after a removal lands on the neighbour even when the parent writes the set back later', () => {
  const pending: { apply: (() => void) | null } = { apply: null };
  const root = mount(<Late pending={pending} />);
  const removes = () => [...root.querySelectorAll<HTMLElement>('[data-arena-part="tag.close"]')];
  act(() => { removes()[1]!.focus(); });
  const oslo = removes()[2]!;
  act(() => { removes()[1]!.click(); });
  assert.equal(document.activeElement, oslo, 'focus went to the chip being removed');
  const apply = pending.apply as (() => void) | null;
  assert.ok(apply, 'the parent was not told');
  act(() => { apply!(); });
  assert.equal(removes().length, 2);
  assert.equal(document.activeElement, oslo, 'the neighbour lost focus when the set came back');
});
