import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import { ArenaControlBinding } from '../../../ControlBinding';
import { ArenaInput } from './ArenaInput';

function render() {
  const fixture = TestBed.createComponent(ArenaInput);
  fixture.componentRef.setInput('label', 'Name');
  fixture.detectChanges();
  const binding = fixture.debugElement.injector.get(ArenaControlBinding);
  const el = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
  return { fixture, binding, el };
}

test('while bound, the control draws the binding\'s value and ignores its own', () => {
  const { fixture, binding, el } = render();
  try {
    fixture.componentRef.setInput('value', 'own');
    binding.bound.set(true);
    binding.value.set('form');
    fixture.detectChanges();
    assert.equal(el.value, 'form');
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
    el.value = 'Ada';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    assert.deepEqual(reported, ['Ada']);
    assert.deepEqual(emitted, ['Ada']);
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
