import { ensureDom } from '../../../test/TestbedEnv';
ensureDom();

import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { assertNotSameNode, assertSameNode } from '../../../test/NodeAssert';
import { disposeStrays } from '../../../test/Overlays';
import { type FocusTrapState, arenaHandleOpenTransition, arenaTrapTabKey } from '../../../FocusTrap';

beforeEach(() => disposeStrays(document));

function buildPalettePanel(rowCount: number): { panel: HTMLElement; input: HTMLElement; rows: HTMLElement[] } {
  const panel = document.createElement('div');
  const input = document.createElement('input');
  const rows = Array.from({ length: rowCount }, (_, i) => {
    const row = document.createElement('button');
    row.setAttribute('tabindex', '-1');
    row.textContent = `row ${i}`;
    return row;
  });
  panel.append(input, ...rows);
  document.body.appendChild(panel);
  return { panel, input, rows };
}

function keydownTab(shiftKey: boolean): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true, bubbles: true });
}

test('opening the palette moves DOM focus into the search input, with no reliance on the autofocus attribute', () => {
  const trigger = document.createElement('button');
  trigger.textContent = 'Open palette (Cmd+K)';
  document.body.appendChild(trigger);
  trigger.focus();
  assertSameNode(document.activeElement, trigger, 'sanity: focus starts on the trigger, as it would after a keyboard shortcut');

  const { panel, input } = buildPalettePanel(3);
  const state: FocusTrapState = { wasOpen: false, restoreTo: null };
  arenaHandleOpenTransition(state, true, panel, document.activeElement);

  assertSameNode(document.activeElement, input, 'opening must move focus into the search input, never into a tabindex="-1" row');
});

test('closing the palette restores focus to whatever opened it, which is beyond what combobox requires', () => {
  const trigger = document.createElement('button');
  document.body.appendChild(trigger);
  trigger.focus();

  const { panel } = buildPalettePanel(2);
  const state: FocusTrapState = { wasOpen: false, restoreTo: null };
  arenaHandleOpenTransition(state, true, panel, document.activeElement);
  arenaHandleOpenTransition(state, false, panel, document.activeElement);

  assertSameNode(document.activeElement, trigger, 'closing must restore focus to the element that opened the palette');
});

test('Tab from the search input is trapped in place -- there is no other legal Tab stop in the panel', () => {
  const { panel, input } = buildPalettePanel(3);
  input.focus();
  const event = keydownTab(false);
  arenaTrapTabKey(panel, event, document.activeElement);
  assertSameNode(document.activeElement, input, 'Tab must not move focus off the search input');
  assert.ok(event.defaultPrevented, 'the key must be consumed, or the browser would move focus to the page behind the scrim');
});

test('Shift+Tab from the search input is trapped the same way', () => {
  const { panel, input } = buildPalettePanel(3);
  input.focus();
  const event = keydownTab(true);
  arenaTrapTabKey(panel, event, document.activeElement);
  assertSameNode(document.activeElement, input);
  assert.ok(event.defaultPrevented);
});

test('Tab can never reach a control behind the scrim -- the exact failure the review named', () => {
  const behind = document.createElement('button');
  behind.textContent = 'page control behind the scrim';
  document.body.appendChild(behind);

  const { panel, input } = buildPalettePanel(2);
  input.focus();
  const event = keydownTab(false);
  arenaTrapTabKey(panel, event, document.activeElement);

  assertNotSameNode(document.activeElement, behind, 'focus must never escape to a control behind the scrim');
  assertSameNode(document.activeElement, input);
});
