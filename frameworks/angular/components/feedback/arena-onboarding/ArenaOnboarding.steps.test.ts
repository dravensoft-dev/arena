/* A tour step change removes the button that held focus (Back is gone at the first step), which
 * drops focus on the body. The panel takes it back, so the keyboard stays inside the tour and
 * Escape still reaches it. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { assertSameNode } from '../../../test/NodeAssert';
import { ArenaOnboarding } from './ArenaOnboarding';

const THREE_STEPS = [{ title: 'Welcome' }, { title: 'Palette' }, { title: 'All set' }];

@Component({
  standalone: true,
  imports: [ArenaOnboarding],
  template: `<arena-onboarding [open]="true" [steps]="steps" [index]="index()"
    (next)="index.set(index() + 1)" (back)="index.set(index() - 1)" (skip)="skipped.set(skipped() + 1)" />`,
})
class Host {
  readonly steps = THREE_STEPS;
  readonly index = signal(0);
  readonly skipped = signal(0);
}

test('Next then Back leaves focus inside the panel, and Escape then closes the tour', () => {
  const fixture = TestBed.createComponent(Host);
  try {
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const buttons = () => Array.from(root.querySelectorAll<HTMLButtonElement>('button'));
    const panel = root.querySelector<HTMLElement>('[role="dialog"]')!;

    const next = buttons()[buttons().length - 1]!;
    next.focus();
    next.click();
    fixture.detectChanges();
    const back = buttons()[0]!;
    assert.equal(back.textContent?.trim(), 'Back');
    back.focus();
    back.click();
    fixture.detectChanges();

    assert.equal(buttons().some((b) => b.textContent?.trim() === 'Back'), false, 'Back is gone at index 0');
    assert.equal(panel.contains(document.activeElement), true, 'focus must stay inside the panel after the step change');
    assertSameNode(document.activeElement, buttons().find((b) => b.textContent?.trim() === 'Skip') ?? null,
      'the dropped focus did not land on the panel\'s first control');

    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    assert.equal(fixture.componentInstance.skipped(), 1, 'Escape reports skip exactly once');
  } finally {
    fixture.destroy();
  }
});
