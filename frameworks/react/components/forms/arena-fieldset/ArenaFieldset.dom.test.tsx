/* The group pattern requires the role alone, because ARIA 1.2 requires no name for a group, so
 * the name this component promises is asserted here by hand: the first legend child, which is how
 * HTML-AAM names a fieldset, and no aria-labelledby beside it. The disabled cascade is the
 * platform's and happy-dom does not compute it (an input inside a disabled fieldset still fails
 * :disabled there), so what is asserted is its precondition: the attribute on a real fieldset that
 * holds every control. A browser is the proof, listed in the prompt. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { ArenaFieldset } from './ArenaFieldset.tsx';
import { ArenaCheckbox } from '../arena-checkbox/ArenaCheckbox.tsx';
import { ArenaInput } from '../arena-input/ArenaInput.tsx';

afterEach(cleanup);

const BINDING = join(REACT_COMPONENTS, 'forms/arena-fieldset/ArenaFieldset.behaviour.json');

function render(props: Partial<React.ComponentProps<typeof ArenaFieldset>> = {}) {
  return mount(
    <ArenaFieldset legend="Notifications" {...props}>
      <ArenaCheckbox label="Deploys" name="notify" value="deploys" />
      <ArenaInput label="Digest address" />
    </ArenaFieldset>,
  );
}

test('ArenaFieldset meets the group pattern, named by its legend and nothing else', () => {
  const root = render();
  const fieldset = root.querySelector('fieldset');
  assert.ok(fieldset, 'sanity: nothing rendered the fieldset');
  assert.equal(fieldset.firstElementChild?.tagName, 'LEGEND');
  assert.equal(fieldset.firstElementChild?.textContent, 'Notifications');
  assert.equal(fieldset.hasAttribute('aria-labelledby'), false, 'the legend is the name; no reference is written beside it');
  assert.equal(fieldset.hasAttribute('aria-label'), false);
  assertPattern({ root, bindingPath: BINDING, subjects: { default: fieldset } });
});

test('disabled sits on the real fieldset that holds every native control, which is what the platform cascades', () => {
  const root = render({ disabled: true });
  const fieldset = root.querySelector('fieldset')!;
  assert.equal(fieldset.disabled, true);
  const inputs = [...root.querySelectorAll('input')];
  assert.equal(inputs.length, 2);
  for (const input of inputs) assert.equal(input.closest('fieldset[disabled]'), fieldset, `${input.type} sits outside the disabled set`);
  cleanup();
  assert.equal(render().querySelector('fieldset')!.hasAttribute('disabled'), false);
});

test('the hint is the set\'s description, and the error replaces it with the glyph inside its line', () => {
  const hinted = render({ hint: 'At most once a day.' }).querySelector('fieldset')!;
  const hintId = hinted.getAttribute('aria-describedby');
  assert.ok(hintId);
  assert.equal(hinted.ownerDocument.getElementById(hintId)?.textContent, 'At most once a day.');
  cleanup();

  const failed = render({ hint: 'At most once a day.', error: 'Choose at least one.' }).querySelector('fieldset')!;
  const errorId = failed.getAttribute('aria-describedby')!;
  const line = failed.ownerDocument.getElementById(errorId)!;
  assert.equal(line.textContent, 'Choose at least one.');
  assert.equal(line.querySelector('i')?.getAttribute('aria-hidden'), 'true');
  assert.equal(failed.textContent?.includes('At most once a day.'), false, 'the error wins over the hint');
  assert.equal(failed.hasAttribute('aria-invalid'), false, 'aria-invalid is not supported on a group');
  cleanup();

  assert.equal(render().querySelector('fieldset')!.hasAttribute('aria-describedby'), false);
});

test('two fieldsets on one page describe themselves by ids that differ', () => {
  const root = mount(
    <>
      <ArenaFieldset legend="One" hint="First"><ArenaCheckbox label="A" /></ArenaFieldset>
      <ArenaFieldset legend="Two" hint="Second"><ArenaCheckbox label="B" /></ArenaFieldset>
    </>,
  );
  const [a, b] = [...root.querySelectorAll('fieldset')].map((f) => f.getAttribute('aria-describedby'));
  assert.ok(a && b);
  assert.notEqual(a, b);
});
