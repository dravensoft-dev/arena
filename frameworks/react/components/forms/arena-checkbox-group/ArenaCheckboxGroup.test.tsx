/* Static markup: the guards, the injection a group does into its boxes, and the column it draws
 * from ArenaCheckbox's manifest. Toggling is the DOM suite's. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaCheckboxGroup } from './ArenaCheckboxGroup.tsx';
import { ArenaCheckbox } from '../arena-checkbox/ArenaCheckbox.tsx';

const render = (element: React.ReactElement) => renderToStaticMarkup(element);

test('a blank ariaLabel throws, after trimming', () => {
  assert.throws(() => render(<ArenaCheckboxGroup ariaLabel="   " />), /^Error: ArenaCheckboxGroup: `ariaLabel` is required/);
});

test('a box with no value throws inside a group, naming the box', () => {
  assert.throws(() => render(<ArenaCheckboxGroup ariaLabel="Notify me about"><ArenaCheckbox label="Deploys" /></ArenaCheckboxGroup>),
    /^Error: ArenaCheckbox: `value` is required inside an ArenaCheckboxGroup/);
});

test('a child that is not a box is left as it is, so only a box is asked for a value', () => {
  const html = render(<ArenaCheckboxGroup ariaLabel="Notify me about"><span>Pick any</span><ArenaCheckbox value="a" label="A" /></ArenaCheckboxGroup>);
  assert.match(html, /<span>Pick any<\/span>/);
});

test('the group ticks the boxes its value names and overrides a box\'s own checked', () => {
  const html = render(
    <ArenaCheckboxGroup ariaLabel="Notify me about" name="notify" value={['incidents']}>
      <ArenaCheckbox value="deploys" label="Deploys" checked />
      <ArenaCheckbox value="incidents" label="Incidents" />
    </ArenaCheckboxGroup>,
  );
  const inputs = html.match(/<input[^>]*>/g) ?? [];
  assert.equal(inputs.length, 2);
  assert.doesNotMatch(inputs[0]!, /checked/);
  assert.match(inputs[1]!, /checked/);
  for (const input of inputs) assert.match(input, /name="notify"/);
});

test('the group draws its own column from ArenaCheckbox\'s manifest and names itself', () => {
  const html = render(<ArenaCheckboxGroup ariaLabel="Notify me about"><ArenaCheckbox value="a" label="A" /></ArenaCheckboxGroup>);
  assert.match(html, /^<div role="group" aria-label="Notify me about" class="arena-checkbox__group" data-arena-part="checkbox.group" data-arena-boundary="">/);
});

test('a box outside a group renders as a lone checkbox', () => {
  assert.equal(render(<ArenaCheckbox label="Deploys" />),
    '<label class="arena-checkbox__root" data-arena-part="checkbox"><span class="arena-checkbox__box" data-arena-part="checkbox.box"></span>'
    + '<span class="arena-checkbox__label" data-arena-part="checkbox.label">Deploys</span>'
    + '<input type="checkbox" class="arena-checkbox__input" data-arena-part="checkbox.input"/></label>');
});
