import { ensureDom } from '../../../test/TestbedEnv';
ensureDom();

import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { assertNotSameNode, assertSameNode } from '../../../test/NodeAssert';
import { disposeStrays } from '../../../test/Overlays';
import {
  type FocusTrapState,
  arenaFocusFirstFocusable,
  arenaFocusableElements,
  arenaHandleOpenTransition,
  arenaTrapTabKey,
} from '../../../FocusTrap';

function buildPageBehind(): HTMLElement {
  const behind = document.createElement('button');
  behind.textContent = 'a control on the page behind the scrim';
  document.body.appendChild(behind);
  return behind;
}

function buildPanel(): { panel: HTMLElement; back: HTMLElement; skip: HTMLElement; next: HTMLElement } {
  const panel = document.createElement('div');
  panel.setAttribute('tabindex', '-1');
  const dots = document.createElement('div');
  dots.textContent = '···';
  const back = document.createElement('button');
  back.textContent = 'Back';
  const skip = document.createElement('button');
  skip.textContent = 'Skip';
  const next = document.createElement('button');
  next.textContent = 'Next';
  panel.append(dots, back, skip, next);
  document.body.appendChild(panel);
  return { panel, back, skip, next };
}

function buildFirstStepPanel(): { panel: HTMLElement; skip: HTMLElement; next: HTMLElement } {
  const panel = document.createElement('div');
  panel.setAttribute('tabindex', '-1');
  const skip = document.createElement('button');
  skip.textContent = 'Skip';
  const next = document.createElement('button');
  next.textContent = 'Next';
  panel.append(skip, next);
  document.body.appendChild(panel);
  return { panel, skip, next };
}

function keydownTab(shiftKey: boolean): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true, bubbles: true });
}

beforeEach(() => disposeStrays(document));

test('the panel\'s focusable set is Back, Skip, Next in DOM order -- the dots div is not a tab stop', () => {
  const { panel, back, skip, next } = buildPanel();
  assert.deepEqual(arenaFocusableElements(panel), [back, skip, next]);
});

test('opening moves focus onto Back, so a keyboard user reaches Next in two keys rather than tabbing the whole page', () => {
  const trigger = document.createElement('button');
  trigger.textContent = 'Start tour';
  document.body.appendChild(trigger);
  trigger.focus();

  const { panel, back } = buildPanel();
  const state: FocusTrapState = { wasOpen: false, restoreTo: null };
  arenaHandleOpenTransition(state, true, panel, document.activeElement);

  assertSameNode(document.activeElement, back, 'opening must move focus into the panel');
  assert.equal(state.restoreTo, trigger, 'the element focused before opening must be remembered');
  assert.equal(state.wasOpen, true);
});

test('on the first step, where the template omits Back, opening focuses Skip instead', () => {
  const { panel, skip } = buildFirstStepPanel();
  arenaFocusFirstFocusable(panel);
  assertSameNode(document.activeElement, skip);
});

test('closing restores focus to whatever opened the tour, not to whatever was focused at close time', () => {
  const trigger = document.createElement('button');
  trigger.textContent = 'Start tour';
  document.body.appendChild(trigger);
  trigger.focus();

  const { panel, next } = buildPanel();
  const state: FocusTrapState = { wasOpen: false, restoreTo: null };
  arenaHandleOpenTransition(state, true, panel, document.activeElement);

  next.focus();
  assertSameNode(document.activeElement, next);

  arenaHandleOpenTransition(state, false, panel, document.activeElement);

  assertSameNode(document.activeElement, trigger, 'closing must restore the pre-open element');
  assert.equal(state.restoreTo, null, 'the remembered element must be cleared once restored');
  assert.equal(state.wasOpen, false);
});

test('advancing a step re-runs the transition with open unchanged, and must not yank focus back to Back', () => {
  const { panel, next } = buildPanel();
  const state: FocusTrapState = { wasOpen: false, restoreTo: null };
  arenaHandleOpenTransition(state, true, panel, document.activeElement);

  next.focus();
  arenaHandleOpenTransition(state, true, panel, document.activeElement);

  assertSameNode(document.activeElement, next, 'a same-state re-run must leave focus where the user put it');
});

test('Tab from Next wraps to Back instead of reaching the page behind the scrim -- the whole point of the trap', () => {
  const behind = buildPageBehind();
  const { panel, back, next } = buildPanel();
  next.focus();

  const event = keydownTab(false);
  arenaTrapTabKey(panel, event, document.activeElement);

  assertSameNode(document.activeElement, back, 'Tab from the last control must wrap to the first');
  assertNotSameNode(document.activeElement, behind, 'focus must never escape an aria-modal panel');
  assert.ok(event.defaultPrevented, 'the boundary Tab must be consumed, or the browser also moves focus');
});

test('Shift+Tab from Back wraps to Next rather than escaping backwards out of the panel', () => {
  const behind = buildPageBehind();
  const { panel, back, next } = buildPanel();
  back.focus();

  const event = keydownTab(true);
  arenaTrapTabKey(panel, event, document.activeElement);

  assertSameNode(document.activeElement, next);
  assertNotSameNode(document.activeElement, behind);
  assert.ok(event.defaultPrevented);
});

test('Tab from Skip, a middle control, is left to the browser -- the trap only acts at a boundary', () => {
  const { panel, skip } = buildPanel();
  skip.focus();

  const event = keydownTab(false);
  arenaTrapTabKey(panel, event, document.activeElement);

  assertSameNode(document.activeElement, skip, 'the trap must not move focus away from a non-boundary control');
  assert.ok(!event.defaultPrevented);
});
