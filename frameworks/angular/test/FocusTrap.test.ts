/* The focus list holds one tab stop per radio group: the checked radio, or the first when none is
 * checked. A group is the radios sharing a form owner and a non-empty name, and an unnamed radio is
 * its own group. The trap reads the active element through the stop that stands for it, since focus
 * can sit on a radio the list does not hold. The file also covers the focusable list, the open and
 * close transitions and the boundary trap. */

import { ensureDom } from './TestbedEnv';
ensureDom();

import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { assertSameNode } from './NodeAssert';
import { disposeStrays } from './Overlays';
import {
  type FocusTrapState, arenaFocusFirstFocusable, arenaFocusableElements, arenaHandleOpenTransition, arenaHandleTeardown, arenaReclaimFocus, arenaRestoreOnTeardown, arenaTabStopOf, arenaTrapTabKey,
} from '../FocusTrap';

function buildPanel(): { panel: HTMLElement; input: HTMLElement; cancel: HTMLElement; confirm: HTMLElement; negative: HTMLElement } {
  const panel = document.createElement('div');
  panel.setAttribute('tabindex', '-1');
  const decoy = document.createElement('div');
  decoy.textContent = 'not focusable';
  const negative = document.createElement('button');
  negative.setAttribute('tabindex', '-1');
  negative.textContent = 'tabindex -1, must be skipped';
  const disabledButton = document.createElement('button');
  disabledButton.textContent = 'disabled, must be skipped';
  disabledButton.disabled = true;
  const input = document.createElement('input');
  const cancel = document.createElement('button');
  cancel.textContent = 'Cancel';
  const confirm = document.createElement('button');
  confirm.textContent = 'Confirm';
  panel.append(decoy, negative, disabledButton, input, cancel, confirm);
  document.body.appendChild(panel);
  return { panel, input, cancel, confirm, negative };
}

function keydownTab(shiftKey: boolean): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true, bubbles: true });
}

beforeEach(() => disposeStrays(document));

function panelWith(html: string): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

const ids = (list: readonly Element[]) => list.map((e) => e.id || e.textContent);

function tab(panel: HTMLElement, active: Element | null, shiftKey: boolean): boolean {
  const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
  arenaTrapTabKey(panel, event, active);
  return event.defaultPrevented;
}

test('one stop per radio group: the checked radio, or the first', () => {
  const p = panelWith('<button id="a">a</button>'
    + '<input type="radio" name="g" id="g1"><input type="radio" name="g" id="g2" checked>'
    + '<input type="radio" name="h" id="h1"><input type="radio" name="h" id="h2">'
    + '<input type="radio" id="u1"><input type="radio" id="u2">');
  assert.deepEqual(ids(arenaFocusableElements(p)), ['a', 'g2', 'h1', 'u1', 'u2']);
  p.remove();
});

test('one name in two forms is two groups', () => {
  const p = panelWith('<form><input type="radio" name="g" id="f1"></form>'
    + '<form><input type="radio" name="g" id="f2"></form>'
    + '<input type="radio" name="g" id="loose">');
  assert.deepEqual(ids(arenaFocusableElements(p)), ['f1', 'f2', 'loose']);
  p.remove();
});

test('a radio the form attribute gives to a form joins that form\'s group', () => {
  const p = panelWith('<form id="owner"><input type="radio" name="g" id="inside"></form>'
    + '<input type="radio" name="g" id="owned" form="owner" checked>'
    + '<input type="radio" name="g" id="loose">');
  assert.deepEqual(ids(arenaFocusableElements(p)), ['owned', 'loose']);
  p.remove();
});

test('a disabled checked radio leaves its group entered on the first enabled radio', () => {
  const p = panelWith('<input type="radio" name="g" id="r1"><input type="radio" name="g" id="r2" checked disabled>'
    + '<input type="radio" name="g" id="r3">');
  assert.deepEqual(ids(arenaFocusableElements(p)), ['r1']);
  p.remove();
});

test('Shift+Tab from the first stop lands on the last radio of an unchecked last group', () => {
  const p = panelWith('<button id="first">x</button><input type="radio" name="g" id="r1"><input type="radio" name="g" id="r2">');
  const first = p.querySelector<HTMLElement>('#first')!;
  first.focus();
  assert.equal(tab(p, first, true), true, 'the key at a boundary must be consumed');
  assertSameNode(document.activeElement, p.querySelector('#r2'), 'Shift+Tab did not reach the last radio of the group');
  p.remove();
});

test('Tab from any radio of the last group wraps to the first stop', () => {
  const p = panelWith('<button id="first">x</button><input type="radio" name="g" id="r1"><input type="radio" name="g" id="r2">');
  const r2 = p.querySelector<HTMLElement>('#r2')!;
  r2.focus();
  assert.equal(tab(p, r2, false), true, 'the key at a boundary must be consumed');
  assertSameNode(document.activeElement, p.querySelector('#first'), 'Tab from the last group did not wrap');
  p.remove();
});

