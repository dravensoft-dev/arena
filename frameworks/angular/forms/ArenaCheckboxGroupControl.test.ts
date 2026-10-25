import { useTestEnvironment } from '../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ArenaCheckboxGroup } from '../components/forms/arena-checkbox-group/ArenaCheckboxGroup';
import { ArenaCheckbox } from '../components/forms/arena-checkbox/ArenaCheckbox';
import { ArenaCheckboxGroupControl } from './ArenaCheckboxGroupControl';

@Component({
  selector: 'forms-arena-checkbox-group-control-host',
  standalone: true,
  imports: [ReactiveFormsModule, ArenaCheckboxGroup, ArenaCheckboxGroupControl, ArenaCheckbox],
  template: `<arena-checkbox-group ariaLabel="Notify me about" [formControl]="control"><arena-checkbox value="deploys" label="Deploys" /><arena-checkbox value="incidents" label="Incidents" /></arena-checkbox-group>`,
})
class Host {
  control = new FormControl<string[] | null>(['deploys']);
}

function render() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const boxes = () => [...root.querySelectorAll('input[type="checkbox"]')] as HTMLInputElement[];
  return { fixture, host: fixture.componentInstance, boxes };
}

test('setValue redraws the group, and null or a non-array draws nothing ticked', () => {
  const { fixture, host, boxes } = render();
  try {
    assert.deepEqual(boxes().map((box) => box.checked), [true, false]);
    host.control.setValue(['incidents']);
    fixture.detectChanges();
    assert.deepEqual(boxes().map((box) => box.checked), [false, true]);
    host.control.setValue(null);
    fixture.detectChanges();
    assert.deepEqual(boxes().map((box) => box.checked), [false, false]);
  } finally { fixture.destroy(); }
});

test('a toggle reports a fresh string[] through valueChanges, in the order it was ticked', () => {
  const { fixture, host, boxes } = render();
  try {
    const seen: unknown[] = [];
    host.control.valueChanges.subscribe((value) => seen.push(value));
    const incidents = boxes()[1]!;
    incidents.checked = true;
    incidents.dispatchEvent(new Event('change', { bubbles: true }));
    assert.deepEqual(seen, [['deploys', 'incidents']]);
  } finally { fixture.destroy(); }
});

test('two toggles in a row each build on the set the earlier ones left', () => {
  const { fixture, host, boxes } = render();
  try {
    const seen: unknown[] = [];
    host.control.valueChanges.subscribe((value) => seen.push(value));
    const [deploys, incidents] = boxes() as [HTMLInputElement, HTMLInputElement];
    incidents.checked = true;
    incidents.dispatchEvent(new Event('change', { bubbles: true }));
    deploys.checked = false;
    deploys.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    assert.deepEqual(seen, [['deploys', 'incidents'], ['incidents']]);
    assert.deepEqual(host.control.value, ['incidents']);
    assert.deepEqual(boxes().map((box) => box.checked), [false, true]);
  } finally { fixture.destroy(); }
});

test('disable() disables every box', () => {
  const { fixture, host, boxes } = render();
  try {
    host.control.disable();
    fixture.detectChanges();
    for (const box of boxes()) assert.equal(box.disabled, true);
  } finally { fixture.destroy(); }
});

test('leaving the group marks it touched', () => {
  const { fixture, host, boxes } = render();
  try {
    boxes()[0]!.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    assert.equal(host.control.touched, true);
  } finally { fixture.destroy(); }
});
