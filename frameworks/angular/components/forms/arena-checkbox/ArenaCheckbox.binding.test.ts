import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import { ArenaControlBinding } from '../../../ControlBinding';
import { ArenaCheckbox } from './ArenaCheckbox';

function render() {
  const fixture = TestBed.createComponent(ArenaCheckbox);
  fixture.componentRef.setInput('label', 'Agree');
  fixture.detectChanges();
  const binding = fixture.debugElement.injector.get(ArenaControlBinding);
  const el = (fixture.nativeElement as HTMLElement).querySelector('input[type="checkbox"]') as HTMLInputElement;
  return { fixture, binding, el };
}

test('while bound, the control draws the binding\'s value and ignores its own', () => {
  const { fixture, binding, el } = render();
  try {
    fixture.componentRef.setInput('checked', false);
    binding.bound.set(true);
    binding.value.set(true);
    fixture.detectChanges();
    assert.equal(el.checked, true);
  } finally { fixture.destroy(); }
});

test('while bound, a change calls onChange and the component\'s own output still fires', () => {
  const { fixture, binding, el } = render();
  try {
    const reported: unknown[] = [];
    const emitted: unknown[] = [];
    binding.bound.set(true);
    binding.onChange = (value) => reported.push(value);
    fixture.componentInstance.change.subscribe((value: unknown) => emitted.push(value));
    fixture.detectChanges();
    el.checked = true;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    assert.deepEqual(reported, [true]);
    assert.deepEqual(emitted, [true]);
  } finally { fixture.destroy(); }
});

test('the binding\'s disabled state disables the control', () => {
  const { fixture, binding, el } = render();
  try {
    binding.disabled.set(true);
    fixture.detectChanges();
    assert.equal(el.disabled, true);
  } finally { fixture.destroy(); }
});
