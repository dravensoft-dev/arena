/* The combobox pattern this component binds, evaluated with the list open, plus what the pattern leaves
 * to the suite: aria-expanded really toggles, aria-controls names the list only while it exists, the
 * list and its rows carry their own roles and a name, and the active descendant names a rendered row
 * or nothing. listbox is not bound, since its type-ahead would take characters the field owns. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { ArenaCombobox } from './ArenaCombobox.tsx';

afterEach(cleanup);

const BINDING = join(REACT_COMPONENTS, 'forms/arena-combobox/ArenaCombobox.behaviour.json');

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
  const root = mount(<ArenaCombobox label="Region" value="us-east" options={REGIONS} />);
  const input = root.querySelector<HTMLInputElement>('[role="combobox"]')!;
  act(() => { input.focus(); });
  return { root, input };
}

test('ArenaCombobox meets the combobox pattern it binds, open', () => {
  const { root, input } = render();
  key(input, 'ArrowDown');
  assertPattern({
    root,
    bindingPath: BINDING,
    subjects: { default: input },
    behavioural: { 'keyboard.ArrowDown': true, 'keyboard.Escape': true, 'keyboard.Enter': true },
  });
});

test('aria-expanded toggles, and aria-controls names the list only while it is there', () => {
  const { root, input } = render();
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  assert.equal(input.hasAttribute('aria-controls'), false);
  key(input, 'ArrowDown');
  const listbox = root.querySelector<HTMLElement>('[role="listbox"]')!;
  assert.equal(input.getAttribute('aria-expanded'), 'true');
  assert.equal(input.getAttribute('aria-controls'), listbox.id);
  const escape = key(input, 'Escape');
  assert.equal(escape.defaultPrevented, true, 'Escape on an open list was not claimed');
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  assert.equal(input.hasAttribute('aria-controls'), false);
  assert.equal(root.querySelector('[role="listbox"]'), null);
});

test('the list is a named listbox of options, and the field keeps DOM focus throughout', () => {
  const { root, input } = render();
  key(input, 'ArrowDown');
  const listbox = root.querySelector<HTMLElement>('[role="listbox"]')!;
  assert.equal(listbox.getAttribute('aria-label'), 'Region');
  assert.equal(listbox.querySelectorAll('[role="option"]').length, REGIONS.length);
  key(input, 'ArrowUp');
  assert.equal(input.getAttribute('aria-activedescendant'), listbox.querySelector('[role="option"]')!.id);
  assert.equal(document.activeElement, input);
});

test('the panel is a floating surface the field anchors, shown in the top layer', () => {
  const { root, input } = render();
  key(input, 'ArrowDown');
  const panel = root.querySelector<HTMLElement>('[data-arena-part="combobox.panel"]')!;
  assert.equal(panel.getAttribute('data-arena-surface'), 'floating');
  assert.equal(panel.getAttribute('popover'), 'manual');
  assert.equal(panel.style.position, 'fixed', 'the panel was left in flow, where a clipping card cuts it');
});
