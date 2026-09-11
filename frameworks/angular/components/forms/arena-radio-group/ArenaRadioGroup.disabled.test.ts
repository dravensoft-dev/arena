import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaRadioGroup } from './ArenaRadioGroup';
import { ArenaRadio } from '../arena-radio/ArenaRadio';

@Component({
  standalone: true,
  imports: [ArenaRadioGroup, ArenaRadio],
  template: `<arena-radio-group ariaLabel="Plan" [disabled]="off()">
    <arena-radio value="basic" label="Basic" /><arena-radio value="pro" label="Pro" />
  </arena-radio-group>`,
})
class Host { readonly off = signal(true); }

test('a disabled group disables every radio and reflects aria-disabled', () => {
  const fixture = TestBed.createComponent(Host);
  try {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const group = el.querySelector('[role="radiogroup"]');
    assert.equal(group?.getAttribute('aria-disabled'), 'true');
    for (const input of el.querySelectorAll('input[type="radio"]')) assert.equal((input as HTMLInputElement).disabled, true);
    fixture.componentInstance.off.set(false);
    fixture.detectChanges();
    assert.equal(group?.getAttribute('aria-disabled'), null);
    for (const input of el.querySelectorAll('input[type="radio"]')) assert.equal((input as HTMLInputElement).disabled, false);
  } finally { fixture.destroy(); }
});
