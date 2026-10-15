import { useTestEnvironment } from '../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ArenaMultiSelect } from '../components/forms/arena-multi-select/ArenaMultiSelect';
import { disposeOverlays } from '../test/Overlays';
import { ArenaMultiSelectControl } from './ArenaMultiSelectControl';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, ArenaMultiSelect, ArenaMultiSelectControl],
  template: `<arena-multi-select label="Regions" [options]="options" [formControl]="control" />`,
})
class Host {
  options = [{ value: 'eu', label: 'Europe' }, { value: 'us', label: 'Americas' }];
  control = new FormControl<unknown>(['eu']);
}

function render() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const chips = () => Array.from(root.querySelectorAll('arena-tag')).map((tag) => tag.textContent?.replace('Remove', '').trim());
  const input = root.querySelector('[role="combobox"]') as HTMLInputElement;
  return { fixture, host: fixture.componentInstance, chips, input };
}

test('setValue redraws the chips, and null or a non-array draws none', () => {
  const { fixture, host, chips } = render();
  try {
    assert.deepEqual(chips(), ['Europe']);
    host.control.setValue(['us', 'eu']);
    fixture.detectChanges();
    assert.deepEqual(chips(), ['Americas', 'Europe']);
    host.control.setValue(null);
    fixture.detectChanges();
    assert.deepEqual(chips(), []);
    host.control.setValue('eu');
    fixture.detectChanges();
    assert.deepEqual(chips(), []);
  } finally { fixture.destroy(); disposeOverlays(); }
});

test('a choice reports a string array through valueChanges, never the event object', () => {
  const { fixture, host, input } = render();
  try {
    const seen: unknown[] = [];
    host.control.valueChanges.subscribe((value) => seen.push(value));
    input.value = 'amer';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    assert.deepEqual(seen, [['eu', 'us']]);
  } finally { fixture.destroy(); disposeOverlays(); }
});

test('a value just added draws a chip and can be removed by choosing it again', () => {
  const { fixture, host, chips, input } = render();
  try {
    const seen: unknown[] = [];
    host.control.valueChanges.subscribe((value) => seen.push(value));
    const pick = () => {
      input.value = 'amer';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      fixture.detectChanges();
    };
    pick();
    assert.deepEqual(chips(), ['Europe', 'Americas']);
    pick();
    assert.deepEqual(seen, [['eu', 'us'], ['eu']]);
    assert.deepEqual(chips(), ['Europe']);
  } finally { fixture.destroy(); disposeOverlays(); }
});

test('disable() disables the field', () => {
  const { fixture, host, input } = render();
  try {
    host.control.disable();
    fixture.detectChanges();
    assert.equal(input.disabled, true);
  } finally { fixture.destroy(); }
});

test('leaving the field marks it touched', () => {
  const { fixture, host, input } = render();
  try {
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    assert.equal(host.control.touched, true);
  } finally { fixture.destroy(); }
});

test('focus moving from the field to a chip inside the control leaves it untouched; leaving the control touches it', () => {
  const { fixture, host, input } = render();
  try {
    const chip = fixture.nativeElement.querySelector('[data-arena-part="tag.close"]') as HTMLElement;
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: chip }));
    assert.equal(host.control.touched, false);
    chip.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));
    assert.equal(host.control.touched, true);
  } finally { fixture.destroy(); }
});
