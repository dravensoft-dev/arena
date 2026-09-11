import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import { ArenaControlBinding } from '../../../ControlBinding';
import { ArenaSelect } from './ArenaSelect';

function render() {
  const fixture = TestBed.createComponent(ArenaSelect);
  fixture.componentRef.setInput('label', 'Plan');
  fixture.componentRef.setInput('options', [{ value: 'basic', label: 'Basic' }, { value: 'pro', label: 'Pro' }]);
  fixture.detectChanges();
  const binding = fixture.debugElement.injector.get(ArenaControlBinding);
  const el = (fixture.nativeElement as HTMLElement).querySelector('select') as HTMLSelectElement;
  return { fixture, binding, el };
}

test('while bound, the control draws the binding\'s value and ignores its own', () => {
  const { fixture, binding, el } = render();
  try {
    fixture.componentRef.setInput('value', 'basic');
    binding.bound.set(true);
    binding.value.set('pro');
    fixture.detectChanges();
    assert.equal(el.value, 'pro');
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
    el.value = 'basic';
    el.dispatchEvent(new Event('change', { bubbles: true }));
    assert.deepEqual(reported, ['basic']);
    assert.deepEqual(emitted, ['basic']);
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
