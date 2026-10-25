import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import { ArenaControlBinding } from '../../../ControlBinding';
import { disposeOverlays } from '../../../test/Overlays';
import { ArenaCombobox } from './ArenaCombobox';

function warnings(run: () => void): string[] {
  const saved = console.warn;
  const heard: string[] = [];
  console.warn = (message: string) => { heard.push(message); };
  try { run(); } finally { console.warn = saved; }
  return heard;
}

function render() {
  const fixture = TestBed.createComponent(ArenaCombobox);
  fixture.componentRef.setInput('label', 'Plan');
  fixture.componentRef.setInput('options', [{ value: 'basic', label: 'Basic' }, { value: 'pro', label: 'Pro' }]);
  fixture.detectChanges();
  const binding = fixture.debugElement.injector.get(ArenaControlBinding);
  const el = (fixture.nativeElement as HTMLElement).querySelector('[role="combobox"]') as HTMLInputElement;
  return { fixture, binding, el };
}

test('while bound, the control draws the binding\'s value and ignores its own', () => {
  const { fixture, binding, el } = render();
  try {
    const heard = warnings(() => {
      fixture.componentRef.setInput('value', 'basic');
      binding.bound.set(true);
      binding.value.set('pro');
      fixture.detectChanges();
    });
    assert.equal(heard.length, 1);
    assert.match(heard[0] ?? '', /ArenaCombobox: `value` is bound while a form directive binds the same control/);
    assert.equal(el.value, 'Pro');
  } finally { fixture.destroy(); }
});

test('while bound, a choice calls onChange and the component\'s own output still fires', () => {
  const { fixture, binding, el } = render();
  try {
    const reported: unknown[] = [];
    const emitted: unknown[] = [];
    binding.bound.set(true);
    binding.onChange = (value) => reported.push(value);
    fixture.componentInstance.valueChange.subscribe((value: unknown) => emitted.push(value));
    fixture.detectChanges();
    el.value = 'ba';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    assert.deepEqual(reported, ['basic']);
    assert.deepEqual(emitted, ['basic']);
  } finally { fixture.destroy(); disposeOverlays(); }
});

test('the binding\'s disabled state disables the control', () => {
  const { fixture, binding, el } = render();
  try {
    binding.disabled.set(true);
    fixture.detectChanges();
    assert.equal(el.disabled, true);
  } finally { fixture.destroy(); }
});