test('arenaTabStopOf maps a radio to its group stop and leaves anything else alone', () => {
  const p = panelWith('<button id="a">a</button><input type="radio" name="g" id="g1"><input type="radio" name="g" id="g2" checked>'
    + '<input type="radio" name="x" id="x1" disabled>');
  const list = arenaFocusableElements(p);
  const at = (id: string) => p.querySelector(`#${id}`);
  assertSameNode(arenaTabStopOf(list, at('g1')), at('g2'));
  assertSameNode(arenaTabStopOf(list, at('g2')), at('g2'));
  assertSameNode(arenaTabStopOf(list, at('a')), at('a'));
  assertSameNode(arenaTabStopOf(list, at('x1')), at('x1'));
  assertSameNode(arenaTabStopOf(list, null), null);
  p.remove();
});

test('arenaReclaimFocus moves focus into the panel when it was dropped on the body', () => {
  const p = panelWith('<button id="a">a</button><button id="b">b</button>');
  (document.activeElement as HTMLElement | null)?.blur();
  arenaReclaimFocus(p);
  assertSameNode(document.activeElement, p.querySelector('#a'), 'focus dropped on the body must come back to the first control');
  p.remove();
});

test('arenaReclaimFocus leaves focus on a live control outside the panel', () => {
  const p = panelWith('<button id="a">a</button>');
  const popover = document.createElement('button');
  document.body.appendChild(popover);
  popover.focus();
  arenaReclaimFocus(p);
  assertSameNode(document.activeElement, popover, 'a live control outside the panel keeps focus');
  p.remove();
  popover.remove();
});

test('arenaRestoreOnTeardown restores only from inside the panel or nowhere, and only to a connected invoker', () => {
  const invoker = document.createElement('button');
  const outside = document.createElement('button');
  const p = panelWith('<button id="in">in</button>');
  document.body.append(invoker, outside);
  const inner = p.querySelector<HTMLElement>('#in')!;

  inner.focus();
  assert.equal(arenaRestoreOnTeardown(invoker, p, inner), true, 'focus inside the panel returns to the invoker');
  assertSameNode(document.activeElement, invoker);

  outside.focus();
  assert.equal(arenaRestoreOnTeardown(invoker, p, outside), false, 'a live control outside the panel keeps focus');
  assertSameNode(document.activeElement, outside);

  assert.equal(arenaRestoreOnTeardown(invoker, p, document.body), true, 'focus on the body returns to the invoker');
  assert.equal(arenaRestoreOnTeardown(invoker, p, null), true, 'no active element returns to the invoker');

  invoker.remove();
  assert.equal(arenaRestoreOnTeardown(invoker, p, null), false, 'a disconnected invoker is not focused');
  assert.equal(arenaRestoreOnTeardown(null, p, null), false, 'no invoker restores nothing');
  outside.remove();
  p.remove();
});

test('arenaHandleTeardown does nothing unless the modal was open, and resets the state when it was', () => {
  const invoker = document.createElement('button');
  document.body.appendChild(invoker);
  const closed: FocusTrapState = { wasOpen: false, restoreTo: invoker };
  arenaHandleTeardown(closed, null, null);
  assert.equal(closed.restoreTo, invoker, 'a closed modal keeps its state');

  const open: FocusTrapState = { wasOpen: true, restoreTo: invoker };
  arenaHandleTeardown(open, null, null);
  assertSameNode(document.activeElement, invoker, 'an open modal hands focus to its invoker');
  assert.equal(open.wasOpen, false);
  assert.equal(open.restoreTo, null);
  invoker.remove();
});

test('arenaFocusableElements finds only real, enabled, tabbable elements, in DOM order, skipping a disabled button, a tabindex=-1 element and a plain div', () => {
  const { panel, input, cancel, confirm, negative } = buildPanel();
  assert.deepEqual(arenaFocusableElements(panel), [input, cancel, confirm]);
  assert.ok(!arenaFocusableElements(panel).includes(negative), 'a tabindex="-1" element is focusable by script but not a tab stop');
});

test('arenaFocusFirstFocusable falls back to the panel itself when it has no focusable descendant', () => {
  const panel = document.createElement('div');
  panel.setAttribute('tabindex', '-1');
  document.body.appendChild(panel);
  arenaFocusFirstFocusable(panel);
  assertSameNode(document.activeElement, panel);
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

test('a panel with no focusable descendant, or a single one, traps the key outright, since there is nowhere legal for focus to go', () => {
  const panel = document.createElement('div');
  document.body.appendChild(panel);
  const event = keydownTab(false);
  arenaTrapTabKey(panel, event, document.activeElement);
  assert.ok(event.defaultPrevented);

  const single = document.createElement('div');
  const only = document.createElement('input');
  single.appendChild(only);
  document.body.appendChild(single);
  for (const shift of [false, true]) {
    only.focus();
    const consumed = tab(single, document.activeElement, shift);
    assertSameNode(document.activeElement, only, 'with one stop, first and last are the same element and focus stays on it');
    assert.ok(consumed, 'with one stop, the key must be consumed, or the browser would leave the panel');
  }
});

test('arenaHandleOpenTransition: opening captures the previously-focused element and moves focus into the panel', () => {
  const trigger = document.createElement('button');
  trigger.textContent = 'Open';
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

test('arenaHandleOpenTransition: a re-run with isOpen unchanged does not re-steal focus -- it must not fight the user typing into the panel', () => {
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
