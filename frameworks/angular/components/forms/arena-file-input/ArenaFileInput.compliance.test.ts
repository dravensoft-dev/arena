/* button binds to the trigger, a real <button>: Enter and Space are the platform's, so what is
 * asserted is that nothing of ours intercepts them. The native file input is not the bound element
 * (its role is no button), so it sits beside the trigger out of the tab order and the tree. change
 * is an output named after a DOM event, and the hidden input's own change bubbles to the host, so
 * the component stops it there and a consumer hears the selection once. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ArenaFileSelection } from '../../../Api.generated';
import { ArenaFileInput } from './ArenaFileInput';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'forms/arena-file-input/ArenaFileInput.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaFileInput],
  template: `<arena-file-input label="Passport scan" name="passport" id="passport" [disabled]="disabled"
                               (change)="seen.push($event)" />`,
})
class Host {
  disabled = false;
  seen: unknown[] = [];
}

function render(patch: Partial<Host> = {}) {
  const fixture = TestBed.createComponent(Host);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  return {
    fixture, root,
    host: root.querySelector('arena-file-input') as HTMLElement,
    trigger: root.querySelector('[data-arena-part="file-input.trigger"]') as HTMLButtonElement,
    input: root.querySelector('input[type="file"]') as HTMLInputElement,
  };
}

test('the trigger is a real button whose name reads the label and then its own text', () => {
  const { fixture, root, trigger } = render();
  try {
    assert.equal(trigger.tagName, 'BUTTON');
    assert.equal(trigger.getAttribute('type'), 'button');
    const name = (trigger.getAttribute('aria-labelledby') ?? '').split(' ')
      .map((id) => root.ownerDocument.getElementById(id)?.textContent?.trim()).join(', ');
    assert.equal(name, 'Passport scan, Choose file');
  } finally { fixture.destroy(); }
});

type Spoken = { required?: boolean; hint?: string; error?: string };

function renderSpoken(inputs: Spoken = {}) {
  const fixture = TestBed.createComponent(ArenaFileInput);
  const set = (patch: Spoken) => {
    for (const [name, value] of Object.entries(patch)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  };
  fixture.componentRef.setInput('label', 'Passport scan');
  set(inputs);
  const root = fixture.nativeElement as HTMLElement;
  return { fixture, root, set, trigger: root.querySelector('[data-arena-part="file-input.trigger"]') as HTMLButtonElement };
}

function spoken(element: HTMLElement | null) {
  if (!element) return undefined;
  const copy = element.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('[aria-hidden="true"]').forEach((hidden) => hidden.remove());
  return copy.textContent?.trim();
}

const textOf = (root: HTMLElement, ids: string | null) => (ids ?? '').split(' ')
  .map((id) => spoken(root.ownerDocument.getElementById(id))).join(', ');

test('a required field names its trigger with the label, the required word and then its own text', () => {
  const { fixture, root, trigger } = renderSpoken({ required: true });
  try {
    assert.equal(textOf(root, trigger.getAttribute('aria-labelledby')), 'Passport scan, required, Choose file');
    assert.equal(root.querySelector('[data-arena-part="file-input.required"]')?.getAttribute('aria-hidden'), 'true');
    assert.ok(root.querySelector('[data-arena-part="file-input.required-label"]'), 'the required word is its own part');
  } finally { fixture.destroy(); }
});

test('the trigger is described by the hint, by the error that replaces it, and by nothing when neither shows', () => {
  const { fixture, root, set, trigger } = renderSpoken();
  try {
    assert.equal(trigger.getAttribute('aria-describedby'), null);
    set({ hint: 'PDF only.' });
    assert.equal(textOf(root, trigger.getAttribute('aria-describedby')), 'PDF only.');
    set({ error: 'Attach one file.' });
    assert.equal(textOf(root, trigger.getAttribute('aria-describedby')), 'Attach one file.');
  } finally { fixture.destroy(); }
});

test('a changed error reaches the status region, and an unchanged or cleared one adds nothing to it', () => {
  const { fixture, root, set } = renderSpoken({ hint: 'PDF only.' });
  const status = () => root.querySelector('[role="status"]')?.textContent ?? '';
  try {
    const quiet = status();
    set({ error: 'Attach one file.' });
    assert.equal(status(), `${quiet} Attach one file.`);
    set({ hint: 'PDF or an image.' });
    assert.equal(status(), `${quiet} Attach one file.`, 'a render that changed no error changed the status region');
    const input = root.querySelector('input[type="file"]') as HTMLInputElement;
    const transfer = new DataTransfer();
    transfer.items.add(new File(['x'], 'a.pdf', { type: 'application/pdf' }));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    const picked = status();
    assert.doesNotMatch(picked, /Attach one file/, 'an unchanged error spoke again with the next pick');
    set({ error: 'Attach a smaller file.' });
    assert.equal(status(), `${picked} Attach a smaller file.`);
    set({ error: undefined });
    assert.equal(status(), picked, 'a cleared error left words in the status region');
  } finally { fixture.destroy(); }
});

test('the host binds the root and drops the name and the id, which belong to the inner elements', () => {
  const { fixture, host, input, trigger } = render();
  try {
    assert.match(host.getAttribute('class') ?? '', /arena-file-input__root/);
    assert.equal(host.getAttribute('name'), null);
    assert.equal(host.getAttribute('id'), null);
    assert.equal(input.getAttribute('name'), 'passport');
    assert.equal(trigger.id, 'passport');
  } finally { fixture.destroy(); }
});

test('Enter and Space reach the trigger unintercepted, and activating it opens the hidden input', () => {
  const { fixture, trigger, input } = render();
  try {
    for (const key of ['Enter', ' ']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      trigger.dispatchEvent(event);
      assert.equal(event.defaultPrevented, false);
    }
    let opened = 0;
    input.click = () => { opened += 1; };
    trigger.click();
    assert.equal(opened, 1);
  } finally { fixture.destroy(); }
});

test('the native input is out of the tab order and out of the accessibility tree', () => {
  const { fixture, input } = render();
  try {
    assert.equal(input.getAttribute('tabindex'), '-1');
    assert.equal(input.getAttribute('aria-hidden'), 'true');
  } finally { fixture.destroy(); }
});

test('a pick reaches a consumer listening for change exactly once, as the selection and never the event', () => {
  const { fixture, input } = render();
  try {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['x'], 'a.pdf', { type: 'application/pdf' }));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const seen = fixture.componentInstance.seen as ArenaFileSelection[];
    assert.equal(seen.length, 1, 'twice means the native change reached the consumer too');
    assert.deepEqual(seen[0], { names: ['a.pdf'], sizes: [1], types: ['application/pdf'] });
  } finally { fixture.destroy(); }
});

test('disabled is native on the trigger and on the hidden input', () => {
  const { fixture, trigger, input } = render({ disabled: true });
  try {
    assert.equal(trigger.disabled, true);
    assert.equal(input.disabled, true);
  } finally { fixture.destroy(); }
});

test('arena-file-input meets the button pattern on its trigger', () => {
  const { fixture, root, trigger } = render();
  try {
    assertPattern({
      root,
      bindingPath: BINDING,
      subjects: { default: trigger },
      behavioural: { 'keyboard.Enter': true, 'keyboard.Space': true, 'states.disabled': true },
    });
  } finally { fixture.destroy(); }
});
