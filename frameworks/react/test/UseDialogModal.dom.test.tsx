import test from 'node:test';
import assert from 'node:assert/strict';
import React, { StrictMode, createRef, useState } from 'react';
import { mount, cleanup, act } from './Harness.tsx';
import { arenaFocusableElements, arenaFocusFirstFocusable, arenaReclaimFocus, arenaRestoreOnTeardown, arenaTabStopOf, arenaTrapTabKey, useArenaDialogModal } from '../UseDialogModal.ts';

function panelWith(html: string) {
  const el = document.createElement('div');
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

test('arenaFocusableElements skips a native control marked tabindex="-1"', () => {
  const p = panelWith('<button>a</button><button tabindex="-1">b</button><button>c</button>');
  assert.deepEqual(arenaFocusableElements(p).map((e) => e.textContent), ['a', 'c']);
});

test('arenaFocusableElements skips a disabled control', () => {
  const p = panelWith('<button>a</button><button disabled>b</button>');
  assert.deepEqual(arenaFocusableElements(p).map((e) => e.textContent), ['a']);
});

test('arenaFocusFirstFocusable falls back to the panel itself when it has none', () => {
  const p = panelWith('<p>text only</p>');
  p.setAttribute('tabindex', '-1');
  arenaFocusFirstFocusable(p);
  assert.equal(document.activeElement, p, 'a panel with no focusable child must take focus itself');
});

test('arenaTrapTabKey wraps Shift+Tab from the first focusable to the last', () => {
  const p = panelWith('<button>a</button><button>b</button><button>c</button>');
  const [first, , last] = arenaFocusableElements(p);
  first!.focus();
  let prevented = false;
  arenaTrapTabKey(p!, { key: 'Tab', shiftKey: true, preventDefault: () => { prevented = true; } }, first ?? null);
  assert.equal(prevented, true, 'the key at a boundary must be consumed');
  assert.equal(document.activeElement, last, 'Shift+Tab from the first did not wrap to the last');
});

test('arenaTrapTabKey wraps Tab from the last focusable to the first', () => {
  const p = panelWith('<button>a</button><button>b</button><button>c</button>');
  const [first, , last] = arenaFocusableElements(p);
  last!.focus();
  arenaTrapTabKey(p!, { key: 'Tab', shiftKey: false, preventDefault: () => {} }, last ?? null);
  assert.equal(document.activeElement, first, 'Tab from the last did not wrap to the first');
});

test('arenaTrapTabKey leaves a middle element alone -- the browser does that part', () => {
  const p = panelWith('<button>a</button><button>b</button><button>c</button>');
  const [, middle] = arenaFocusableElements(p);
  middle!.focus();
  arenaTrapTabKey(p!, { key: 'Tab', shiftKey: false, preventDefault: () => {} }, middle ?? null);
  assert.equal(document.activeElement, middle,
    'the trap must not move focus off a middle element -- native sequential navigation owns that');
});

test('the invoker is remembered once, so a double-invoked effect does not restore to the panel', () => {
  const invoker = document.createElement('button');
  invoker.textContent = 'open';
  document.body.appendChild(invoker);
  invoker.focus();

  const panel = document.createElement('div');
  panel.innerHTML = '<button>close</button>';
  document.body.appendChild(panel);
  const panelRef = createRef<HTMLElement>();
  (panelRef as { current: HTMLElement | null }).current = panel;

  let setOpen: ((next: boolean) => void) | null = null;
  function Host() {
    const [open, set] = useState(true);
    setOpen = set;
    useArenaDialogModal({ open, panelRef });
    return null;
  }

  mount(<StrictMode><Host /></StrictMode>);
  act(() => { setOpen?.(false); });

  assert.equal(document.activeElement, invoker,
    'StrictMode mounts the effect twice: the second pass reads activeElement after the first has '
    + 'already moved focus into the panel, so an unguarded capture stores the close button and '
    + 'closing returns focus to an element that is going away');

  cleanup();
  invoker.remove();
  panel.remove();
});

const ids = (list: readonly Element[]) => list.map((e) => e.id || e.textContent);
const tab = (p: HTMLElement, active: Element | null, shiftKey: boolean) => {
  let prevented = false;
  arenaTrapTabKey(p, { key: 'Tab', shiftKey, preventDefault: () => { prevented = true; } }, active);
  return prevented;
};

test('one stop per radio group: the checked radio, or the first', () => {
  const p = panelWith('<button id="a">a</button>'
    + '<input type="radio" name="g" id="g1"><input type="radio" name="g" id="g2" checked>'
    + '<input type="radio" name="h" id="h1"><input type="radio" name="h" id="h2">'
    + '<input type="radio" id="u1"><input type="radio" id="u2">');
  assert.deepEqual(ids(arenaFocusableElements(p)), ['a', 'g2', 'h1', 'u1', 'u2']);
});

test('one name in two forms is two groups', () => {
  const p = panelWith('<form><input type="radio" name="g" id="f1"></form>'
    + '<form><input type="radio" name="g" id="f2"></form>'
    + '<input type="radio" name="g" id="loose">');
  assert.deepEqual(ids(arenaFocusableElements(p)), ['f1', 'f2', 'loose']);
});

test('Shift+Tab from the first stop lands on the last radio of an unchecked last group', () => {
  const p = panelWith('<button id="first">x</button><input type="radio" name="g" id="r1"><input type="radio" name="g" id="r2">');
  const first = p.querySelector<HTMLElement>('#first')!;
  first.focus();
  assert.equal(tab(p, first, true), true, 'the key at a boundary must be consumed');
  assert.equal(document.activeElement, p.querySelector('#r2'), 'Shift+Tab did not reach the last radio of the group');
});

test('Tab from any radio of the last group wraps to the first stop', () => {
  const p = panelWith('<button id="first">x</button><input type="radio" name="g" id="r1"><input type="radio" name="g" id="r2">');
  const r2 = p.querySelector<HTMLElement>('#r2')!;
  r2.focus();
  assert.equal(tab(p, r2, false), true, 'the key at a boundary must be consumed');
  assert.equal(document.activeElement, p.querySelector('#first'), 'Tab from the last group did not wrap');
});

test('arenaTabStopOf maps a radio to its group stop and leaves anything else alone', () => {
  const p = panelWith('<button id="a">a</button><input type="radio" name="g" id="g1"><input type="radio" name="g" id="g2" checked>'
    + '<input type="radio" name="x" id="x1" disabled>');
  const list = arenaFocusableElements(p);
  const at = (id: string) => p.querySelector(`#${id}`)!;
  assert.equal(arenaTabStopOf(list, at('g1')), at('g2'));
  assert.equal(arenaTabStopOf(list, at('g2')), at('g2'));
  assert.equal(arenaTabStopOf(list, at('a')), at('a'));
  assert.equal(arenaTabStopOf(list, at('x1')), at('x1'));
  assert.equal(arenaTabStopOf(list, null), null);
});

test('arenaReclaimFocus moves focus into the panel when it was dropped on the body', () => {
  const p = panelWith('<button id="a">a</button><button id="b">b</button>');
  (document.activeElement as HTMLElement | null)?.blur();
  arenaReclaimFocus(p);
  assert.equal(document.activeElement, p.querySelector('#a'), 'focus dropped on the body must come back to the first control');
  p.remove();
});

test('arenaReclaimFocus leaves focus on a live control outside the panel', () => {
  const p = panelWith('<button id="a">a</button>');
  const popover = document.createElement('button');
  document.body.appendChild(popover);
  popover.focus();
  arenaReclaimFocus(p);
  assert.equal(document.activeElement, popover, 'a live control outside the panel keeps focus');
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
  assert.equal(document.activeElement, invoker);

  outside.focus();
  assert.equal(arenaRestoreOnTeardown(invoker, p, outside), false, 'a live control outside the panel keeps focus');
  assert.equal(document.activeElement, outside);

  (document.activeElement as HTMLElement).blur();
  assert.equal(arenaRestoreOnTeardown(invoker, p, document.body), true, 'focus on the body returns to the invoker');
  assert.equal(arenaRestoreOnTeardown(invoker, p, null), true, 'no active element returns to the invoker');

  invoker.remove();
  assert.equal(arenaRestoreOnTeardown(invoker, p, null), false, 'a disconnected invoker is not focused');
  assert.equal(arenaRestoreOnTeardown(null, p, null), false, 'no invoker restores nothing');
  outside.remove();
  p.remove();
});
