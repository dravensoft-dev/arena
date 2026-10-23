import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import { ArenaControlBinding } from '../../../ControlBinding';
import { ArenaFileInput } from './ArenaFileInput';

function render() {
  const fixture = TestBed.createComponent(ArenaFileInput);
  fixture.componentRef.setInput('label', 'Passport scan');
  fixture.componentRef.setInput('multiple', true);
  fixture.detectChanges();
  const binding = fixture.debugElement.injector.get(ArenaControlBinding);
  const root = fixture.nativeElement as HTMLElement;
  const input = root.querySelector('input[type="file"]') as HTMLInputElement;
  const trigger = root.querySelector('[data-arena-part="file-input.trigger"]') as HTMLButtonElement;
  return { fixture, binding, input, trigger };
}

function pick(input: HTMLInputElement, ...names: string[]) {
  const transfer = new DataTransfer();
  for (const name of names) transfer.items.add(new File(['x'], name, { type: 'application/pdf' }));
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

test('a change hands the binding the File objects held, and the output still fires', () => {
  const { fixture, binding, input } = render();
  try {
    const reported: unknown[] = [];
    const emitted: unknown[] = [];
    binding.onChange = (value) => reported.push(value);
    fixture.componentInstance.change.subscribe((value) => emitted.push(value));
    pick(input, 'a.pdf', 'b.pdf');
    assert.equal(reported.length, 1);
    assert.ok(Array.isArray(reported[0]));
    assert.deepEqual((reported[0] as File[]).map((file) => file.name), ['a.pdf', 'b.pdf']);
    assert.ok((reported[0] as File[])[0] instanceof File);
    assert.equal(emitted.length, 1);
  } finally { fixture.destroy(); }
});

test('a chip\'s remove hands the binding what is left', () => {
  const { fixture, binding, input } = render();
  try {
    const reported: File[][] = [];
    binding.onChange = (value) => reported.push(value as File[]);
    pick(input, 'a.pdf', 'b.pdf');
    fixture.detectChanges();
    ((fixture.nativeElement as HTMLElement).querySelector('[data-arena-part="tag.close"]') as HTMLButtonElement).click();
    assert.deepEqual(reported.at(-1)?.map((file) => file.name), ['b.pdf']);
  } finally { fixture.destroy(); }
});

test('the binding\'s disabled state disables the trigger and the hidden input', () => {
  const { fixture, binding, input, trigger } = render();
  try {
    binding.disabled.set(true);
    fixture.detectChanges();
    assert.equal(trigger.disabled, true);
    assert.equal(input.disabled, true);
  } finally { fixture.destroy(); }
});
