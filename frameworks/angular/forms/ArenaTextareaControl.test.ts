import { useTestEnvironment } from '../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ArenaTextarea } from '../components/forms/arena-textarea/ArenaTextarea';
import { ArenaTextareaControl } from './ArenaTextareaControl';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, ArenaTextarea, ArenaTextareaControl],
  template: `<arena-textarea label="Notes" [formControl]="control" />`,
})
class Host {
  control = new FormControl<string>('Ada', { nonNullable: true });
}

function render() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const el = root.querySelector('textarea') as HTMLTextAreaElement;
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
