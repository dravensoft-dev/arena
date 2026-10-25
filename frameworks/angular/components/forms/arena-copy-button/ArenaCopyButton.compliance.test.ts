/* arena-copy-button binds button, and the control is the arena-icon-button it draws, so the
 * pattern is asserted on that inner <button> rather than on the host. Space and Enter are earned
 * by the element being a real button the user agent activates on both keys. The status region
 * beside it is outside the binding, because a status cannot be added to a button, and the
 * behaviour suite beside this one holds what it announces. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaCopyButton } from './ArenaCopyButton';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'forms/arena-copy-button/ArenaCopyButton.behaviour.json');

@Component({
  selector: 'copy-button-compliance-host',
  standalone: true,
  imports: [ArenaCopyButton],
  template: `<arena-copy-button text="bun add @dravensoft/arena-angular" label="Copy the install command" [disabled]="disabled" />`,
})
class CopyButtonHost {
  disabled = false;
}

test('arena-copy-button meets the button pattern on the button it draws', () => {
  const fixture = TestBed.createComponent(CopyButtonHost);
  try {
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const control = root.querySelector('button') as HTMLButtonElement;
    assert.equal(control.tagName, 'BUTTON');
    assert.equal(control.getAttribute('aria-label'), 'Copy the install command');
    for (const key of ['Enter', ' ']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      control.dispatchEvent(event);
      assert.equal(event.defaultPrevented, false, 'a handler of ours cancelled a key the button activates on');
    }
    assertPattern({
      root,
      bindingPath: BINDING,
      subjects: { default: control },
      behavioural: { 'keyboard.Enter': true, 'keyboard.Space': true, 'states.disabled': true },
    });
  } finally {
    fixture.destroy();
  }
});

test('the host is the wrapper its own manifest draws, so it carries the root part and the root classes', () => {
  const fixture = TestBed.createComponent(CopyButtonHost);
  try {
    fixture.detectChanges();
    const host = (fixture.nativeElement as HTMLElement).querySelector('arena-copy-button') as HTMLElement;
    assert.equal(host.getAttribute('data-arena-part'), 'copy-button');
    assert.ok(host.getAttribute('class'), 'the root slot binds to the host, so the host carries its classes');
    const region = host.querySelector('[role="status"]') as HTMLElement;
    assert.equal(region.getAttribute('data-arena-part'), 'copy-button.announcement');
    assert.equal((region.textContent ?? '').trim(), '', 'a live region filled on first insertion is not reliably announced, so it is mounted empty');
    assert.equal(host.querySelector('button')?.hasAttribute('aria-pressed'), false, 'the confirmation is not a toggle');
  } finally {
    fixture.destroy();
  }
});
