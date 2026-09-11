import { useTestEnvironment } from '../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ArenaSwitch } from '../components/forms/arena-switch/ArenaSwitch';
import { ArenaSwitchControl } from './ArenaSwitchControl';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, ArenaSwitch, ArenaSwitchControl],
  template: `<arena-switch label="Auto deploy" [formControl]="control" /><arena-switch label="Guarded" [confirm]="true" [formControl]="guarded" />`,
})
class Host {
  control = new FormControl<boolean>(false, { nonNullable: true });
  guarded = new FormControl<boolean>(false, { nonNullable: true });
}

function render() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const el = root.querySelector('button') as HTMLButtonElement;
  return { fixture, host: fixture.componentInstance, el, root };
}

test('setValue redraws the control', () => {
  const { fixture, host, el } = render();
  try {
    host.control.setValue(true);
    fixture.detectChanges();
    assert.equal(el.getAttribute('aria-checked'), 'true');
  } finally { fixture.destroy(); }
});

test('a change reports through valueChanges', () => {
  const { fixture, host, el } = render();
  try {
    const seen: unknown[] = [];
    host.control.valueChanges.subscribe((value) => seen.push(value));
    el.click();
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

test('with confirm, a press reports nothing and asks, and setValue draws the answer', () => {
  const { fixture, host, root } = render();
  try {
    const guarded = root.querySelectorAll('button')[1] as HTMLButtonElement;
    const seen: unknown[] = [];
    host.guarded.valueChanges.subscribe((value) => seen.push(value));
    guarded.click();
    assert.deepEqual(seen, []);
    host.guarded.setValue(true);
    fixture.detectChanges();
    assert.equal(guarded.getAttribute('aria-checked'), 'true');
  } finally { fixture.destroy(); }
});
