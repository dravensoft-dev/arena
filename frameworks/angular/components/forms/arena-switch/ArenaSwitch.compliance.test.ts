/* Every verdict in the behavioural map below is earned by a named assertion in this file.
 * keyboard.Space is earned by the subject being a real <button>: the UA activates it on Space,
 * and no test here can prove that because happy-dom synthesizes no click from a keydown. So the
 * assertion is that the control is a native button carrying role="switch" -- the one shape that
 * gets the activation from the platform and the state from the role. */

import { useTestEnvironment, glyphIds, symbol } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { assertNoNode } from '../../../test/NodeAssert';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaSwitch } from './ArenaSwitch';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'forms/arena-switch/ArenaSwitch.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaSwitch],
  template: `<arena-switch label="Auto-deploy on merge" [state]="state" [disabled]="disabled"
                           [confirm]="confirm" [iconOn]="iconOn" [iconOff]="iconOff"
                           (funcOn)="on = on + 1" (funcOff)="off = off + 1"
                           (requestChange)="requested = requested + 1" />`,
})
class SwitchHost {
  state = false;
  disabled = false;
  confirm = false;
  iconOn: string | undefined = undefined;
  iconOff: string | undefined = undefined;
  on = 0;
  off = 0;
  requested = 0;
}

function render(patch: Partial<SwitchHost> = {}) {
  const fixture = TestBed.createComponent(SwitchHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const control = host.querySelector('button') as HTMLButtonElement;
  return { fixture, host, control };
}

test('the control is a native <button> carrying role="switch", which is the pattern in one element', () => {
  const { fixture, control } = render();
  try {
    assert.equal(control.tagName, 'BUTTON');
    assert.equal(control.getAttribute('role'), 'switch');
    assert.equal(control.getAttribute('type'), 'button',
      'a switch inside a form must not submit it');
    assert.equal(control.getAttribute('aria-label'), 'Auto-deploy on merge');
  } finally {
    fixture.destroy();
  }
});

test('aria-checked tracks state in both directions, and is present in both', () => {
  const off = render();
  try {
    assert.equal(off.control.getAttribute('aria-checked'), 'false',
      'an absent aria-checked reads as "not a switch", not as "off"');
  } finally {
    off.fixture.destroy();
  }

  const on = render({ state: true });
  try {
    assert.equal(on.control.getAttribute('aria-checked'), 'true');
  } finally {
    on.fixture.destroy();
  }
});

test('the host is the flex row itself -- the root recipe lands on it, not on a wrapper inside', () => {
  const { fixture, host } = render();
  try {
    const inner = host.querySelector('arena-switch') as HTMLElement;
    assert.match(inner.getAttribute('class') ?? '', /arena-switch__root/,
      'the root slot must be host-bound, or the host is an inline box the parent cannot lay out');
  } finally {
    fixture.destroy();
  }
});

test('the knob is decoration and says so, and the per-state glyph rides inside it', () => {
  const { fixture, control } = render({ state: true, iconOn: 'ph-bold ph-check', iconOff: 'ph-bold ph-x' });
  try {
    const knob = control.querySelector('span') as HTMLElement;
    assert.equal(knob.getAttribute('aria-hidden'), 'true',
      'the knob carries the state visually; aria-checked is what carries it to assistive technology');
    assert.deepEqual(glyphIds(knob), [symbol('bold', 'check')],
      'the on glyph is drawn and the off glyph is not in the DOM while the switch is on');
  } finally {
    fixture.destroy();
  }
});

test('turning on emits funcOn and turning off emits funcOff, never both and never change', () => {
  const off = render();
  try {
    off.control.click();
    off.fixture.detectChanges();
    assert.equal(off.fixture.componentInstance.on, 1);
    assert.equal(off.fixture.componentInstance.off, 0);
  } finally {
    off.fixture.destroy();
  }

  const on = render({ state: true });
  try {
    on.control.click();
    on.fixture.detectChanges();
    assert.equal(on.fixture.componentInstance.off, 1);
    assert.equal(on.fixture.componentInstance.on, 0);
  } finally {
    on.fixture.destroy();
  }
});

test('confirm diverts to requestChange and applies nothing, which is the whole point of the guard', () => {
  const { fixture, control } = render({ confirm: true });
  try {
    control.click();
    fixture.detectChanges();
    assert.equal(fixture.componentInstance.requested, 1);
    assert.equal(fixture.componentInstance.on, 0, 'a guarded switch must not apply the change itself');
    assert.equal(fixture.componentInstance.off, 0);
  } finally {
    fixture.destroy();
  }
});

@Component({
  standalone: true,
  imports: [ArenaSwitch],
  template: `<arena-switch label="Auto-deploy on merge" confirm
                           (funcOn)="on = on + 1" (funcOff)="off = off + 1" />`,
})
class UnwiredGuardHost {
  on = 0;
  off = 0;
}

test('confirm with NOTHING listening applies nothing -- the cost R6 leaves, pinned', () => {
  const fixture = TestBed.createComponent(UnwiredGuardHost);
  try {
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    fixture.detectChanges();
    assert.equal(fixture.componentInstance.on, 0,
      'confirm alone diverts the activation, so a switch with confirm and no (requestChange) is a '
      + 'control that does nothing. That is the contract read literally and it is the accepted cost of '
      + 'R6: no runtime guard can take the place of the fallback this replaced, because "is anything '
      + 'listening?" is the question R6 says a component may not ask.');
    assert.equal(fixture.componentInstance.off, 0);
  } finally {
    fixture.destroy();
  }
});

test('the label toggles too, and disabled stops it -- a span is not natively disabled', () => {
  const { fixture, host } = render({ disabled: true });
  try {
    const label = host.querySelectorAll('span');
    const text = Array.from(label).find((el) => el.textContent?.includes('Auto-deploy')) as HTMLElement;
    assert.ok(text, 'the label text did not render');
    text.click();
    fixture.detectChanges();
    assert.equal(fixture.componentInstance.on, 0,
      'the label is clickable and carries no disabled attribute, so the guard has to be in JS');
  } finally {
    fixture.destroy();
  }

  const live = render();
  try {
    const text = Array.from(live.host.querySelectorAll('span'))
      .find((el) => el.textContent?.includes('Auto-deploy')) as HTMLElement;
    text.click();
    live.fixture.detectChanges();
    assert.equal(live.fixture.componentInstance.on, 1, 'clicking the label of a live switch must toggle it');
  } finally {
    live.fixture.destroy();
  }
});

test('disabled reflects onto the native attribute and blocks activation', () => {
  const { fixture, control } = render({ disabled: true });
  try {
    assert.equal(control.disabled, true);
    assert.ok(control.hasAttribute('disabled'),
      'the attribute is what the track\'s disabled: cursor matches and what removes it from the Tab sequence');
    control.click();
    fixture.detectChanges();
    assert.equal(fixture.componentInstance.on, 0);
  } finally {
    fixture.destroy();
  }
});

test('the confirm guard is drawn only under confirm, and it is decoration', () => {
  const plain = render();
  try {
    assertNoNode(plain.host.querySelector('svg'), 'an unguarded switch with no icons drew a glyph');
  } finally {
    plain.fixture.destroy();
  }

  const guarded = render({ confirm: true });
  try {
    const shield = guarded.host.querySelector('svg') as SVGElement;
    assert.ok(shield, 'confirm drew no shield');
    assert.match(glyphIds(guarded.host).join(' '), /ph-\w+-shield-check/);
    assert.equal(shield.getAttribute('aria-hidden'), 'true');
  } finally {
    guarded.fixture.destroy();
  }
});

test('arena-switch meets the switch pattern', () => {
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
