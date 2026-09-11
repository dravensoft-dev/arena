import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import { ArenaControlBinding } from '../../../ControlBinding';
import { ArenaSwitch } from './ArenaSwitch';

function render(confirm = false) {
  const fixture = TestBed.createComponent(ArenaSwitch);
  fixture.componentRef.setInput('label', 'Auto deploy');
  fixture.componentRef.setInput('confirm', confirm);
  fixture.detectChanges();
  const binding = fixture.debugElement.injector.get(ArenaControlBinding);
  const el = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
  return { fixture, binding, el };
}

test('while bound, the switch draws the binding\'s value and ignores its own state', () => {
  const { fixture, binding, el } = render();
  try {
    fixture.componentRef.setInput('state', false);
    binding.bound.set(true);
    binding.value.set(true);
    fixture.detectChanges();
    assert.equal(el.getAttribute('aria-checked'), 'true');
  } finally { fixture.destroy(); }
});

test('without confirm, a press reports the state it moves to, and funcOn and funcOff still fire', () => {
  const { fixture, binding, el } = render();
  try {
    const reported: unknown[] = [];
    const fired: string[] = [];
    binding.bound.set(true);
    binding.value.set(false);
    binding.onChange = (value) => { reported.push(value); binding.value.set(value); };
    fixture.componentInstance.funcOn.subscribe(() => fired.push('on'));
    fixture.componentInstance.funcOff.subscribe(() => fired.push('off'));
    fixture.detectChanges();
    el.click();
    fixture.detectChanges();
    el.click();
    assert.deepEqual(reported, [true, false]);
    assert.deepEqual(fired, ['on', 'off']);
  } finally { fixture.destroy(); }
});

test('with confirm, a press reports nothing and asks through requestChange', () => {
  const { fixture, binding, el } = render(true);
  try {
    const reported: unknown[] = [];
    let asked = 0;
    binding.bound.set(true);
    binding.onChange = (value) => reported.push(value);
    fixture.componentInstance.requestChange.subscribe(() => { asked += 1; });
    el.click();
    assert.deepEqual(reported, []);
    assert.equal(asked, 1);
  } finally { fixture.destroy(); }
});

test('the binding\'s disabled state disables the switch', () => {
  const { fixture, binding, el } = render();
  try {
    binding.disabled.set(true);
    fixture.detectChanges();
    assert.equal(el.disabled, true);
  } finally { fixture.destroy(); }
});
