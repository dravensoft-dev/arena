/* Every verdict in the behavioural map below is earned by a named assertion in this file.
 * keyboard.Space is earned by the subject being a real <input type="checkbox">: the UA toggles
 * it on Space, and no test here can prove that because happy-dom synthesizes no change from a
 * keydown. So the assertion is that the element is the one the browser already knows how to
 * toggle -- which is why the box is decoration and the input is the control. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { assertNoNode, assertSameNode } from '../../../test/NodeAssert';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaCheckbox } from './ArenaCheckbox';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'forms/arena-checkbox/ArenaCheckbox.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaCheckbox],
  template: `<arena-checkbox [checked]="checked" [label]="label" [showLabel]="showLabel" [disabled]="disabled"
                             [required]="required" (change)="last = $event; changes = changes + 1" />`,
})
class CheckboxHost {
  checked = false;
  label = 'Notify on failure';
  showLabel = true;
  disabled = false;
  required = false;
  changes = 0;
  last: boolean | null = null;
}

function render(patch: Partial<CheckboxHost> = {}) {
  const fixture = TestBed.createComponent(CheckboxHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const control = host.querySelector('input') as HTMLInputElement;
  return { fixture, host, control };
}

test('the control is a real <input type="checkbox">, which is what supplies Space and the checked state', () => {
  const { fixture, control } = render();
  try {
    assert.ok(control, 'arena-checkbox rendered no input -- nothing would be focusable or toggleable');
    assert.equal(control.getAttribute('type'), 'checkbox');
    assert.equal(control.getAttribute('role'), null,
      'a role override on a native checkbox would replace the semantics this pattern relies on');
  } finally {
    fixture.destroy();
  }
});

test('the wrapping <label> is what names the input, so the box needs no aria of its own', () => {
  const { fixture, host, control } = render();
  try {
    const label = host.querySelector('label') as HTMLElement;
    assert.ok(label, 'the root is not a <label>, and the input then has no accessible name at all');
    assertSameNode(control.closest('label'), label);
    assert.equal(label.textContent?.trim(), 'Notify on failure');
    assert.equal(control.getAttribute('aria-label'), null,
      'an aria-label here would duplicate the name the wrapping label already supplies');
  } finally {
    fixture.destroy();
  }
});

test('the host stays bare and out of layout -- the recipe classes land on the <label> inside it', () => {
  const { fixture, host } = render();
  try {
    const inner = host.querySelector('arena-checkbox') as HTMLElement;
    assert.equal(inner.getAttribute('class'), null);
    assert.match(inner.getAttribute('style') ?? '', /display:\s*contents/);
    const label = host.querySelector('label') as HTMLElement;
    assert.match(label.getAttribute('class') ?? '', /arena-checkbox__root/);
  } finally {
    fixture.destroy();
  }
});

test('the tick is drawn only when checked, and the box is empty otherwise', () => {
  const off = render();
  try {
    assertNoNode(off.host.querySelector('svg'), 'an unchecked box drew a tick');
  } finally {
    off.fixture.destroy();
  }

  const on = render({ checked: true });
  try {
    const svg = on.host.querySelector('svg');
    assert.ok(svg, 'a checked box drew no tick');
    assert.equal(on.control.checked, true);
  } finally {
    on.fixture.destroy();
  }
});

test('a toggle emits change exactly once, carrying the new state rather than the event', () => {
  const { fixture, control } = render();
  try {
    control.checked = true;
    control.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    assert.equal(fixture.componentInstance.changes, 1,
      'change is an output named after a native DOM event -- twice would mean the native one reached the consumer too');
    assert.equal(fixture.componentInstance.last, true, 'the payload must be the new checked state');
  } finally {
    fixture.destroy();
  }
});

test('disabled and required reflect onto the native attributes, which is where they mean anything', () => {
  const { fixture, control } = render({ disabled: true, required: true });
  try {
    assert.equal(control.disabled, true);
    assert.ok(control.hasAttribute('disabled'),
      'the attribute is what removes the control from the Tab sequence');
    assert.equal(control.required, true);
    assert.ok(control.hasAttribute('required'),
      'native required is what maps to required in the accessibility tree; aria-required would be a second claim');
  } finally {
    fixture.destroy();
  }
});

test('a checkbox with a blank label is refused', () => {
  assert.throws(() => render({ label: '   ' }), /^Error: ArenaCheckbox:/);
});

test('a blank label is refused even with showLabel false', () => {
  assert.throws(() => render({ label: '   ', showLabel: false }), /^Error: ArenaCheckbox:/);
});

test('showLabel false draws no label and keeps the name on the input', () => {
  const { fixture, host, control } = render({ label: 'Select row', showLabel: false });
  try {
    assert.equal(host.querySelector('[data-arena-part="checkbox.label"]'), null);
    assert.equal(control.getAttribute('aria-label'), 'Select row');
  } finally {
    fixture.destroy();
  }
});

test('arena-checkbox meets the checkbox pattern', () => {
  const { fixture, host, control } = render();
  try {
    assertPattern({
      root: host,
      bindingPath: BINDING,
      subjects: { default: control },
      behavioural: { 'keyboard.Space': true },
    });
  } finally {
    fixture.destroy();
  }
});
