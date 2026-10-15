import { useTestEnvironment } from '../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ArenaCombobox } from '../components/forms/arena-combobox/ArenaCombobox';
import { disposeOverlays } from '../test/Overlays';
import { ArenaComboboxControl } from './ArenaComboboxControl';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, ArenaCombobox, ArenaComboboxControl],
  template: `<arena-combobox label="Plan" [options]="options" [formControl]="control" />`,
})
class Host {
  options = [{ value: 'basic', label: 'Basic' }, { value: 'pro', label: 'Pro' }];
  control = new FormControl<string | null>('basic');
}

function render() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const el = root.querySelector('[role="combobox"]') as HTMLInputElement;
  return { fixture, host: fixture.componentInstance, el, root };
}

function type(fixture: { detectChanges(): void }, el: HTMLInputElement, text: string) {
  el.value = text;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  fixture.detectChanges();
}

function enter(fixture: { detectChanges(): void }, el: HTMLInputElement) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  fixture.detectChanges();
}

test('setValue redraws the field with the chosen label', () => {
  const { fixture, host, el } = render();
  try {
    assert.equal(el.value, 'Basic');
    host.control.setValue('pro');
    fixture.detectChanges();
    assert.equal(el.value, 'Pro');
  } finally { fixture.destroy(); disposeOverlays(); }
});

test('null, undefined and a value no option holds draw an empty field', () => {
  const { fixture, host, el } = render();
  try {
    host.control.setValue(null);
    fixture.detectChanges();
    assert.equal(el.value, '');
    host.control.setValue('enterprise');
    fixture.detectChanges();
    assert.equal(el.value, '');
    host.control.setValue('pro');
    fixture.detectChanges();
    assert.equal(el.value, 'Pro');
    host.control.setValue(undefined as unknown as string);
    fixture.detectChanges();
    assert.equal(el.value, '');
  } finally { fixture.destroy(); disposeOverlays(); }
});

test('choosing an option reports its value through valueChanges, never its label', () => {
  const { fixture, host, el } = render();
  try {
    const seen: unknown[] = [];
    host.control.valueChanges.subscribe((value) => seen.push(value));
    type(fixture, el, 'pr');
    enter(fixture, el);
    assert.deepEqual(seen, ['pro']);
  } finally { fixture.destroy(); disposeOverlays(); }
});

test('choosing an option redraws the field with the chosen label', () => {
  const { fixture, el } = render();
  try {
    type(fixture, el, 'pr');
    enter(fixture, el);
    assert.equal(el.value, 'Pro');
  } finally { fixture.destroy(); disposeOverlays(); }
});

test('an emptied field committed reports the empty string', () => {
  const { fixture, host, el } = render();
  try {
    const seen: unknown[] = [];
    host.control.valueChanges.subscribe((value) => seen.push(value));
    type(fixture, el, '');
    enter(fixture, el);
    assert.deepEqual(seen, ['']);
  } finally { fixture.destroy(); disposeOverlays(); }
});

test('disable() disables the field', () => {
  const { fixture, host, el } = render();
  try {
    host.control.disable();
    fixture.detectChanges();
    assert.equal(el.disabled, true);
  } finally { fixture.destroy(); disposeOverlays(); }
});

test('leaving the field marks it touched', () => {
  const { fixture, host, el } = render();
  try {
    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    assert.equal(host.control.touched, true);
  } finally { fixture.destroy(); disposeOverlays(); }
});
