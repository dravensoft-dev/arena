/* jsdom implements no layout and no scrollIntoView, so the row records the call
 * rather than moving. The commands carry a group each, which is the shape that
 * separates the active row from the element a child lookup on the listbox would
 * reach: the rows sit one level below it. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { ArenaCommandPalette } from './ArenaCommandPalette.tsx';

afterEach(cleanup);

const COMMANDS = [
  { id: 'deploy', label: 'Deploy to production', group: 'Actions' },
  { id: 'rollback', label: 'Roll back the last release', group: 'Actions' },
  { id: 'acme', label: 'Acme Industries', group: 'Customers' },
  { id: 'globex', label: 'Globex', group: 'Customers' },
];

function scrolls(root: HTMLElement) {
  const asked: { element: HTMLElement; options: ScrollIntoViewOptions | undefined }[] = [];
  for (const element of root.querySelectorAll<HTMLElement>('[role="option"], [role="group"]')) {
    element.scrollIntoView = (options?: boolean | ScrollIntoViewOptions) => {
      asked.push({ element, options: options as ScrollIntoViewOptions });
    };
  }
  return asked;
}

function render() {
  const root = mount(<ArenaCommandPalette open commands={COMMANDS} onClose={() => {}} onRun={() => {}} />);
  return { root, input: root.querySelector<HTMLElement>('[role="combobox"]')! };
}

function press(el: Element, key: string) {
  act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); });
}

test('the row the keyboard activates is the row asked to scroll, not the group holding it', () => {
  const { root, input } = render();
  const asked = scrolls(root);

  press(input, 'ArrowDown');

  const active = root.querySelector('[aria-selected="true"]');
  assert.equal(active?.textContent?.includes('Roll back the last release'), true);
  assert.deepEqual(asked.map((one) => one.element), [active]);
  assert.deepEqual(asked[0]?.options, { block: 'nearest' });
});

test('a row in the second group is reached as well, which is where an index into the children runs out', () => {
  const { root, input } = render();
  const asked = scrolls(root);

  press(input, 'ArrowDown');
  press(input, 'ArrowDown');
  press(input, 'ArrowDown');

  const active = root.querySelector('[aria-selected="true"]');
  assert.equal(active?.textContent?.includes('Globex'), true);
  assert.equal(asked.at(-1)?.element, active);
});

test('a query that matches nothing scrolls nothing rather than reaching for a row that is gone', () => {
  const { root, input } = render();
  const asked = scrolls(root);

  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, 'zzz');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  assert.equal(root.querySelectorAll('[role="option"]').length, 0);
  assert.deepEqual(asked, []);
});
