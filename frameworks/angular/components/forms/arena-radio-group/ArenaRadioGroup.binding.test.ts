import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaControlBinding } from '../../../ControlBinding';
import { ArenaRadioGroup } from './ArenaRadioGroup';
import { ArenaRadio } from '../arena-radio/ArenaRadio';

@Component({
  standalone: true,
  imports: [ArenaRadioGroup, ArenaRadio],
  template: `<arena-radio-group ariaLabel="Plan">
    <arena-radio value="basic" label="Basic" /><arena-radio value="pro" label="Pro" />
  </arena-radio-group>`,
})
class Host {}

function render() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const groupEl = fixture.debugElement.query((node) => node.componentInstance instanceof ArenaRadioGroup);
  const binding = groupEl.injector.get(ArenaControlBinding);
  const radios = [...(fixture.nativeElement as HTMLElement).querySelectorAll('input[type="radio"]')] as HTMLInputElement[];
  return { fixture, binding, radios };
}

const DOT = '[data-arena-part="radio.dot"]';

function dotOn(fixture: { nativeElement: unknown }): string | null {
  const root = fixture.nativeElement as HTMLElement;
  const radios = [...root.querySelectorAll('input[type="radio"]')] as HTMLInputElement[];
  const dot = root.querySelector(DOT);
  return radios.find((radio) => radio.closest('label')?.contains(dot))?.value ?? null;
}

test('a forms-bound click chooses the option and draws the dot there', () => {
  const { fixture, binding, radios } = render();
  try {
    let control: unknown;
    binding.bound.set(true);
    binding.value.set('basic');
    binding.onChange = (value) => { control = value; };
    fixture.detectChanges();
    radios[1]!.click();
    fixture.detectChanges();
    assert.equal(binding.value(), 'pro');
    assert.equal(control, 'pro');
    assert.equal(radios[1]!.checked, true);
    assert.equal(radios[0]!.checked, false);
    assert.equal(dotOn(fixture), 'pro');
  } finally { fixture.destroy(); }
});

@Component({
  standalone: true,
  imports: [ArenaRadioGroup, ArenaRadio],
  template: `<arena-radio-group ariaLabel="Plan" value="a" (valueChange)="seen.push($event)">
    <arena-radio value="a" label="A" /><arena-radio value="b" label="B" />
  </arena-radio-group>`,
})
class Refusing {
  readonly seen: string[] = [];
}

test('a host that holds value and ignores change keeps the native radios and the dot on the held option', () => {
  const fixture = TestBed.createComponent(Refusing);
  try {
    fixture.detectChanges();
    const radios = [...(fixture.nativeElement as HTMLElement).querySelectorAll('input[type="radio"]')] as HTMLInputElement[];
    radios[1]!.click();
    fixture.detectChanges();
    assert.deepEqual(fixture.componentInstance.seen, ['b']);
    assert.equal(radios[0]!.checked, true);
    assert.equal(radios[1]!.checked, false);
    assert.equal(dotOn(fixture), 'a');
  } finally { fixture.destroy(); }
});

@Component({
  standalone: true,
  imports: [ArenaRadioGroup, ArenaRadio],
  template: `<arena-radio-group ariaLabel="Plan" [value]="held()" (valueChange)="held.set($event)">
    <arena-radio value="a" label="A" /><arena-radio value="b" label="B" />
  </arena-radio-group>`,
})
class Following {
  readonly held = signal('a');
}

test('a host that follows change moves the native radios and the dot with each click', () => {
  const fixture = TestBed.createComponent(Following);
  try {
    fixture.detectChanges();
    const radios = [...(fixture.nativeElement as HTMLElement).querySelectorAll('input[type="radio"]')] as HTMLInputElement[];
    radios[1]!.click();
    fixture.detectChanges();
    assert.equal(fixture.componentInstance.held(), 'b');
    assert.equal(radios[1]!.checked, true);
    assert.equal(radios[0]!.checked, false);
    assert.equal(dotOn(fixture), 'b');
    radios[0]!.click();
    fixture.detectChanges();
    assert.equal(fixture.componentInstance.held(), 'a');
    assert.equal(radios[0]!.checked, true);
    assert.equal(radios[1]!.checked, false);
    assert.equal(dotOn(fixture), 'a');
  } finally { fixture.destroy(); }
});
