/* The number field bound to a form: the form hands it a number or nothing, and the field hands the
 * form a number on a commit and null on a clear, never a string. */

import { useTestEnvironment } from '../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ArenaNumberField } from '../components/forms/arena-number-field/ArenaNumberField';
import { ArenaNumberFieldControl } from './ArenaNumberFieldControl';

@Component({
  selector: 'forms-arena-number-field-control-host',
  standalone: true,
  imports: [ReactiveFormsModule, ArenaNumberField, ArenaNumberFieldControl],
  template: `<arena-number-field label="Replicas" [min]="1" [max]="20" [formControl]="control" />`,
})
class Host {
  control = new FormControl<number | null>(3);
}

function render() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const el = root.querySelector('input[role="spinbutton"]') as HTMLInputElement;
  const commit = (text: string) => {
    el.focus();
    el.dispatchEvent(new FocusEvent('focus'));
    el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.blur();
    el.dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();
  };
  const press = (key: string) => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  return { fixture, host: fixture.componentInstance, el, root, commit, press };
}

test('the form\'s number is drawn, and setValue redraws it', () => {
  const { fixture, host, el } = render();
  try {
    assert.equal(el.value, '3');
    host.control.setValue(12);
    fixture.detectChanges();
    assert.equal(el.value, '12');
  } finally { fixture.destroy(); }
});

test('null, an empty string and NaN draw an empty field', () => {
  const { fixture, host, el } = render();
  try {
    for (const empty of [null, '' as unknown as number, Number.NaN]) {
      host.control.setValue(7);
      fixture.detectChanges();
      host.control.setValue(empty);
      fixture.detectChanges();
      assert.equal(el.value, '', `${String(empty)} drew a number`);
    }
  } finally { fixture.destroy(); }
});

test('a commit hands the form a clamped number, a step hands it the next one, and a clear hands it null', () => {
  const { fixture, host, commit, press } = render();
  try {
    commit('500');
    assert.equal(host.control.value, 20);
    assert.equal(typeof host.control.value, 'number');
    press('ArrowDown');
    assert.equal(host.control.value, 19);
    commit('');
    assert.equal(host.control.value, null);
  } finally { fixture.destroy(); }
});

test('disable() disables the field and its steppers, and leaving the field marks it touched', () => {
  const { fixture, host, el, root } = render();
  try {
    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    assert.equal(host.control.touched, true);
    host.control.disable();
    fixture.detectChanges();
    assert.equal(el.disabled, true);
    for (const button of root.querySelectorAll('button')) assert.equal((button as HTMLButtonElement).disabled, true);
  } finally { fixture.destroy(); }
});
