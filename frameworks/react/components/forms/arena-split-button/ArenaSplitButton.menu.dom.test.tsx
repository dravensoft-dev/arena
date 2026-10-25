/* The caret half meets the menu-button pattern the split binds: a native button that carries the
 * popup state, opened by Enter and Space with focus on the first entry, and closed by Escape with
 * focus back on it. The primary half claims no pattern, and the group is asserted by hand beside. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { join } from 'node:path';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { isFocusable } from '../../../../../scripts/lib/core/behaviour-compliance.ts';
import { ArenaSplitButton } from './ArenaSplitButton.tsx';

afterEach(cleanup);

const BINDING = join(REACT_COMPONENTS, 'forms/arena-split-button/ArenaSplitButton.behaviour.json');

function press(el: Element, key: string) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  act(() => { el.dispatchEvent(event); });
  return event;
}

test('the popup state sits on the caret and on nothing else', () => {
  const root = mount(<ArenaSplitButton label="Deployment" menuLabel="More deploy options" items={[{ label: 'Roll back' }]}>Deploy</ArenaSplitButton>);
  const caret = root.querySelector<HTMLElement>('[data-arena-part="split-button.caret"]')!;
  assert.equal(caret.getAttribute('aria-haspopup'), 'menu');
  assert.equal(caret.getAttribute('aria-expanded'), 'false');
  assert.equal(isFocusable(caret), true);
  assert.deepEqual([...root.querySelectorAll('[aria-haspopup]')], [caret], 'the primary half claimed the popup too');
});

test('ArenaSplitButton meets the menu-button pattern it binds, on the caret', () => {
  const root = mount(
    <ArenaSplitButton label="Deployment" menuLabel="More deploy options"
      items={[{ label: 'Deploy to staging' }, { divider: true }, { label: 'Roll back', destructive: true }]}>Deploy</ArenaSplitButton>,
  );
  const caret = root.querySelector<HTMLElement>('[data-arena-part="split-button.caret"]')!;

  for (const key of ['Enter', ' ']) {
    assert.equal(press(caret, key).defaultPrevented, false,
      `a handler of ours cancelled ${key === ' ' ? 'Space' : key}, suppressing the button's own activation`);
  }
  assert.equal(caret.tagName, 'BUTTON', 'Enter and Space reach the caret through the platform, which needs a real button');

  act(() => { caret.click(); });
  const panel = root.querySelector<HTMLElement>('[role="menu"]');
  assert.ok(panel, 'activating the caret did not open the menu');
  assert.equal(caret.getAttribute('aria-expanded'), 'true');
  const first = panel.querySelector<HTMLElement>('[role="menuitem"]');
  assert.equal(document.activeElement, first, 'opening left focus on the caret');

  const rows = [...panel.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  assertPattern({
    root,
    bindingPath: BINDING,
    subjects: {
      default: caret,
      'roles.item': rows,
      'roles.separator': [...panel.querySelectorAll<HTMLElement>('[data-arena-part="menu.divider"]')],
    },
    behavioural: {
      'focus.onOpen': true, 'keyboard.Enter': true, 'keyboard.Space': true, 'keyboard.Escape': true,
      'focus.roving': true, 'keyboard.ArrowDown': true, 'keyboard.ArrowUp': true,
      'keyboard.Home': true, 'keyboard.End': true, 'keyboard.TypeAhead': true,
    },
  });

  const down = press(first!, 'ArrowDown');
  assert.equal(down.defaultPrevented, true);
  assert.equal(document.activeElement, rows[1], 'ArrowDown did not reach the second row');
  press(rows[1]!, 'ArrowDown');
  assert.equal(document.activeElement, rows[0], 'ArrowDown did not wrap from the last row to the first');

  press(first!, 'Escape');
  assert.equal(root.querySelector('[role="menu"]'), null, 'Escape did not close the menu');
  assert.equal(document.activeElement, caret, 'Escape closed the menu and dropped focus');
});
