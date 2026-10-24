/* Every verdict in the behavioural map below is earned by a named assertion in this file.
 * keyboard.Space and keyboard.Enter are earned by the control being a real <button>: the UA
 * activates it on both keys, and no test here can prove that because happy-dom synthesizes
 * no click from a keydown. So the assertion is that the element is the one the browser
 * already knows how to activate -- which is the whole reason the host stays bare.
 * `clicks` counts what a CONSUMER hears through the (activate) binding, and `emitted` counts the
 * output on the component instance. Both are asserted; either alone is blind. */

import { useTestEnvironment, glyphIds, symbol } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ArenaIconButton } from './ArenaIconButton';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'forms/arena-icon-button/ArenaIconButton.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaIconButton],
  template: `<arena-icon-button icon="ph-bold ph-trash" label="Delete project"
                                [disabled]="disabled" [showLabel]="showLabel" [pressed]="pressed"
                                (activate)="clicks = clicks + 1" />`,
})
class IconButtonHost {
  disabled = false;
  showLabel = false;
  pressed: boolean | undefined = undefined;
  clicks = 0;
}

function render(patch: Partial<IconButtonHost> = {}) {
  const fixture = TestBed.createComponent(IconButtonHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const control = host.querySelector('button') as HTMLButtonElement;
  const emitted = { count: 0 };
  const instance = fixture.debugElement.query(By.directive(ArenaIconButton)).componentInstance as ArenaIconButton;
  instance.activate.subscribe(() => { emitted.count += 1; });
  return { fixture, host, control, emitted };
}

test('the recipe lands on a real <button>, which is what supplies Space and Enter activation', () => {
  const { fixture, control } = render();
  try {
    assert.ok(control, 'arena-icon-button rendered no <button> -- nothing would be focusable or activatable');
    assert.equal(control.tagName, 'BUTTON');
    assert.equal(control.getAttribute('role'), null,
      'a role override on a native button would replace the activation semantics this pattern relies on');
    assert.equal(control.getAttribute('type'), 'button',
      'the default must be button, or an icon button inside a form submits it by accident');
  } finally {
    fixture.destroy();
  }
});

test('the host stays bare and out of layout -- the recipe classes land on the <button> inside it', () => {
  const { fixture, host, control } = render();
  try {
    const inner = host.querySelector('arena-icon-button') as HTMLElement;
    assert.equal(inner.getAttribute('class'), null);
    assert.match(inner.getAttribute('style') ?? '', /display:\s*contents/,
      'a bare host must leave layout, or as a flex item it shrinks to fit around the control');
    assert.match(control.getAttribute('class') ?? '', /arena-icon-button__root/);
  } finally {
    fixture.destroy();
  }
});

test('the glyph is drawn and hidden, and the accessible name comes from label rather than from it', () => {
  const { fixture, control } = render();
  try {
    const glyph = control.querySelector('svg') as SVGElement;
    assert.ok(glyph, 'no glyph was drawn for the icon');
    assert.deepEqual(glyphIds(control), [symbol('bold', 'trash')]);
    assert.equal(glyph.getAttribute('aria-hidden'), 'true',
      'a glyph announced beside the label reads as noise');
    assert.equal(control.getAttribute('aria-label'), 'Delete project');
    assert.equal(control.textContent?.trim(), '',
      'with showLabel unset the control has no text, which is exactly why aria-label is required here');
  } finally {
    fixture.destroy();
  }
});

test('the title repeats the name only while the label is invisible, never alongside it', () => {
  const { fixture, control } = render();
  try {
    assert.equal(control.getAttribute('title'), 'Delete project');
  } finally {
    fixture.destroy();
  }

  const shown = render({ showLabel: true });
  try {
    assert.equal(shown.control.getAttribute('title'), null,
      'a title beside a visible label makes the browser draw a tooltip repeating what is already on screen');
    assert.equal(shown.control.textContent?.trim(), 'Delete project');
    assert.equal(shown.control.getAttribute('aria-label'), 'Delete project',
      'the name must be present in every state, visible label or not');
  } finally {
    shown.fixture.destroy();
  }
});

test('a click on the control emits activate exactly once', () => {
  const { fixture, control, emitted } = render();
  try {
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
    assert.equal(emitted.count, 0, 'a disabled icon button emitted activate');
    assert.equal(fixture.componentInstance.clicks, 0,
      'and the consumer binding heard nothing');
  } finally {
    fixture.destroy();
  }
});

test('arena-icon-button meets the button pattern', () => {
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

test('no pressed member means no aria-pressed at all -- a plain button is not an unpressed toggle', () => {
  const { fixture, control } = render();
  try {
    assert.equal(control.getAttribute('aria-pressed'), null,
      'a control that is not a toggle announced itself as one that is off');
  } finally {
    fixture.destroy();
  }
});

test('pressed reflects both of its states, and the name never moves between them', () => {
  const on = render({ pressed: true });
  try {
    assert.equal(on.control.getAttribute('aria-pressed'), 'true');
    assert.equal(on.control.getAttribute('aria-label'), 'Delete project');
  } finally {
    on.fixture.destroy();
  }

  const off = render({ pressed: false });
  try {
    assert.equal(off.control.getAttribute('aria-pressed'), 'false');
    assert.equal(off.control.getAttribute('aria-label'), 'Delete project',
      'a toggle that renames itself is announced as another control rather than the same one in another state');
  } finally {
    off.fixture.destroy();
  }
});

test('a toggle still meets the button pattern in both of its states', () => {
  for (const pressed of [true, false]) {
    const { fixture, host, control } = render({ pressed });
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
  }
});
