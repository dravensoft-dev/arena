/* The filter bar binds the group pattern, whose one requirement is the role; the name it promises is
 * asserted here directly. The rest is the one focus rule the bar owns: after the host drops a
 * removed chip, focus lands on the chip now in its place, else the last chip, else the first control
 * in content, and Clear all lands on the first control. A removal the host refuses moves nothing,
 * and the bar never takes focus from a control a person has moved to. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React, { useState } from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { ArenaFilterBar, type ArenaAppliedFilter } from './ArenaFilterBar.tsx';
import { ArenaSelect } from '../../forms/arena-select/ArenaSelect.tsx';
import { ArenaInput } from '../../forms/arena-input/ArenaInput.tsx';
import { ArenaSegmentedControl } from '../arena-segmented-control/ArenaSegmentedControl.tsx';
import { ArenaCombobox } from '../../forms/arena-combobox/ArenaCombobox.tsx';
import { ArenaMultiSelect } from '../../forms/arena-multi-select/ArenaMultiSelect.tsx';
import { ArenaFieldset } from '../../forms/arena-fieldset/ArenaFieldset.tsx';

afterEach(cleanup);

const BINDING = join(REACT_COMPONENTS, 'navigation/arena-filter-bar/ArenaFilterBar.behaviour.json');
const APPLIED: ArenaAppliedFilter[] = [
  { id: 'region', label: 'Region: Europe West' },
  { id: 'status', label: 'Status: Failed' },
  { id: 'owner', label: 'Owner: Platform' },
];
const OPTIONS = [{ value: 'eu', label: 'Europe West' }, { value: 'us', label: 'US East' }];

function render(first: React.ReactNode = <ArenaSelect label="Region" options={OPTIONS} />, refuse = false) {
  const removed: ArenaAppliedFilter[] = [];
  let cleared = 0;
  let answer: (next: ArenaAppliedFilter[]) => void = () => {};
  function Host() {
    const [applied, write] = useState(APPLIED);
    answer = write;
    return (
      <ArenaFilterBar label="Deployment filters" applied={applied}
        onRemove={(filter) => { removed.push(filter); if (!refuse) write(applied.filter((f) => f.id !== filter.id)); }}
        onClear={() => { cleared += 1; if (!refuse) write([]); }}>
        {first}
        <ArenaInput label="Search" />
      </ArenaFilterBar>
    );
  }
  const root = mount(<Host />);
  const closes = () => [...root.querySelectorAll<HTMLButtonElement>('[data-arena-part="tag.close"]')];
  const active = () => root.ownerDocument.activeElement;
  const press = (button: HTMLElement) => act(() => { button.focus(); button.click(); });
  const set = (next: ArenaAppliedFilter[]) => act(() => answer(next));
  return { root, closes, active, press, set, removed, cleared: () => cleared };
}

test('ArenaFilterBar meets the group pattern, named by its label', () => {
  const { root } = render();
  const group = root.querySelector('[data-arena-part="filter-bar"]')!;
  assert.equal(group.getAttribute('role'), 'group');
  assert.equal(group.getAttribute('aria-label'), 'Deployment filters');
  assertPattern({ root, bindingPath: BINDING, subjects: { default: group } });
});

test('a removal carries the whole filter, and focus lands on the chip now in its place', () => {
  const bar = render();
  bar.press(bar.closes()[0]!);
  assert.deepEqual(bar.removed, [APPLIED[0]]);
  assert.equal(bar.active(), bar.closes()[0]);
  assert.match(bar.closes()[0]!.parentElement!.textContent ?? '', /Status: Failed/);
});

test('removing the last chip lands on the chip before it', () => {
  const bar = render();
  bar.press(bar.closes()[2]!);
  assert.equal(bar.active(), bar.closes()[1]);
});

test('with no chip left, and after Clear all, focus lands on the first control in content', () => {
  const bar = render();
  for (let i = 0; i < 3; i += 1) bar.press(bar.closes()[0]!);
  assert.equal(bar.active(), bar.root.querySelector('select'));
  cleanup();
  const cleared = render();
  cleared.press(cleared.root.querySelector<HTMLButtonElement>('[data-arena-part="filter-bar.clear"]')!);
  assert.equal(cleared.cleared(), 1);
  assert.equal(cleared.active(), cleared.root.querySelector('select'));
});

test('the first control is the first tab stop of whichever control leads, roving or not', () => {
  const leads: [string, React.ReactNode, string][] = [
    ['select', <ArenaSelect label="Region" options={OPTIONS} />, 'select'],
    ['input', <ArenaInput label="Owner" />, 'input'],
    ['segmented', <ArenaSegmentedControl ariaLabel="Status" options={[{ value: 'all', label: 'All' }, { value: 'failed', label: 'Failed' }]} value="failed" />, 'input[type="radio"][value="failed"]'],
    ['combobox', <ArenaCombobox label="Team" options={OPTIONS} />, 'input[role="combobox"]'],
    ['multi-select', <ArenaMultiSelect label="Teams" options={OPTIONS} />, 'input[role="combobox"]'],
  ];
  for (const [name, lead, selector] of leads) {
    const bar = render(lead);
    bar.press(bar.root.querySelector<HTMLButtonElement>('[data-arena-part="filter-bar.clear"]')!);
    assert.equal(bar.active(), bar.root.querySelector(selector), name);
    cleanup();
  }
});

test('a removal the host refuses leaves focus on the chip it was asked from', () => {
  const bar = render(undefined, true);
  const target = bar.closes()[1]!;
  bar.press(target);
  assert.equal(bar.removed.length, 1);
  assert.equal(bar.closes().length, 3);
  assert.equal(bar.active(), target);
});

test('the bar adds no tab stop of its own: the controls, each remove button and Clear all, in reading order', () => {
  const { root } = render(<ArenaFieldset legend="Scope"><ArenaInput label="Owner" /></ArenaFieldset>);
  const stops = [...root.querySelectorAll<HTMLElement>('input, select, button')].filter((el) => el.getAttribute('tabindex') !== '-1');
  assert.deepEqual(stops.map((el) => el.getAttribute('data-arena-part')), ['input.input', 'input.input', 'tag.close', 'tag.close', 'tag.close', 'filter-bar.clear']);
});

test('a removal the host answers after the person moved to a control leaves focus in that control', () => {
  const bar = render(undefined, true);
  bar.press(bar.closes()[1]!);
  const select = bar.root.querySelector('select')!;
  act(() => { select.focus(); });
  bar.set(APPLIED.filter((filter) => filter.id !== 'status'));
  assert.equal(bar.closes().length, 2);
  assert.equal(bar.active(), select);
});

test('a removal the host answers after focus left the bar leaves focus outside it', () => {
  const bar = render(undefined, true);
  bar.press(bar.closes()[1]!);
  const away = bar.root.ownerDocument.createElement('button');
  bar.root.ownerDocument.body.appendChild(away);
  act(() => { away.focus(); });
  bar.set(APPLIED.filter((filter) => filter.id !== 'status'));
  assert.equal(bar.closes().length, 2);
  assert.equal(bar.active(), away);
  away.remove();
});

test('a late answer keeps focus on the chip the person chose after using a control', () => {
  const bar = render(undefined, true);
  bar.press(bar.closes()[0]!);
  act(() => { bar.root.querySelector('select')!.focus(); });
  const chosen = bar.closes()[2]!;
  act(() => { chosen.focus(); });
  bar.set(APPLIED.filter((filter) => filter.id !== 'region'));
  assert.equal(bar.closes().length, 2);
  assert.equal(bar.active(), chosen);
});
