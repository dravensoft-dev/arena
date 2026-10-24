/* Five controls whose bindings claimed a pattern with nothing rendering them.
 * Each pattern's keyboard clause belongs to the PLATFORM here -- a native
 * <button> answers Enter and Space, a native checkbox answers Space -- so what is
 * asserted is that Arena does not INTERCEPT the key, the same honesty the
 * radiogroup and ArenaMenu suites use. Dispatching a key happy-dom will not turn into
 * a click would prove nothing either way. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React from 'react';
import { mount, cleanup, act } from '../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../test/AssertPattern.tsx';
import { ArenaButton } from './arena-button/ArenaButton.tsx';
import { ArenaIconButton } from './arena-icon-button/ArenaIconButton.tsx';
import { ArenaCheckbox } from './arena-checkbox/ArenaCheckbox.tsx';
import { ArenaSelect } from './arena-select/ArenaSelect.tsx';
import { ArenaSwitch } from './arena-switch/ArenaSwitch.tsx';

afterEach(cleanup);

function assertKeysUnintercepted(el: Element, keys: string[]) {
  for (const key of keys) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    act(() => { el.dispatchEvent(event); });
    assert.equal(event.defaultPrevented, false,
      `a handler of ours cancelled ${key === ' ' ? 'Space' : key}, suppressing the control's own activation`);
  }
}

test('ArenaButton is a real button that names itself by its own text', () => {
  const root = mount(<ArenaButton onActivate={() => {}}>Deploy</ArenaButton>);
  const el = root.querySelector<HTMLElement>('button');
  assert.equal(el!.textContent.trim(), 'Deploy', 'the button pattern accepts text content as the name');
  assertKeysUnintercepted(el!, ['Enter', ' ']!);

  assertPattern({
    root,
    bindingPath: join(REACT_COMPONENTS, 'forms/arena-button/ArenaButton.behaviour.json'),
    subjects: { default: el },
    behavioural: { 'keyboard.Enter': true, 'keyboard.Space': true, 'states.disabled': true },
  });
});

test('ArenaButton reflects disabled natively, and the reflection tracks the member', () => {
  const off = mount(<ArenaButton disabled onActivate={() => {}}>Deploy</ArenaButton>).querySelector<HTMLElement>('button');
  assert.equal(off!.hasAttribute('disabled'), true, 'a disabled button must be disabled');
  cleanup();
  const on = mount(<ArenaButton onActivate={() => {}}>Deploy</ArenaButton>).querySelector<HTMLElement>('button');
  assert.equal(on!.hasAttribute('disabled'), false, 'an enabled button must carry nothing, or it is hardcoded');
});

test('ArenaIconButton is named by aria-label, since it draws no text', () => {
  const root = mount(<ArenaIconButton icon="ph-bold ph-plus" label="New project" onActivate={() => {}} />);
  const el = root.querySelector<HTMLElement>('button');
  assert.equal(el!.getAttribute('aria-label'), 'New project',
    'an icon-only control has no text to be named by, so the label member is the only route');
  assertKeysUnintercepted(el!, ['Enter', ' ']!);

  assertPattern({
    root,
    bindingPath: join(REACT_COMPONENTS, 'forms/arena-icon-button/ArenaIconButton.behaviour.json'),
    subjects: { default: el },
    behavioural: { 'keyboard.Enter': true, 'keyboard.Space': true, 'states.disabled': true },
  });
});

test('ArenaCheckbox is a native checkbox whose checked state is the platform’s', () => {
  const root = mount(<ArenaCheckbox label="Notify the team" checked onValueChange={() => {}} />);
  const el = root.querySelector<HTMLElement>('input[type="checkbox"]');
  assert.equal((el as HTMLInputElement).checked, true, 'the fixture must render the checked state it claims');
  assertKeysUnintercepted(el!, [' ']!);

  const off = mount(<ArenaCheckbox label="Notify the team" onValueChange={() => {}} />)
    .querySelector<HTMLElement>('input[type="checkbox"]');
  assert.equal((off as HTMLInputElement).checked, false, 'the state must track the member rather than being hardcoded');

  assertPattern({
    root,
    bindingPath: join(REACT_COMPONENTS, 'forms/arena-checkbox/ArenaCheckbox.behaviour.json'),
    subjects: { default: el },
    behavioural: { 'keyboard.Space': true },
  });
});

test('ArenaSwitch reports as a switch and reflects its own state', () => {
  const root = mount(<ArenaSwitch label="Automatic deploys" state onRequestChange={() => {}} />);
  const el = root.querySelector<HTMLElement>('[role="switch"]');
  assert.ok(el, 'a switch that reports as a checkbox loses the immediate-effect meaning');
  assert.equal(el.getAttribute('aria-checked'), 'true');
  assertKeysUnintercepted(el, [' ']!);

  const off = mount(<ArenaSwitch label="Automatic deploys" onRequestChange={() => {}} />)
    .querySelector<HTMLElement>('[role="switch"]');
  assert.equal(off!.getAttribute('aria-checked'), 'false',
    'the state must track the member rather than being hardcoded');

  assertPattern({
    root,
    bindingPath: join(REACT_COMPONENTS, 'forms/arena-switch/ArenaSwitch.behaviour.json'),
    subjects: { default: el },
    behavioural: { 'keyboard.Space': true },
  });
});

test('ArenaSelect is a native select: the browser owns the popup, the author owns the name', () => {
  const root = mount(
    <ArenaSelect label="Environment" value="staging" onValueChange={() => {}}
      options={[{ value: 'production', label: 'Production' }, { value: 'staging', label: 'Staging' }]} />,
  );
  const el = root.querySelector<HTMLSelectElement>('select');
  assert.ok(el, 'the control here is a native <select>, not an authored popup');
  assert.equal(el.options.length, 2, 'one option per entry');
  assertKeysUnintercepted(el, ['ArrowDown', 'Enter', 'Escape']!);

  const label = root.querySelector<HTMLElement>(`label[for="${el.getAttribute('id')}"]`);
  assert.ok(label, 'the label must be ASSOCIATED with the control, not merely drawn above it');
  assert.equal(label.textContent.trim(), 'Environment');

  for (const attr of ['aria-expanded', 'aria-controls', 'aria-activedescendant']) {
    assert.equal(el.hasAttribute(attr), false,
      `${attr} on a native select is a claim about a popup the browser owns and the component cannot keep true`);
  }

  assertPattern({
    root,
    bindingPath: join(REACT_COMPONENTS, 'forms/arena-select/ArenaSelect.behaviour.json'),
    subjects: { default: el },
  });
});
