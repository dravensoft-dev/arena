/* The combobox pattern this component binds, evaluated open, and the listbox facts it leaves to the
 * suite: the popup says it holds a set with aria-multiselectable, every chosen row says so with
 * aria-selected, aria-expanded toggles and aria-controls exists only while the list does. listbox is
 * not bound, since its type-ahead would take characters the field owns. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React, { useState } from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { ArenaMultiSelect } from './ArenaMultiSelect.tsx';

afterEach(cleanup);

const BINDING = join(REACT_COMPONENTS, 'forms/arena-multi-select/ArenaMultiSelect.behaviour.json');

const REGIONS = [
  { value: 'eu-west', label: 'Europe West' },
  { value: 'us-east', label: 'US East' },
];

function key(target: Element, name: string) {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
  act(() => { target.dispatchEvent(event); });
  return event;
}

function render() {
  const root = mount(<ArenaMultiSelect label="Regions" value={['us-east']} options={REGIONS} />);
  const input = root.querySelector<HTMLInputElement>('[role="combobox"]')!;
  act(() => { input.focus(); });
  return { root, input };
}

function Held() {
  const [value, setValue] = useState<readonly string[]>([]);
  return <ArenaMultiSelect label="Regions" value={value} options={REGIONS} onValueChange={(set) => setValue(set.values)} />;
}

function enterAcceptsAndCloses(): boolean {
  const root = mount(<Held />);
  const input = root.querySelector<HTMLInputElement>('[role="combobox"]')!;
  act(() => { input.focus(); });
  key(input, 'ArrowDown');
  key(input, 'ArrowDown');
  const open = input.getAttribute('aria-expanded') === 'true';
  key(input, 'Enter');
  const accepted = root.querySelectorAll('[data-arena-part="tag.close"]').length === 1;
  const closed = input.getAttribute('aria-expanded') === 'false' && !input.hasAttribute('aria-controls');
  cleanup();
  return open && accepted && closed;
}

test('Enter accepts the cursor row and closes the popup, as the pattern says', () => {
  assert.equal(enterAcceptsAndCloses(), true);
});

test('ArenaMultiSelect meets the combobox pattern it binds, open', () => {
  const enter = enterAcceptsAndCloses();
  const { root, input } = render();
  key(input, 'ArrowDown');
  assertPattern({
    root,
    bindingPath: BINDING,
    subjects: { default: input },
    behavioural: { 'keyboard.ArrowDown': true, 'keyboard.Escape': true, 'keyboard.Enter': enter },
  });
});

test('the popup is a named listbox that holds a set, and each chosen row says so', () => {
  const { root, input } = render();
  key(input, 'ArrowDown');
  const listbox = root.querySelector<HTMLElement>('[role="listbox"]')!;
  assert.equal(listbox.getAttribute('aria-multiselectable'), 'true');
  assert.equal(listbox.getAttribute('aria-label'), 'Regions');
  assert.deepEqual([...listbox.querySelectorAll('[role="option"]')].map((row) => row.getAttribute('aria-selected')), ['false', 'true']);
});

test('aria-expanded toggles, and aria-controls names the list only while it is there', () => {
  const { root, input } = render();
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  assert.equal(input.hasAttribute('aria-controls'), false);
  key(input, 'ArrowDown');
  assert.equal(input.getAttribute('aria-expanded'), 'true');
  assert.equal(input.getAttribute('aria-controls'), root.querySelector('[role="listbox"]')!.id);
  assert.equal(key(input, 'Escape').defaultPrevented, true);
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  assert.equal(input.hasAttribute('aria-controls'), false);
});
