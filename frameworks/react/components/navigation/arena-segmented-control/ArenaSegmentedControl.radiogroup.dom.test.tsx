/* Like ArenaRadioGroup, this control is native radios in disguise: each segment wraps
 * an <input type="radio"> the styling hides, so the roving tab stop, the arrow
 * keys and Space are the PLATFORM's and happy-dom implements none of them. What
 * is asserted is the structural precondition the browser needs -- one shared
 * name, exactly one checked, and no authored tabindex fighting the native stop --
 * and the behaviour itself is left to the by-hand check on the card page. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { ArenaSegmentedControl } from './ArenaSegmentedControl.tsx';

afterEach(cleanup);

const BINDING = join(REACT_COMPONENTS, 'navigation/arena-segmented-control/ArenaSegmentedControl.behaviour.json');

const OPTIONS = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

test('ArenaSegmentedControl is a named radiogroup over native radios', () => {
  const root = mount(
    <ArenaSegmentedControl ariaLabel="Time range" name="range" options={OPTIONS} value="7d" onValueChange={() => {}} />,
  );
  const group = root.querySelector<HTMLElement>('[role="radiogroup"]');
  assert.equal(group!.getAttribute('aria-label'), 'Time range',
    'the group names what is being filtered; each segment names only itself');

  const radios = [...root.querySelectorAll<HTMLElement>('input[type="radio"]')];
  assert.equal(radios.length, OPTIONS.length, 'one native radio per option');

  const names = new Set(radios.map((r) => r.getAttribute('name')));
  assert.equal(names.size, 1, 'one shared name is what makes the browser treat these as ONE tab stop');
  assert.equal(names.has('range'), true, 'the shared name must be the one the caller supplied');

  assert.equal(radios.filter((r) => (r as HTMLInputElement).checked).length, 1, 'exactly one option may be checked');
  assert.equal((radios[1] as HTMLInputElement).checked, true, 'the checked option must be the one matching `value`');

  assert.equal(group!.querySelectorAll<HTMLElement>('[tabindex]').length, 0,
    'Arena must author no tabindex here -- it would fight the roving stop the browser already gives');

  assertPattern({
    root,
    bindingPath: BINDING,
    subjects: { default: group, 'roles.item': radios[0], 'states.checked': radios },
    behavioural: { 'focus.roving': true, 'keyboard.ArrowKeys': true, 'keyboard.Space': true },
  });
});

test('a segment reports its own value, not a DOM event', () => {
  let picked = null;
  const root = mount(
    <ArenaSegmentedControl ariaLabel="Time range" options={OPTIONS} value="7d" onValueChange={(v) => { picked = v; }} />,
  );
  const radios = [...root.querySelectorAll<HTMLElement>('input[type="radio"]')];
  radios[2]!.click();
  assert.equal(picked, '30d', 'choosing a segment must report the option value alone');
});
