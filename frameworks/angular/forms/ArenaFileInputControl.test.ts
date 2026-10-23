/* The form's value is a File[], the one adapter value the contract does not state: ControlBinding
 * holds unknown, and the adapter sits outside the contract. A file selection cannot be set from
 * outside, so null or an empty array is a clear that fires nothing and any other value is ignored
 * with one warning. */
import { useTestEnvironment } from '../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ArenaFileInput } from '../components/forms/arena-file-input/ArenaFileInput';
import { forgetArenaWarnings } from '../WarnOnce';
import { ArenaFileInputControl } from './ArenaFileInputControl';

@Component({
  selector: 'forms-arena-file-input-control-host',
  standalone: true,
  imports: [ReactiveFormsModule, ArenaFileInput, ArenaFileInputControl],
  template: `<arena-file-input label="Attachments" multiple [formControl]="control" (change)="changes.push($event)" />`,
})
class Host {
  control = new FormControl<File[] | null>(null);
  changes: unknown[] = [];
}

@Component({
  selector: 'forms-arena-file-input-control-group-host',
  standalone: true,
  imports: [ReactiveFormsModule, ArenaFileInput, ArenaFileInputControl],
  template: `<form [formGroup]="group"><arena-file-input label="Attachments" multiple formControlName="files" /></form>`,
})
class GroupHost {
  group = new FormGroup({ files: new FormControl<File[] | null>(null) });
}

function render() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const input = root.querySelector('input[type="file"]') as HTMLInputElement;
  const pick = (...names: string[]) => {
    const transfer = new DataTransfer();
    for (const name of names) transfer.items.add(new File(['x'], name, { type: 'application/pdf' }));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
  };
  const chips = () => root.querySelectorAll('[data-arena-part="file-input.file"]').length;
  return { fixture, host: fixture.componentInstance, root, input, pick, chips };
}

test('a pick reports a File[] through valueChanges', () => {
  const { fixture, host, pick } = render();
  try {
    const seen: unknown[] = [];
    host.control.valueChanges.subscribe((value) => seen.push(value));
    pick('a.pdf', 'b.pdf');
    assert.equal(seen.length, 1);
    assert.deepEqual((seen[0] as File[]).map((file) => file.name), ['a.pdf', 'b.pdf']);
    assert.ok((seen[0] as File[])[0] instanceof File);
  } finally { fixture.destroy(); }
});

test('setValue(null), setValue([]) and reset() clear the field and report nothing back', () => {
  const { fixture, host, pick, chips, input } = render();
  try {
    for (const clear of [() => host.control.setValue(null), () => host.control.setValue([]), () => host.control.reset()]) {
      pick('a.pdf');
      assert.equal(chips(), 1);
      host.control.markAsPristine();
      host.changes.length = 0;
      const seen: unknown[] = [];
      const sub = host.control.valueChanges.subscribe((value) => seen.push(value));
      clear();
      fixture.detectChanges();
      sub.unsubscribe();
      assert.equal(chips(), 0);
      assert.equal(input.files?.length, 0);
      assert.equal(host.changes.length, 0, 'a clear fires no change output');
      assert.equal(host.control.dirty, false, 'a clear does not mark the control dirty');
      assert.equal(seen.length, 1, 'only the host write emits valueChanges');
      assert.ok(seen.every((value) => value === null || (Array.isArray(value) && value.length === 0)));
    }
  } finally { fixture.destroy(); }
});

test('a value holding files is ignored with one warning, because a selection cannot be set from outside', () => {
  const { fixture, host, chips } = render();
  forgetArenaWarnings();
  const warned: string[] = [];
  const original = console.warn;
  console.warn = (message: string) => { warned.push(message); };
  try {
    host.control.setValue([new File(['x'], 'a.pdf')]);
    host.control.setValue([new File(['x'], 'b.pdf')]);
    fixture.detectChanges();
    assert.equal(chips(), 0);
    assert.equal(warned.length, 1);
    assert.match(warned[0] ?? '', /cannot be set from outside/);
  } finally {
    console.warn = original;
    forgetArenaWarnings();
    fixture.destroy();
  }
});

test('disable() disables the trigger and the hidden input', () => {
  const { fixture, host, root, input } = render();
  try {
    host.control.disable();
    fixture.detectChanges();
    assert.equal((root.querySelector('[data-arena-part="file-input.trigger"]') as HTMLButtonElement).disabled, true);
    assert.equal(input.disabled, true);
  } finally { fixture.destroy(); }
});

test('leaving the control marks it touched', () => {
  const { fixture, host, root } = render();
  try {
    root.querySelector('arena-file-input')?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    assert.equal(host.control.touched, true);
  } finally { fixture.destroy(); }
});

test('the reset of a form directive clears the model with the field', () => {
  const fixture = TestBed.createComponent(GroupHost);
  fixture.detectChanges();
  try {
    const root = fixture.nativeElement as HTMLElement;
    const input = root.querySelector('input[type="file"]') as HTMLInputElement;
    const transfer = new DataTransfer();
    transfer.items.add(new File(['x'], 'a.pdf', { type: 'application/pdf' }));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    const control = fixture.componentInstance.group.controls.files;
    assert.equal(control.value?.length, 1);
    (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('reset', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    assert.equal(control.value, null);
    assert.equal(root.querySelectorAll('[data-arena-part="file-input.file"]').length, 0);
    assert.equal(input.files?.length, 0);
  } finally { fixture.destroy(); }
});
