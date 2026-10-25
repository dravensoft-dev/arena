/* A form directive binds the field through ArenaControlBinding: the drawn number is the form's, a
 * commit reaches the form as a number or as null, and binding value as well is warned once. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaControlBinding } from '../../../ControlBinding';
import { forgetArenaWarnings } from '../../../WarnOnce';
import { ArenaNumberField } from './ArenaNumberField';

function warnings(run: () => void): string[] {
  const saved = console.warn;
  const heard: string[] = [];
  console.warn = (message: string) => { heard.push(message); };
  try { run(); } finally { console.warn = saved; }
  return heard;
}

function render() {
  const fixture = TestBed.createComponent(ArenaNumberField);
  fixture.componentRef.setInput('label', 'Replicas');
  fixture.detectChanges();
  const binding = fixture.debugElement.injector.get(ArenaControlBinding);
  const el = (fixture.nativeElement as HTMLElement).querySelector('input[role="spinbutton"]') as HTMLInputElement;
  return { fixture, binding, el };
}

test('while bound, the field draws the binding\'s number, ignores its own and warns once', () => {
  forgetArenaWarnings();
  const { fixture, binding, el } = render();
  try {
    const heard = warnings(() => {
      fixture.componentRef.setInput('value', 7);
      binding.bound.set(true);
      binding.value.set(12);
      fixture.detectChanges();
    });
    assert.equal(heard.length, 1);
    assert.match(heard[0] ?? '', /ArenaNumberField: `value` is bound while a form directive binds the same control/);
    assert.equal(el.value, '12');
  } finally { fixture.destroy(); }
});

test('while bound, a commit hands the form a number, a clear hands it null, and the outputs still fire', () => {
  const { fixture, binding, el } = render();
  try {
    const reported: unknown[] = [];
    const emitted: unknown[] = [];
    binding.bound.set(true);
    binding.value.set(3);
    binding.onChange = (value) => reported.push(value);
    fixture.componentInstance.valueChange.subscribe((value: unknown) => emitted.push(value));
    fixture.componentInstance.clear.subscribe(() => emitted.push('clear'));
    fixture.detectChanges();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    el.focus();
    el.dispatchEvent(new FocusEvent('focus'));
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.blur();
    el.dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();
    assert.deepEqual(reported, [4, null]);
    assert.deepEqual(emitted, [4, 'clear']);
    assert.equal(el.value, '');
  } finally { fixture.destroy(); }
});

test('the binding\'s disabled state disables the field and both steppers', () => {
  const { fixture, binding } = render();
  try {
    binding.disabled.set(true);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    assert.equal((root.querySelector('input[role="spinbutton"]') as HTMLInputElement).disabled, true);
    for (const button of root.querySelectorAll('button')) assert.equal((button as HTMLButtonElement).disabled, true);
  } finally { fixture.destroy(); }
});

@Component({
  selector: 'number-field-controlled-host',
  standalone: true,
  imports: [ArenaNumberField],
  template: `<arena-number-field label="Replicas" [step]="1" [value]="value()" (valueChange)="value.set($event)" />`,
})
class ControlledHost { readonly value = signal(5); }

@Component({
  selector: 'number-field-clamping-host',
  standalone: true,
  imports: [ArenaNumberField],
  template: `<arena-number-field label="Replicas" [step]="1" [value]="value()" (valueChange)="value.set(clamp($event))" />`,
})
class ClampingHost {
  readonly value = signal(5);
  clamp(next: number) { return Math.min(next, 6); }
}

function arrowUp(fixture: { nativeElement: unknown }, times: number) {
  const input = (fixture.nativeElement as HTMLElement).querySelector('input[role="spinbutton"]') as HTMLInputElement;
  for (let i = 0; i < times; i += 1) input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
  return input;
}

test('a controlled number field keeps both of two steps made before the host re-renders', () => {
  const fixture = TestBed.createComponent(ControlledHost);
  fixture.detectChanges();
  try {
    arrowUp(fixture, 2);
    assert.equal(fixture.componentInstance.value(), 7);
  } finally { fixture.destroy(); }
});

test('a host that clamps the value it is handed is drawn after it re-renders', () => {
  const fixture = TestBed.createComponent(ClampingHost);
  fixture.detectChanges();
  try {
    const input = arrowUp(fixture, 2);
    fixture.detectChanges();
    assert.equal(input.value, '6');
    assert.equal(fixture.componentInstance.value(), 6);
  } finally { fixture.destroy(); }
});
