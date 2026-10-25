import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaCheckboxGroup } from './ArenaCheckboxGroup';
import { ArenaCheckbox } from '../arena-checkbox/ArenaCheckbox';

@Component({
  standalone: true,
  imports: [ArenaCheckboxGroup, ArenaCheckbox],
  template: `<arena-checkbox-group ariaLabel="Notify me about" [disabled]="off()">
    <arena-checkbox value="deploys" label="Deploys" /><arena-checkbox value="incidents" label="Incidents" disabled />
  </arena-checkbox-group>`,
})
class Host { readonly off = signal(true); }

test('a disabled group disables every box and reflects aria-disabled, and an enabled one leaves each its own', () => {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  try {
    const root = fixture.nativeElement as HTMLElement;
    const group = root.querySelector('arena-checkbox-group')!;
    const boxes = () => [...root.querySelectorAll('input[type="checkbox"]')] as HTMLInputElement[];
    assert.equal(group.getAttribute('aria-disabled'), 'true');
    assert.deepEqual(boxes().map((box) => box.disabled), [true, true]);
    fixture.componentInstance.off.set(false);
    fixture.detectChanges();
    assert.equal(group.getAttribute('aria-disabled'), null);
    assert.deepEqual(boxes().map((box) => box.disabled), [false, true]);
  } finally { fixture.destroy(); }
});
