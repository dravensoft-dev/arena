/* The three state requirements of `textbox` are BEHAVIOURAL: no snapshot decides
 * them, because a control that is correctly editable carries no readonly marker
 * at all. So each verdict below is earned by rendering BOTH polarities and
 * asserting the reflection tracks the member -- a suite that rendered only the
 * readonly one could not tell a component that reflects the state from one that
 * hardcodes it. Native readonly/required/multiline map to their ARIA states, so
 * the assertions read the native attributes rather than aria-* mirrors. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React from 'react';
import { mount, cleanup } from '../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../test/AssertPattern.tsx';
import { invalidVerdict } from '../../test/StateVerdicts.ts';
import { ArenaInput } from './arena-input/ArenaInput.tsx';
import { ArenaTextarea } from './arena-textarea/ArenaTextarea.tsx';

afterEach(cleanup);

const INPUT_BINDING = join(REACT_COMPONENTS, 'forms/arena-input/ArenaInput.behaviour.json');
const TEXTAREA_BINDING = join(REACT_COMPONENTS, 'forms/arena-textarea/ArenaTextarea.behaviour.json');

function reflects(render: (v: boolean) => React.ReactElement, selector: string, attribute: string) {
  const on = mount(render(true)).querySelector(selector);
  assert.equal(on!.hasAttribute(attribute), true,
    `the control does not carry ${attribute} when the member says it should`);
  const off = mount(render(false)).querySelector(selector);
  assert.equal(off!.hasAttribute(attribute), false,
    `the control carries ${attribute} while editable, so it is hardcoded rather than reflected`);
  return on;
}

test('ArenaInput reflects readonly and required, and is a single-line textbox', () => {
  reflects((v: boolean) => <ArenaInput label="Project" readOnly={v} />, 'input', 'readonly');
  reflects((v: boolean) => <ArenaInput label="Project" required={v} />, 'input', 'required');

  const root = mount(<ArenaInput label="Project" readOnly />);
  const el = root.querySelector<HTMLInputElement>('input');
  assert.equal(el!.hasAttribute('aria-multiline'), false,
    'the element type is the reflection here, so an explicit aria-multiline would be redundant');
  assert.ok(root.querySelector<HTMLElement>('label[for="' + el!.getAttribute('id') + '"]')!,
    'the name comes from a <label for>, which is the route roles.label has to resolve');

  assertPattern({
    root,
    bindingPath: INPUT_BINDING,
    subjects: { default: el },
    behavioural: {
      'states.readonly': true, 'states.required': true,
      'states.invalid': invalidVerdict(
        [mount(<ArenaInput label="Project" error="Taken" />).querySelector('input')!],
        [mount(<ArenaInput label="Project" />).querySelector('input')!],
      ),
    },
  });
});

test('ArenaTextarea reflects readonly and required, and is a multi-line textbox', () => {
  reflects((v: boolean) => <ArenaTextarea label="Notes" readOnly={v} />, 'textarea', 'readonly');
  reflects((v: boolean) => <ArenaTextarea label="Notes" required={v} />, 'textarea', 'required');

  const root = mount(<ArenaTextarea label="Notes" readOnly />);
  const el = root.querySelector<HTMLTextAreaElement>('textarea');
  assert.equal(el!.tagName, 'TEXTAREA',
    'multiline is carried by the element itself, which is why no aria-multiline is authored');
  assert.ok(root.querySelector<HTMLElement>('label[for="' + el!.getAttribute('id') + '"]')!,
    'the name comes from a <label for>, which is the route roles.label has to resolve');

  assertPattern({
    root,
    bindingPath: TEXTAREA_BINDING,
    subjects: { default: el },
    behavioural: {
      'states.readonly': true, 'states.required': true,
      'states.invalid': invalidVerdict(
        [mount(<ArenaTextarea label="Notes" error="Too short" />).querySelector('textarea')!],
        [mount(<ArenaTextarea label="Notes" />).querySelector('textarea')!],
      ),
    },
  });
});
