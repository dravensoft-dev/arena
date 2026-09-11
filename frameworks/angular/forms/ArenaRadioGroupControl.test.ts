import { useTestEnvironment } from '../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ArenaRadioGroup } from '../components/forms/arena-radio-group/ArenaRadioGroup';
import { ArenaRadio } from '../components/forms/arena-radio/ArenaRadio';
import { ArenaRadioGroupControl } from './ArenaRadioGroupControl';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, ArenaRadioGroup, ArenaRadioGroupControl, ArenaRadio],
  template: `<arena-radio-group ariaLabel="Plan" [formControl]="control"><arena-radio value="basic" label="Basic" /><arena-radio value="pro" label="Pro" /></arena-radio-group>`,
})
class Host {
  control = new FormControl<string>('basic', { nonNullable: true });
}

let current: HTMLElement | null = null;
const radios = () => [...(current?.querySelectorAll('input[type="radio"]') ?? [])] as HTMLInputElement[];

function render() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  current = root;
  const el = root.querySelector('input[type="radio"]') as HTMLInputElement;
  return { fixture, host: fixture.componentInstance, el, root };
}

test('setValue redraws the control', () => {
  const { fixture, host, el } = render();
  try {
    host.control.setValue('pro');
    fixture.detectChanges();
    assert.equal(radios()[1]?.checked, true);
  } finally { fixture.destroy(); }
});

test('a change reports through valueChanges', () => {
  const { fixture, host, el } = render();
  try {
    const seen: unknown[] = [];
    host.control.valueChanges.subscribe((value) => seen.push(value));
    const pro = radios()[1]!;
    pro.checked = true;
    pro.dispatchEvent(new Event('change', { bubbles: true }));
    assert.deepEqual(seen, ['pro']);
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
