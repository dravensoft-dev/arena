/* The pin input bound to a form: the form hands it a code or nothing, every edit hands the form the
 * whole code as a string, and the control is touched only when focus leaves the group, never on a
 * move from one cell to the next. */

import { useTestEnvironment } from '../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ArenaPinInput } from '../components/forms/arena-pin-input/ArenaPinInput';
import { ArenaPinInputControl } from './ArenaPinInputControl';

@Component({
  selector: 'forms-arena-pin-input-control-host',
  standalone: true,
  imports: [ReactiveFormsModule, ArenaPinInput, ArenaPinInputControl],
  template: `<arena-pin-input label="Verification code" [length]="4" [formControl]="control" /><button type="button">Verify</button>`,
})
class Host {
  control = new FormControl<string | null>('48');
}

function render() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const cells = () => [...root.querySelectorAll<HTMLInputElement>('[data-arena-part="pin-input.cell"]')];
  const code = () => cells().map((cell) => cell.value).join('');
  return { fixture, host: fixture.componentInstance, root, cells, code };
}

test('the form\'s code is drawn, setValue redraws it, and null draws empty cells', () => {
  const { fixture, host, code } = render();
  try {
    assert.equal(code(), '48');
    host.control.setValue('4829');
    fixture.detectChanges();
    assert.equal(code(), '4829');
    host.control.setValue(null);
    fixture.detectChanges();
    assert.equal(code(), '');
  } finally { fixture.destroy(); }
});

test('an edit hands the form the whole code as a string', () => {
  const { fixture, host, cells } = render();
  try {
    const third = cells()[2]!;
    third.focus();
    third.value = '2';
    third.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    assert.equal(host.control.value, '482');
  } finally { fixture.destroy(); }
});

test('disable() disables every cell, and enable() gives them back', () => {
  const { fixture, host, cells } = render();
  try {
    host.control.disable();
    fixture.detectChanges();
    assert.ok(cells().every((cell) => cell.disabled));
    host.control.enable();
    fixture.detectChanges();
    assert.ok(cells().every((cell) => !cell.disabled));
  } finally { fixture.destroy(); }
});

test('a move between cells leaves the control untouched, and leaving the group touches it', () => {
  const { fixture, host, root, cells } = render();
  try {
    const [first, second] = cells();
    first!.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: second }));
    assert.equal(host.control.touched, false);
    second!.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: root.querySelector('button') }));
    assert.equal(host.control.touched, true);
  } finally { fixture.destroy(); }
});
