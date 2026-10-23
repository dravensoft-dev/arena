/* Tab order and Space are the PLATFORM's: each native checkbox is its own tab stop and toggles
 * on Space, and happy-dom implements neither, so a test pressing them would pass against a
 * broken group as well as a working one. What is asserted is the structural precondition (one
 * role="group" carrying the name, one shared form name, no tabindex Arena authored) and the
 * set the group reports, which is Arena's own arithmetic. The walk is a by-hand check. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React from 'react';
import { mount, cleanup, act } from '../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../test/AssertPattern.tsx';
import { ArenaCheckboxGroup } from './arena-checkbox-group/ArenaCheckboxGroup.tsx';
import { ArenaCheckbox } from './arena-checkbox/ArenaCheckbox.tsx';
import type { ArenaValueSet } from '../../Api.generated';

afterEach(cleanup);

const BINDING = join(REACT_COMPONENTS, 'forms/arena-checkbox-group/ArenaCheckboxGroup.behaviour.json');

function Controlled({ start, seen, own, log }: { start: string[]; seen: ArenaValueSet[]; own?: (checked: boolean) => void; log?: string[] }) {
  const [values, setValues] = React.useState<readonly string[]>(start);
  return (
    <ArenaCheckboxGroup ariaLabel="Notify me about" name="notify" value={values}
      onChange={(set) => { seen.push(set); log?.push('group'); setValues(set.values); }}>
      <ArenaCheckbox value="deploys" label="Deploys" onChange={own} />
      <ArenaCheckbox value="incidents" label="Incidents" />
      <ArenaCheckbox value="digest" label="Weekly digest" />
    </ArenaCheckboxGroup>
  );
}

const boxes = (root: ParentNode) => [...root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
const toggle = (box: HTMLInputElement) => act(() => { box.click(); });

test('ArenaCheckboxGroup meets the group pattern, and the platform gets what it needs', () => {
  const root = mount(<Controlled start={['incidents']} seen={[]} />);
  const group = root.querySelector<HTMLElement>('[role="group"]');
  assert.ok(group, 'sanity: nothing rendered the group');
  assert.equal(group.getAttribute('aria-label'), 'Notify me about');
  const inputs = boxes(root);
  assert.equal(inputs.length, 3);
  assert.deepEqual([...new Set(inputs.map((input) => input.name))], ['notify'], 'one shared form name');
  assert.deepEqual(inputs.map((input) => input.checked), [false, true, false]);
  assert.equal(root.querySelectorAll('[tabindex]').length, 0, 'every box keeps its own native tab stop');
  assertPattern({ root, bindingPath: BINDING, subjects: { default: group } });
});

test('the set is reported in the order it was ticked, once per toggle, with the item\'s own handler first', () => {
  const seen: ArenaValueSet[] = [];
  const order: string[] = [];
  const root = mount(<Controlled start={[]} seen={seen} own={() => order.push('item')} log={order} />);
  const [deploys, incidents, digest] = boxes(root);
  toggle(digest!);
  toggle(deploys!);
  toggle(incidents!);
  toggle(deploys!);
  assert.deepEqual(seen.map((set) => set.values), [
    ['digest'], ['digest', 'deploys'], ['digest', 'deploys', 'incidents'], ['digest', 'incidents'],
  ]);
  assert.deepEqual(boxes(root).map((input) => input.checked), [false, true, true]);
  assert.deepEqual(order, ['group', 'item', 'group', 'group', 'item', 'group'],
    'on each of the item\'s two toggles its own onChange fires before the group\'s');
});

test('a value that matches no box is kept, not filtered', () => {
  const seen: ArenaValueSet[] = [];
  const root = mount(<Controlled start={['retired']} seen={seen} />);
  toggle(boxes(root)[1]!);
  assert.deepEqual(seen[0]?.values, ['retired', 'incidents']);
});

test('an omitted name is generated, shared by every box, and differs between two groups', () => {
  const root = mount(
    <>
      <ArenaCheckboxGroup ariaLabel="One"><ArenaCheckbox value="a" label="A" /><ArenaCheckbox value="b" label="B" /></ArenaCheckboxGroup>
      <ArenaCheckboxGroup ariaLabel="Two"><ArenaCheckbox value="a" label="A" /></ArenaCheckboxGroup>
    </>,
  );
  const [first, second] = [...root.querySelectorAll('[role="group"]')].map((group) => [...new Set(boxes(group).map((input) => input.name))]);
  assert.equal(first?.length, 1);
  assert.ok(first?.[0]);
  assert.doesNotMatch(first![0]!, /:/, 'a generated name carries no colon');
  assert.notEqual(first?.[0], second?.[0]);
});
