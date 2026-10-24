import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import { ArenaControlBinding } from '../../../ControlBinding';
import { disposeOverlays } from '../../../test/Overlays';
import { ArenaMultiSelect } from './ArenaMultiSelect';

function warnings(run: () => void): string[] {
  const saved = console.warn;
  const heard: string[] = [];
  console.warn = (message: string) => { heard.push(message); };
  try { run(); } finally { console.warn = saved; }
  return heard;
}

function render() {
  const fixture = TestBed.createComponent(ArenaMultiSelect);
  fixture.componentRef.setInput('label', 'Regions');
  fixture.componentRef.setInput('options', [{ value: 'eu', label: 'Europe' }, { value: 'us', label: 'Americas' }]);
  fixture.detectChanges();
  const binding = fixture.debugElement.injector.get(ArenaControlBinding);
  const host = fixture.nativeElement as HTMLElement;
  return { fixture, binding, host, el: host.querySelector('[role="combobox"]') as HTMLInputElement };
}

test('while bound, the control draws the binding\'s set and ignores its own', () => {
  const { fixture, binding, host } = render();
  try {
    const heard = warnings(() => {
      fixture.componentRef.setInput('value', ['eu']);
      binding.bound.set(true);
      binding.value.set(['us']);
      fixture.detectChanges();
    });
    assert.equal(heard.length, 1);
    assert.match(heard[0] ?? '', /ArenaMultiSelect: `value` is bound while a form directive binds the same control/);
    assert.deepEqual(Array.from(host.querySelectorAll('arena-tag [data-arena-boundary]')).map((one) => one.textContent?.trim()), ['Americas']);
  } finally { fixture.destroy(); }
});

test('while bound, a choice calls onChange with the array and the output still carries the object', () => {
  const { fixture, binding, el } = render();
  try {
    const reported: unknown[] = [];
    const emitted: unknown[] = [];
    binding.bound.set(true);
    binding.value.set(['eu']);
    binding.onChange = (value) => reported.push(value);
    fixture.componentInstance.valueChange.subscribe((set: unknown) => emitted.push(set));
    fixture.detectChanges();
    el.value = 'amer';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    assert.deepEqual(reported, [['eu', 'us']]);
    assert.deepEqual(emitted, [{ values: ['eu', 'us'] }]);
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
