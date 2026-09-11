import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaControlBinding } from '../../../ControlBinding';
import { ArenaRadioGroup } from './ArenaRadioGroup';
import { ArenaRadio } from '../arena-radio/ArenaRadio';

@Component({
  standalone: true,
  imports: [ArenaRadioGroup, ArenaRadio],
  template: `<arena-radio-group ariaLabel="Plan" value="basic">
    <arena-radio value="basic" label="Basic" /><arena-radio value="pro" label="Pro" />
  </arena-radio-group>`,
})
class Host { readonly group = viewChild.required(ArenaRadioGroup); }

function render() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const groupEl = fixture.debugElement.query((node) => node.componentInstance instanceof ArenaRadioGroup);
  const binding = groupEl.injector.get(ArenaControlBinding);
  const radios = [...(fixture.nativeElement as HTMLElement).querySelectorAll('input[type="radio"]')] as HTMLInputElement[];
  return { fixture, binding, radios };
}

test('while bound, the group draws the binding\'s value and ignores its own', () => {
  const { fixture, binding, radios } = render();
  try {
    binding.bound.set(true);
    binding.value.set('pro');
    fixture.detectChanges();
    assert.equal(radios[1]?.checked, true);
    assert.equal(radios[0]?.checked, false);
  } finally { fixture.destroy(); }
});

test('while bound, choosing calls onChange and the change output still fires', () => {
  const { fixture, binding, radios } = render();
  try {
    const reported: unknown[] = [];
    const emitted: string[] = [];
    binding.bound.set(true);
    binding.onChange = (value) => reported.push(value);
    fixture.componentInstance.group().change.subscribe((value: string) => emitted.push(value));
    radios[1]!.checked = true;
    radios[1]!.dispatchEvent(new Event('change', { bubbles: true }));
    assert.deepEqual(reported, ['pro']);
    assert.deepEqual(emitted, ['pro']);
  } finally { fixture.destroy(); }
});

test('the binding\'s disabled state disables every radio', () => {
  const { fixture, binding, radios } = render();
  try {
    binding.disabled.set(true);
    fixture.detectChanges();
    for (const radio of radios) assert.equal(radio.disabled, true);
  } finally { fixture.destroy(); }
});
