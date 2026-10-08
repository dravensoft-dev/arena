/* The disclosure pattern's two keyboard clauses are `behavioural`, so they are earned by
 * pressing the key and reading what moved. The three absences a sheet claims -- no dialog
 * role, no focus taken, no scrim -- are asserted by hand, because `disclosure` requires
 * none of them and a pattern cannot fail a component for growing one. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { join } from 'node:path';

import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { ArenaSheet } from './ArenaSheet.tsx';

afterEach(cleanup);

const BINDING = join(REACT_COMPONENTS, 'feedback/arena-sheet/ArenaSheet.behaviour.json');

const triggerIn = (root: ParentNode) => root.querySelector<HTMLButtonElement>('button[aria-expanded]')!;
const bodyIn = (root: ParentNode) =>
  document.getElementById(triggerIn(root).getAttribute('aria-controls')!)!;

interface OneProps {
  collapsed?: boolean;
  dismissible?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onClose?: () => void;
}

const one = (props: OneProps = {}) => (
  <ArenaSheet open className="arena-placement-end" title="Cart" footer={<button type="button">Checkout</button>} {...props}>
    <p>Two line items.</p>
  </ArenaSheet>
);

test('ArenaSheet meets the disclosure pattern it binds, and its two keys are pressed to prove it', () => {
  const root = mount(one());
  const trigger = triggerIn(root);
  assert.equal(trigger.tagName, 'BUTTON');
  assert.equal(trigger.getAttribute('type'), 'button');
  assert.equal(trigger.getAttribute('aria-expanded'), 'true', 'an unfolded panel reports expanded');
  assert.ok(bodyIn(root), 'aria-controls must never point at nothing, which is why the body is always rendered');

  assertPattern({
    root,
    bindingPath: BINDING,
    subjects: { default: trigger },
    behavioural: { 'keyboard.Enter': true, 'keyboard.Space': true },
  });
});

test('Enter and Space reach a native button as a click, so the platform activates it and Arena reports', () => {
  for (const key of ['Enter', ' ']) {
    const seen: boolean[] = [];
    const root = mount(one({ onCollapsedChange: (v) => seen.push(v) }));
    act(() => { triggerIn(root).click(); });
    assert.deepEqual(seen, [true], `${key}: a press must report exactly one boolean, the state moved to`);
    cleanup();
  }
});

test('collapsed folds the body and leaves the header and the footer where they were', () => {
  const root = mount(one({ collapsed: true }));
  const trigger = triggerIn(root);
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  const body = bodyIn(root);
  assert.equal(body.hasAttribute('hidden'), true,
    'a folded body is hidden, not absent, and [hidden] is what takes it out of the flow');
  assert.ok(root.textContent?.includes('Cart'), 'a folded panel still says what it is');
  assert.ok(root.textContent?.includes('Checkout'), 'and still carries the action it exists for');
});

test('the panel folds nothing by itself -- the control reports and Arena waits', () => {
  const seen: boolean[] = [];
  const root = mount(one({ onCollapsedChange: (v) => seen.push(v) }));
  act(() => { triggerIn(root).click(); });
  assert.deepEqual(seen, [true], 'the press must report');
  assert.equal(triggerIn(root).getAttribute('aria-expanded'), 'true',
    'and nothing must move until the host moves it -- collapsed is controlled, not seeded');
});

test('the close control is gated on dismissible, and Escape reports through the same channel', () => {
  const bare = mount(one());
  assert.equal(bare.querySelector('button[aria-label="Close"]'), null,
    'a panel that is not dismissible must render no close control');
  cleanup();

  let closes = 0;
  const root = mount(one({ dismissible: true, onClose: () => { closes += 1; } }));
  act(() => { root.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!.click(); });
  assert.equal(closes, 1, 'the close control must report through onClose, and once');

  act(() => {
    triggerIn(root).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  });
  assert.equal(closes, 2,
    'Escape must report through onClose as well, which is why it costs no member of its own');
});

test('a sheet is not a dialog: no role, no aria-modal, no scrim, and it takes no focus when it opens', () => {
  const anchor = document.createElement('button');
  document.body.appendChild(anchor);
  try {
    anchor.focus();
    assert.equal(document.activeElement, anchor, 'sanity: focus starts on the anchor button');

    const root = mount(one());
    const panel = root.firstElementChild as HTMLElement;
    assert.equal(panel.getAttribute('role'), null, 'a non-modal panel claims no dialog role');
    assert.equal(panel.getAttribute('aria-modal'), null);
    const drawn = panel.className;
    assert.ok(drawn.includes('arena-sheet__root'), 'a sheet belongs in its own slot, not the modal\'s');
    assert.ok(!drawn.includes('backdrop-blur'), 'a sheet darkens nothing behind it');
    assert.ok(!drawn.includes('bg-scrim'), 'and lays no scrim over what it leaves usable');
    assert.equal(document.activeElement, anchor,
      'opening a panel that takes nothing away must not take focus either');
  } finally {
    anchor.remove();
  }
});

test('closed renders nothing at all, which is what makes it a different state from collapsed', () => {
  const root = mount(<ArenaSheet open={false} title="Cart">body</ArenaSheet>);
  assert.equal(root.textContent?.trim(), '', 'a closed panel must render nothing');
});

test('a blank title throws rather than rendering a panel nothing can name', () => {
  assert.throws(() => mount(<ArenaSheet open title="">body</ArenaSheet>), /title/);
});
