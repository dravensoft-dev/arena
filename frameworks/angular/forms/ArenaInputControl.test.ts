import { useTestEnvironment } from '../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ArenaInput } from '../components/forms/arena-input/ArenaInput';
import { ArenaInputControl } from './ArenaInputControl';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, ArenaInput, ArenaInputControl],
  template: `<arena-input label="Name" [formControl]="control" /><arena-input label="Seats" type="number" [formControl]="seats" />`,
})
class Host {
  control = new FormControl<string>('Ada', { nonNullable: true });
  seats = new FormControl<number | null>(2);
}

function render() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const el = root.querySelector('input') as HTMLInputElement;
  return { fixture, host: fixture.componentInstance, el, root };
}

test('setValue redraws the control', () => {
  const { fixture, host, el } = render();
  try {
    host.control.setValue('Grace');
    fixture.detectChanges();
    assert.equal(el.value, 'Grace');
  } finally { fixture.destroy(); }
});

test('a change reports through valueChanges', () => {
  const { fixture, host, el } = render();
  try {
    const seen: unknown[] = [];
    host.control.valueChanges.subscribe((value) => seen.push(value));
    el.value = 'Lin';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    assert.deepEqual(seen, ['Lin']);
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

test('a number input reports a number, and an emptied one reports null', () => {
  const { fixture, host, root } = render();
  try {
    const seats = root.querySelectorAll('input')[1] as HTMLInputElement;
    seats.value = '7';
    seats.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(host.seats.value, 7);
    seats.value = '';
    seats.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(host.seats.value, null);
  } finally { fixture.destroy(); }
});
