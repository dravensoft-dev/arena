/* Every verdict in the behavioural map below is earned by a named assertion in this file.
 * keyboard.Space and keyboard.Enter are earned by the control being a real <button>: the UA
 * activates it on both keys, and no test here can prove that because happy-dom synthesizes
 * no click from a keydown. So the assertion is that the element is the one the browser
 * already knows how to activate -- which is the whole reason the host stays bare.
 * `clicks` counts what a CONSUMER hears through the (activate) binding, and `emitted` counts the
 * output on the component instance. Both are asserted; either alone is blind. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ArenaButton } from './ArenaButton';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'forms/arena-button/ArenaButton.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaButton],
  template: `<arena-button [disabled]="disabled" [loading]="loading" (activate)="clicks = clicks + 1">Save changes</arena-button>`,
})
class ButtonHost {
  disabled = false;
  loading = false;
  clicks = 0;
}

function render(patch: Partial<ButtonHost> = {}) {
  const fixture = TestBed.createComponent(ButtonHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const control = host.querySelector('button') as HTMLButtonElement;
  const emitted = { count: 0 };
  const instance = fixture.debugElement.query(By.directive(ArenaButton)).componentInstance as ArenaButton;
  instance.activate.subscribe(() => { emitted.count += 1; });
  return { fixture, host, control, emitted };
}

test('the recipe lands on a real <button>, which is what supplies Space and Enter activation', () => {
  const { fixture, control } = render();
  try {
    assert.ok(control, 'arena-button rendered no <button> -- nothing would be focusable or activatable');
    assert.equal(control.tagName, 'BUTTON');
    assert.equal(control.getAttribute('role'), null,
      'a role override on a native button would replace the activation semantics this pattern relies on');
    assert.equal(control.getAttribute('type'), 'button',
      'the default must be button, or a button inside a form submits it by accident');
  } finally {
    fixture.destroy();
  }
});

test('the host stays bare -- the recipe classes land on the <button> inside it, not on the host', () => {
  const { fixture, host, control } = render();
  try {
    assert.equal(host.getAttribute('class'), null);
    assert.match(control.getAttribute('class') ?? '', /arena-button__root/);
  } finally {
    fixture.destroy();
  }
});

test('a click on the control emits activate exactly once, and the projected label names it', () => {
  const { fixture, control, emitted } = render();
  try {
    assert.equal(control.textContent?.trim(), 'Save changes',
      'the label is projected content, and without it the button has no accessible name');

    control.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    assert.equal(emitted.count, 1, 'the activate output did not emit');
    assert.equal(fixture.componentInstance.clicks, 1,
      'a consumer binding (activate) must hear it exactly once -- two would be a double emit, and zero none');
  } finally {
    fixture.destroy();
  }
});

test('disabled reflects onto the native attribute and blocks the emission', () => {
  const { fixture, control, emitted } = render({ disabled: true });
  try {
    assert.equal(control.disabled, true);
    assert.ok(control.hasAttribute('disabled'),
      'the attribute is what the disabled: variants style and what removes the control from the Tab sequence');

    control.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    assert.equal(emitted.count, 0, 'a disabled button emitted activate');
    assert.equal(fixture.componentInstance.clicks, 0,
      'and the consumer binding heard nothing');
  } finally {
    fixture.destroy();
  }
});

test('loading implies disabled and swaps the leading icon for the spinner', () => {
  const { fixture, control } = render({ loading: true });
  try {
    assert.equal(control.disabled, true, 'loading must block activation without the caller also setting disabled');
    const spinner = control.querySelector('span');
    assert.ok(spinner, 'loading rendered no spinner');
    assert.match(spinner.getAttribute('class') ?? '', /arena-button__spinner/);
    assert.equal(spinner.getAttribute('aria-hidden'), 'true',
      'the spinner is decoration; the label already says what is happening');
  } finally {
    fixture.destroy();
  }
});

test('arena-button meets the button pattern', () => {
  const { fixture, host, control } = render();
  try {
    assertPattern({
      root: host,
      bindingPath: BINDING,
      subjects: { default: control },
      behavioural: { 'states.disabled': true, 'keyboard.Space': true, 'keyboard.Enter': true },
    });
  } finally {
    fixture.destroy();
  }
});
