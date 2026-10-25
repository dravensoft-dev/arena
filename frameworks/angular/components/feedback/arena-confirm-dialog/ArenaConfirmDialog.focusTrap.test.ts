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
import { isArenaConfirmLocked } from './ArenaConfirmDialog';

function buildPanel(): { panel: HTMLElement; input: HTMLElement; cancel: HTMLElement; confirm: HTMLElement } {
  const panel = document.createElement('div');
  panel.setAttribute('tabindex', '-1');
  const decoy = document.createElement('div');
  decoy.textContent = 'not focusable';
  const disabledButton = document.createElement('button');
  disabledButton.textContent = 'disabled, must be skipped';
  disabledButton.disabled = true;
  const input = document.createElement('input');
  const cancel = document.createElement('button');
  cancel.textContent = 'Cancel';
  const confirm = document.createElement('button');
  confirm.textContent = 'Confirm';
  panel.append(decoy, disabledButton, input, cancel, confirm);
  document.body.appendChild(panel);
  return { panel, input, cancel, confirm };
}

function keydownTab(shiftKey: boolean): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true, bubbles: true });
}

beforeEach(() => disposeStrays(document));

test('arenaFocusableElements finds only real, enabled, tabbable elements, in DOM order, skipping a disabled button and a plain div', () => {
  const { panel, input, cancel, confirm } = buildPanel();
  assert.deepEqual(arenaFocusableElements(panel), [input, cancel, confirm]);
});

test('arenaFocusFirstFocusable moves DOM focus to the panel\'s first focusable descendant', () => {
  const { panel, input } = buildPanel();
  assertNotSameNode(document.activeElement, input, 'sanity: nothing is focused yet');
  arenaFocusFirstFocusable(panel);
  assertSameNode(document.activeElement, input);
});

test('arenaFocusFirstFocusable falls back to the panel itself when it has no focusable descendant', () => {
  const panel = document.createElement('div');
  panel.setAttribute('tabindex', '-1');
  document.body.appendChild(panel);
  arenaFocusFirstFocusable(panel);
  assertSameNode(document.activeElement, panel);
});

test('Tab from the last focusable wraps to the first, and the key is consumed', () => {
  const { panel, input, confirm } = buildPanel();
  confirm.focus();
  assertSameNode(document.activeElement, confirm);
  const event = keydownTab(false);
  arenaTrapTabKey(panel, event, document.activeElement);
  assertSameNode(document.activeElement, input, 'Tab from the last element must wrap to the first');
  assert.ok(event.defaultPrevented, 'the boundary Tab must be prevented, or the browser would also move focus');
});

test('Shift+Tab from the first focusable wraps to the last, and the key is consumed', () => {
  const { panel, input, confirm } = buildPanel();
  input.focus();
  assertSameNode(document.activeElement, input);
  const event = keydownTab(true);
  arenaTrapTabKey(panel, event, document.activeElement);
  assertSameNode(document.activeElement, confirm, 'Shift+Tab from the first element must wrap to the last');
  assert.ok(event.defaultPrevented);
});

test('Tab away from a middle element is left alone -- the trap only intervenes at a boundary', () => {
  const { panel, cancel } = buildPanel();
  cancel.focus();
  const event = keydownTab(false);
  arenaTrapTabKey(panel, event, document.activeElement);
  assertSameNode(document.activeElement, cancel, 'the trap must not move focus away from a non-boundary element');
  assert.ok(!event.defaultPrevented, 'a non-boundary Tab must be left to the browser\'s own default handling');
});

test('a panel with no focusable descendant traps the key outright, since there is nowhere legal for focus to go', () => {
  const panel = document.createElement('div');
  document.body.appendChild(panel);
  const event = keydownTab(false);
  arenaTrapTabKey(panel, event, document.activeElement);
  assert.ok(event.defaultPrevented);
});

test('arenaHandleOpenTransition: opening captures the previously-focused element and moves focus into the panel', () => {
  const trigger = document.createElement('button');
  trigger.textContent = 'Delete project';
  document.body.appendChild(trigger);
  trigger.focus();
  assertSameNode(document.activeElement, trigger);

  const { panel, input } = buildPanel();
  const state: FocusTrapState = { wasOpen: false, restoreTo: null };
  arenaHandleOpenTransition(state, true, panel, document.activeElement);

  assertSameNode(document.activeElement, input, 'opening must move focus into the panel\'s first focusable element');
  assert.equal(state.restoreTo, trigger, 'the element that had focus before opening must be remembered');
  assert.equal(state.wasOpen, true);
});

test('arenaHandleOpenTransition: closing restores focus to the element remembered at open time', () => {
  const trigger = document.createElement('button');
  document.body.appendChild(trigger);
  trigger.focus();

  const { panel, confirm } = buildPanel();
  const state: FocusTrapState = { wasOpen: false, restoreTo: null };
  arenaHandleOpenTransition(state, true, panel, document.activeElement);

  confirm.focus();
  assertSameNode(document.activeElement, confirm);

  arenaHandleOpenTransition(state, false, panel, document.activeElement);

  assertSameNode(document.activeElement, trigger, 'closing must restore focus to the pre-open element, not to whatever was focused at close time');
  assert.equal(state.restoreTo, null, 'the remembered element must be cleared once restored, so a later close does not refocus it again');
  assert.equal(state.wasOpen, false);
});

test('arenaHandleOpenTransition: a re-run with isOpen unchanged does not re-steal focus -- it must not fight the user typing into the require-text field', () => {
  const trigger = document.createElement('button');
  document.body.appendChild(trigger);
  trigger.focus();

  const { panel, input, confirm } = buildPanel();
  const state: FocusTrapState = { wasOpen: false, restoreTo: null };
  arenaHandleOpenTransition(state, true, panel, document.activeElement);
  assertSameNode(document.activeElement, input);

  confirm.focus();
  arenaHandleOpenTransition(state, true, panel, document.activeElement);

  assertSameNode(document.activeElement, confirm, 'a same-state re-run must leave focus exactly where the user put it');
});

test('isArenaConfirmLocked: unset requireText never locks', () => {
  assert.equal(isArenaConfirmLocked(undefined, ''), false);
  assert.equal(isArenaConfirmLocked(undefined, 'anything'), false);
});

test('isArenaConfirmLocked: an empty-string requireText never locks either -- the divergence from a bare-truthiness check', () => {
  assert.equal(isArenaConfirmLocked('', ''), false);
  assert.equal(isArenaConfirmLocked('', 'anything typed'), false);
});

test('isArenaConfirmLocked: locks until the trimmed typed value matches exactly', () => {
  assert.equal(isArenaConfirmLocked('Ardennes', ''), true);
  assert.equal(isArenaConfirmLocked('Ardennes', 'wrong'), true);
  assert.equal(isArenaConfirmLocked('Ardennes', 'Ardennes'), false);
  assert.equal(isArenaConfirmLocked('Ardennes', '  Ardennes  '), false, 'surrounding whitespace in what was typed must be trimmed');
});
