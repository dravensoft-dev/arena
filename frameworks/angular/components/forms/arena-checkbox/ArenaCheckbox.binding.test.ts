import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaControlBinding } from '../../../ControlBinding';
import { ArenaCheckbox } from './ArenaCheckbox';
import { ArenaCheckboxGroup } from '../arena-checkbox-group/ArenaCheckboxGroup';

function render() {
  const fixture = TestBed.createComponent(ArenaCheckbox);
  fixture.componentRef.setInput('label', 'Agree');
  fixture.detectChanges();
  const binding = fixture.debugElement.injector.get(ArenaControlBinding);
  const el = (fixture.nativeElement as HTMLElement).querySelector('input[type="checkbox"]') as HTMLInputElement;
  return { fixture, binding, el };
}

test('while bound, the control draws the binding\'s value and ignores its own', () => {
  const { fixture, binding, el } = render();
  try {
    fixture.componentRef.setInput('checked', false);
    binding.bound.set(true);
    binding.value.set(true);
    fixture.detectChanges();
    assert.equal(el.checked, true);
  } finally { fixture.destroy(); }
});

test('while bound, a change calls onChange and the component\'s own output still fires', () => {
  const { fixture, binding, el } = render();
  try {
    const reported: unknown[] = [];
    const emitted: unknown[] = [];
    binding.bound.set(true);
    binding.onChange = (value) => reported.push(value);
    fixture.componentInstance.change.subscribe((value: unknown) => emitted.push(value));
    fixture.detectChanges();
    el.checked = true;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    assert.deepEqual(reported, [true]);
    assert.deepEqual(emitted, [true]);
  } finally { fixture.destroy(); }
});

test('the binding\'s disabled state disables the control', () => {
  const { fixture, binding, el } = render();
  try {
    binding.disabled.set(true);
    fixture.detectChanges();
    assert.equal(el.disabled, true);
  } finally { fixture.destroy(); }
});

@Component({
  standalone: true,
  imports: [ArenaCheckbox],
  template: `<arena-checkbox label="Notify" [checked]="on()" (change)="heard($event)" />`,
})
class HostChecked {
  readonly on = signal(false);
  follow = false;
  readonly seen: boolean[] = [];
  heard(value: boolean): void {
    this.seen.push(value);
    if (this.follow) this.on.set(value);
  }
}

@Component({
  standalone: true,
  imports: [ArenaCheckbox, ArenaCheckboxGroup],
  template: `<arena-checkbox-group ariaLabel="Channels" [value]="initial">
    <arena-checkbox label="A" value="a" /><arena-checkbox label="B" value="b" />
  </arena-checkbox-group>`,
})
class HostGroup {
  initial: string[] = [];
}

function click(el: HTMLInputElement): void {
  el.click();
}

test('a forms-bound click moves the drawn tick, the native box and the control together', () => {
  const { fixture, binding, el } = render();
  try {
    let control: unknown = false;
    binding.bound.set(true);
    binding.value.set(false);
    binding.onChange = (value) => { control = value; };
    fixture.detectChanges();
    click(el);
    fixture.detectChanges();
    assert.equal(binding.value(), true);
    assert.equal(control, true);
    assert.equal(el.checked, true);
    assert.ok((fixture.nativeElement as HTMLElement).querySelector('[data-arena-part="checkbox.check"]'));
  } finally { fixture.destroy(); }
});

test('a host that ignores change keeps the native box equal to the drawn tick', () => {
  const fixture = TestBed.createComponent(HostChecked);
  try {
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const el = root.querySelector('input[type="checkbox"]') as HTMLInputElement;
    click(el);
    fixture.detectChanges();
    assert.deepEqual(fixture.componentInstance.seen, [true]);
    assert.equal(el.checked, false);
    assert.equal(root.querySelector('[data-arena-part="checkbox.check"]'), null);
  } finally { fixture.destroy(); }
});

test('a host that follows change has the box and the tick both on', () => {
  const fixture = TestBed.createComponent(HostChecked);
  try {
    fixture.componentInstance.follow = true;
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const el = root.querySelector('input[type="checkbox"]') as HTMLInputElement;
    click(el);
    fixture.detectChanges();
    assert.equal(el.checked, true);
    assert.ok(root.querySelector('[data-arena-part="checkbox.check"]'));
  } finally { fixture.destroy(); }
});

test('inside a group, the native box equals whether the group holds its value after a click', () => {
  for (const bound of [false, true]) {
    const fixture = TestBed.createComponent(HostGroup);
    try {
      fixture.componentInstance.initial = bound ? [] : ['a'];
      fixture.detectChanges();
      const group = fixture.debugElement.query((node) => node.componentInstance instanceof ArenaCheckboxGroup);
      const binding = group.injector.get(ArenaControlBinding);
      if (bound) {
        binding.bound.set(true);
        binding.value.set(['a']);
        fixture.detectChanges();
      }
      const [a, b] = [...(fixture.nativeElement as HTMLElement).querySelectorAll('input[type="checkbox"]')] as HTMLInputElement[];
      click(b!);
      fixture.detectChanges();
      assert.equal(b!.checked, true, `bound ${bound}`);
      assert.equal(a!.checked, true, `bound ${bound}`);
      click(a!);
      fixture.detectChanges();
      assert.equal(a!.checked, false, `bound ${bound}`);
      assert.equal(b!.checked, true, `bound ${bound}`);
    } finally { fixture.destroy(); }
  }
});
