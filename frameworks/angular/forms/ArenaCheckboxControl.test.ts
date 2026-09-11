import { useTestEnvironment } from '../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ArenaCheckbox } from '../components/forms/arena-checkbox/ArenaCheckbox';
import { ArenaCheckboxControl } from './ArenaCheckboxControl';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, ArenaCheckbox, ArenaCheckboxControl],
  template: `<arena-checkbox label="Agree" [formControl]="control" />`,
})
class Host {
  control = new FormControl<boolean>(false, { nonNullable: true });
}

function render() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const el = root.querySelector('input[type="checkbox"]') as HTMLInputElement;
  return { fixture, host: fixture.componentInstance, el, root };
}

test('setValue redraws the control', () => {
  const { fixture, host, el } = render();
  try {
    host.control.setValue(true);
    fixture.detectChanges();
    assert.equal(el.checked, true);
  } finally { fixture.destroy(); }
});

test('a change reports through valueChanges', () => {
  const { fixture, host, el } = render();
  try {
    const seen: unknown[] = [];
    host.control.valueChanges.subscribe((value) => seen.push(value));
    el.checked = true;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    assert.deepEqual(seen, [true]);
  } finally { fixture.destroy(); }
});

test('disable() disables the control', () => {
  const { fixture, host, el } = render();
  try {
    host.control.disable();
    fixture.detectChanges();
    assert.equal(el.disabled, true);
  } finally { fixture.destroy(); }
});

test('leaving the control marks it touched', () => {
  const { fixture, host, el } = render();
  try {
    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    assert.equal(host.control.touched, true);
  } finally { fixture.destroy(); }
});
