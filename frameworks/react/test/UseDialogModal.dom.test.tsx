import test from 'node:test';
import assert from 'node:assert/strict';
import React, { StrictMode, createRef, useState } from 'react';
import { mount, cleanup, act } from './Harness.tsx';
import { arenaFocusableElements, arenaFocusFirstFocusable, arenaTrapTabKey, useArenaDialogModal } from '../UseDialogModal.ts';

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
