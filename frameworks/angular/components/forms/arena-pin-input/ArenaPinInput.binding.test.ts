/* A form directive binds the pin input through ArenaControlBinding: the drawn code is the form's,
 * an edit reaches the form as a string, the form's disabled state disables every cell, and binding
 * value as well is warned once. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaControlBinding } from '../../../ControlBinding';
import { forgetArenaWarnings } from '../../../WarnOnce';
import { ArenaPinInput } from './ArenaPinInput';

function warnings(run: () => void): string[] {
  const saved = console.warn;
  const heard: string[] = [];
  console.warn = (message: string) => { heard.push(message); };
  try { run(); } finally { console.warn = saved; }
  return heard;
}

function render() {
  const fixture = TestBed.createComponent(ArenaPinInput);
  fixture.componentRef.setInput('label', 'Verification code');
  fixture.detectChanges();
  const binding = fixture.debugElement.injector.get(ArenaControlBinding);
  const cells = () => [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('[data-arena-part="pin-input.cell"]')];
  return { fixture, binding, cells };
}

test('while bound, the cells draw the binding\'s code, ignore their own value and warn once', () => {
  forgetArenaWarnings();
  const { fixture, binding, cells } = render();
  try {
    const heard = warnings(() => {
      fixture.componentRef.setInput('value', '111');
      binding.bound.set(true);
      binding.value.set('4829');
      fixture.detectChanges();
    });
    assert.equal(heard.length, 1);
    assert.match(heard[0] ?? '', /ArenaPinInput: `value` is bound while a form directive binds the same control/);
    assert.equal(cells().map((cell) => cell.value).join(''), '4829');
  } finally { fixture.destroy(); }
});

test('while bound, an edit hands the form the code and the outputs still fire', () => {
  const { fixture, binding, cells } = render();
  try {
    const reported: unknown[] = [];
    const emitted: unknown[] = [];
    binding.bound.set(true);
    binding.value.set('48');
    binding.onChange = (value) => reported.push(value);
    fixture.componentInstance.valueChange.subscribe((value: unknown) => emitted.push(value));
    fixture.detectChanges();
    const third = cells()[2]!;
    third.focus();
    third.value = '2';
    third.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    assert.deepEqual(reported, ['482']);
    assert.deepEqual(emitted, ['482']);
  } finally { fixture.destroy(); }
});

test('the binding\'s disabled state disables every cell and the hidden field', () => {
  const { fixture, binding, cells } = render();
  try {
    fixture.componentRef.setInput('name', 'otp');
    binding.disabled.set(true);
    fixture.detectChanges();
    for (const cell of cells()) assert.equal(cell.disabled, true);
    assert.equal(((fixture.nativeElement as HTMLElement).querySelector('input[type="hidden"]') as HTMLInputElement).disabled, true);
  } finally { fixture.destroy(); }
});

@Component({
  selector: 'pin-input-controlled-host',
  standalone: true,
  imports: [ArenaPinInput],
  template: `<arena-pin-input label="Verification code" [value]="value()" (valueChange)="value.set($event)" />`,
})
class ControlledHost { readonly value = signal(''); }

test('a controlled pin input keeps both of two edits made before the host re-renders', () => {
  const fixture = TestBed.createComponent(ControlledHost);
  fixture.detectChanges();
  try {
    const cells = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('[data-arena-part="pin-input.cell"]')];
    for (const [index, text] of ['1', '2'].entries()) {
      cells[index]!.focus();
      cells[index]!.value = text;
      cells[index]!.dispatchEvent(new Event('input', { bubbles: true }));
    }
    assert.equal(fixture.componentInstance.value(), '12');
  } finally { fixture.destroy(); }
});
