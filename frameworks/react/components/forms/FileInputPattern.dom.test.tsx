/* The file input binds button to its trigger, a real <button>, so Enter and Space are the
 * platform's and what is asserted is that Arena intercepts neither. The native file input is not
 * the bound element: its role is no button, so it sits beside the trigger out of the tab order and
 * out of the accessibility tree, and the trigger opens it. happy-dom opens no picker; the by-hand
 * list in the prompt names the real one. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React, { useState } from 'react';
import { mount, cleanup, act } from '../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../test/AssertPattern.tsx';
import { ArenaFileInput } from './arena-file-input/ArenaFileInput.tsx';

afterEach(cleanup);

const BINDING = join(REACT_COMPONENTS, 'forms/arena-file-input/ArenaFileInput.behaviour.json');

function render(node: React.ReactElement = <ArenaFileInput label="Passport scan" />) {
  const root = mount(node);
  return {
    root,
    trigger: root.querySelector<HTMLButtonElement>('button[data-arena-part="file-input.trigger"]')!,
    input: root.querySelector<HTMLInputElement>('input[type="file"]')!,
  };
}

test('the trigger is a real button whose name reads the label and then its own text', () => {
  const { root, trigger } = render();
  const name = (trigger.getAttribute('aria-labelledby') ?? '').split(' ')
    .map((id) => root.ownerDocument.getElementById(id)?.textContent?.trim()).join(', ');
  assert.equal(name, 'Passport scan, Choose file');
});

function spoken(element: HTMLElement | null) {
  if (!element) return undefined;
  const copy = element.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('[aria-hidden="true"]').forEach((hidden) => hidden.remove());
  return copy.textContent?.trim();
}

const textOf = (root: HTMLElement, ids: string | null) => (ids ?? '').split(' ')
  .map((id) => spoken(root.ownerDocument.getElementById(id))).join(', ');

test('a required field names its trigger with the label, the required word and then its own text', () => {
  const { root, trigger } = render(<ArenaFileInput label="Passport scan" required />);
  assert.equal(textOf(root, trigger.getAttribute('aria-labelledby')), 'Passport scan, required, Choose file');
  assert.equal(root.querySelector('[data-arena-part="file-input.required"]')?.getAttribute('aria-hidden'), 'true');
  assert.ok(root.querySelector('[data-arena-part="file-input.required-label"]'), 'the required word is its own part');
});

test('the trigger is described by the hint, by the error that replaces it, and by nothing when neither shows', () => {
  assert.equal(render().trigger.getAttribute('aria-describedby'), null);
  cleanup();
  const hinted = render(<ArenaFileInput label="Passport scan" hint="PDF only." />);
  assert.equal(textOf(hinted.root, hinted.trigger.getAttribute('aria-describedby')), 'PDF only.');
  cleanup();
  const failed = render(<ArenaFileInput label="Passport scan" hint="PDF only." error="Attach one file." />);
  assert.equal(textOf(failed.root, failed.trigger.getAttribute('aria-describedby')), 'Attach one file.');
});

test('a changed error reaches the status region, and an unchanged or cleared one adds nothing to it', () => {
  let setError!: (error: string | undefined) => void;
  let setHint!: (hint: string) => void;
  function Host() {
    const [error, writeError] = useState<string | undefined>(undefined);
    const [hint, writeHint] = useState('PDF only.');
    setError = writeError;
    setHint = writeHint;
    return <ArenaFileInput label="Passport scan" hint={hint} error={error} />;
  }
  const root = mount(<Host />);
  const status = () => root.querySelector('[role="status"]')?.textContent ?? '';
  const quiet = status();
  act(() => { setError('Attach one file.'); });
  assert.equal(status(), `${quiet} Attach one file.`);
  act(() => { setHint('PDF or an image.'); });
  assert.equal(status(), `${quiet} Attach one file.`, 'a render that changed no error changed the status region');
  const input = root.querySelector<HTMLInputElement>('input[type="file"]')!;
  const transfer = new DataTransfer();
  transfer.items.add(new File(['x'], 'a.pdf', { type: 'application/pdf' }));
  input.files = transfer.files;
  act(() => { input.dispatchEvent(new Event('change', { bubbles: true })); });
  const picked = status();
  assert.doesNotMatch(picked, /Attach one file/, 'an unchanged error spoke again with the next pick');
  act(() => { setError('Attach a smaller file.'); });
  assert.equal(status(), `${picked} Attach a smaller file.`);
  act(() => { setError(undefined); });
  assert.equal(status(), picked, 'a cleared error left words in the status region');
});

test('Enter and Space reach the trigger unintercepted, so the platform activates it', () => {
  const { trigger } = render();
  for (const key of ['Enter', ' ']) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    act(() => { trigger.dispatchEvent(event); });
    assert.equal(event.defaultPrevented, false, `a handler of ours cancelled ${key === ' ' ? 'Space' : key}`);
  }
});

test('activating the trigger opens the hidden input, and nothing else does', () => {
  const { trigger, input } = render();
  let opened = 0;
  input.click = () => { opened += 1; };
  act(() => { trigger.click(); });
  assert.equal(opened, 1);
});

test('the native input is out of the tab order and out of the accessibility tree', () => {
  const { input } = render();
  assert.equal(input.getAttribute('tabindex'), '-1');
  assert.equal(input.getAttribute('aria-hidden'), 'true');
});

test('disabled is native on the trigger and on the hidden input', () => {
  const { trigger, input } = render(<ArenaFileInput label="Passport scan" disabled />);
  assert.equal(trigger.disabled, true);
  assert.equal(input.disabled, true);
});

test('ArenaFileInput meets the button pattern on its trigger', () => {
  const { root, trigger } = render();
  assertPattern({
    root,
    bindingPath: BINDING,
    subjects: { default: trigger },
    behavioural: { 'keyboard.Enter': true, 'keyboard.Space': true, 'states.disabled': true },
  });
});
