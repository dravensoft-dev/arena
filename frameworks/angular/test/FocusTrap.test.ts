/* The focus list holds one tab stop per radio group: the checked radio, or the first when none is
 * checked. A group is the radios sharing a form owner and a non-empty name, and an unnamed radio is
 * its own group. The trap reads the active element through the stop that stands for it, since focus
 * can sit on a radio the list does not hold. */

import { ensureDom } from './TestbedEnv';
ensureDom();

import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSameNode } from './NodeAssert';
import {
  type FocusTrapState, arenaFocusableElements, arenaHandleTeardown, arenaReclaimFocus, arenaRestoreOnTeardown, arenaTabStopOf, arenaTrapTabKey,
} from '../FocusTrap';

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
