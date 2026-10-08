/* The binding stays FLAT although a count of zero renders nothing at all: a
 * pattern cannot apply to an empty render, and the repo's precedent for a
 * renders-nothing branch is ArenaCommandPalette's closed state, which declares no case
 * either. What IS asserted below is that the roving stop is a stop -- exactly one
 * control in the Tab sequence at a time, and it follows focus rather than being
 * pinned to the first button. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { ArenaBulkActionBar } from './ArenaBulkActionBar.tsx';

afterEach(cleanup);

const BINDING = join(REACT_COMPONENTS, 'navigation/arena-bulk-action-bar/ArenaBulkActionBar.behaviour.json');

const ACTIONS = [
  { id: 'archive', label: 'Archive', icon: 'ph-bold ph-archive' },
  { id: 'retry', label: 'Retry' },
  { id: 'delete', label: 'Delete', destructive: true },
];

function press(el: Element, key: string) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  act(() => { el.dispatchEvent(event); });
  return event;
}

test('ArenaBulkActionBar is a toolbar with one tab stop, roved by the arrow keys', () => {
  const root = mount(<ArenaBulkActionBar count={3} actions={ACTIONS} onRun={() => {}} onClear={() => {}} />);
  const bar = root.querySelector<HTMLElement>('[role="toolbar"]');
  assert.ok(bar, 'the bar was not a toolbar');
  assert.equal(bar.getAttribute('aria-label'), 'Actions on the selection');

  const controls = [...bar.querySelectorAll<HTMLElement>('button')];
  assert.equal(controls.length, ACTIONS.length + 1, 'every action plus Clear is a toolbar control');

  const stops = () => bar.querySelectorAll<HTMLElement>('[tabindex="0"]');
  assert.equal(stops().length, 1, 'a toolbar is ONE tab stop');
  assert.equal(stops()[0], controls[0], 'entry must land on the first control');

  act(() => { controls[0]!.focus(); });
  const right = press(controls[0]!, 'ArrowRight');
  assert.equal(document.activeElement, controls[1], 'ArrowRight did not move to the next control');
  assert.equal(right.defaultPrevented, true, 'ArrowRight was not claimed by the toolbar');
  assert.equal(stops().length, 1, 'the stop did not rove -- two controls are in the Tab sequence');
  assert.equal(stops()[0], controls[1], 'the tab stop did not follow focus');

  press(controls[1]!, 'ArrowLeft');
  assert.equal(document.activeElement, controls[0], 'ArrowLeft did not move to the previous control');

  press(controls[0]!, 'ArrowLeft');
  assert.equal(document.activeElement, controls[controls.length - 1],
    'ArrowLeft from the first control did not wrap to the last');
  press(controls[controls.length - 1]!, 'ArrowRight');
  assert.equal(document.activeElement, controls[0], 'ArrowRight from the last control did not wrap to the first');

  assertPattern({
    root,
    bindingPath: BINDING,
    subjects: { default: bar },
    behavioural: { 'focus.roving': true, 'keyboard.ArrowRight': true, 'keyboard.ArrowLeft': true },
  });
});

test('an empty selection renders nothing, so there is no toolbar to name', () => {
  const root = mount(<ArenaBulkActionBar count={0} actions={ACTIONS} onRun={() => {}} />);
  assert.equal(root.querySelector<HTMLElement>('[role="toolbar"]')!, null,
    'a toolbar with no controls would be a labelled landmark over nothing');
  assert.equal(root.textContent, '', 'the bar must draw nothing at all when the selection is empty');
});
