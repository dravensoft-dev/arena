/* Six form directives (checkbox, radio group, input, switch, textarea, select) bind a
 * FormControl alike: setValue redraws, a change reports through valueChanges, disable() disables
 * the control and leaving it marks it touched. One table per behaviour, one row per directive;
 * the switch's confirm path and the number input keep their own tests, as they need these hosts. */

import { useTestEnvironment } from '../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ArenaCheckbox } from '../components/forms/arena-checkbox/ArenaCheckbox';
import { ArenaRadioGroup } from '../components/forms/arena-radio-group/ArenaRadioGroup';
import { ArenaRadio } from '../components/forms/arena-radio/ArenaRadio';
import { ArenaInput } from '../components/forms/arena-input/ArenaInput';
import { ArenaSwitch } from '../components/forms/arena-switch/ArenaSwitch';
import { ArenaTextarea } from '../components/forms/arena-textarea/ArenaTextarea';
import { ArenaSelect } from '../components/forms/arena-select/ArenaSelect';
import { ArenaCheckboxControl } from './ArenaCheckboxControl';
import { ArenaRadioGroupControl } from './ArenaRadioGroupControl';
import { ArenaInputControl } from './ArenaInputControl';
import { ArenaSwitchControl } from './ArenaSwitchControl';
import { ArenaTextareaControl } from './ArenaTextareaControl';
import { ArenaSelectControl } from './ArenaSelectControl';

@Component({
  selector: 'forms-arena-checkbox-control-host',
  standalone: true,
  imports: [ReactiveFormsModule, ArenaCheckbox, ArenaCheckboxControl],
  template: `<arena-checkbox label="Agree" [formControl]="control" />`,
})
class CheckboxHost {
  control = new FormControl<boolean>(false, { nonNullable: true });
}

@Component({
  selector: 'forms-arena-radio-group-control-host',
  standalone: true,
  imports: [ReactiveFormsModule, ArenaRadioGroup, ArenaRadioGroupControl, ArenaRadio],
  template: `<arena-radio-group ariaLabel="Plan" [formControl]="control"><arena-radio value="basic" label="Basic" /><arena-radio value="pro" label="Pro" /></arena-radio-group>`,
})
class RadioGroupHost {
  control = new FormControl<string>('basic', { nonNullable: true });
}

@Component({
  selector: 'forms-arena-input-control-host',
  standalone: true,
  imports: [ReactiveFormsModule, ArenaInput, ArenaInputControl],
  template: `<arena-input label="Name" [formControl]="control" /><arena-input label="Seats" type="number" [formControl]="seats" />`,
})
class InputHost {
  control = new FormControl<string>('Ada', { nonNullable: true });
  seats = new FormControl<number | null>(2);
}

@Component({
  selector: 'forms-arena-switch-control-host',
  standalone: true,
  imports: [ReactiveFormsModule, ArenaSwitch, ArenaSwitchControl],
  template: `<arena-switch label="Auto deploy" [formControl]="control" /><arena-switch label="Guarded" [confirm]="true" [formControl]="guarded" />`,
})
class SwitchHost {
  control = new FormControl<boolean>(false, { nonNullable: true });
  guarded = new FormControl<boolean>(false, { nonNullable: true });
}

@Component({
  selector: 'forms-arena-textarea-control-host',
  standalone: true,
  imports: [ReactiveFormsModule, ArenaTextarea, ArenaTextareaControl],
  template: `<arena-textarea label="Notes" [formControl]="control" />`,
})
class TextareaHost {
  control = new FormControl<string>('Ada', { nonNullable: true });
}

@Component({
  selector: 'forms-arena-select-control-host',
  standalone: true,
  imports: [ReactiveFormsModule, ArenaSelect, ArenaSelectControl],
  template: `<arena-select label="Plan" [options]="options" [formControl]="control" />`,
})
class SelectHost {
  options = [{ value: 'basic', label: 'Basic' }, { value: 'pro', label: 'Pro' }];
  control = new FormControl<string>('basic', { nonNullable: true });
}

type Field = HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement | HTMLSelectElement;

interface Row {
  name: string;
  host: Type<{ control: FormControl }>;
  el: (root: HTMLElement) => Field;
  set: unknown;
  drawn: (root: HTMLElement) => unknown;
  expectedDrawn: unknown;
  drive: (root: HTMLElement) => void;
  seen: unknown[];
}

const radios = (root: HTMLElement) => [...root.querySelectorAll('input[type="radio"]')] as HTMLInputElement[];
const typeInto = (el: HTMLInputElement | HTMLTextAreaElement) => (text: string): void => {
  el.value = text;
  el.dispatchEvent(new Event('input', { bubbles: true }));
};

const ROWS: Row[] = [
  {
    name: 'ArenaCheckboxControl',
    host: CheckboxHost,
    el: (root) => root.querySelector('input[type="checkbox"]') as HTMLInputElement,
    set: true,
    drawn: (root) => (root.querySelector('input[type="checkbox"]') as HTMLInputElement).checked,
    expectedDrawn: true,
    drive: (root) => {
      const el = root.querySelector('input[type="checkbox"]') as HTMLInputElement;
      el.checked = true;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },
    seen: [true],
  },
  {
    name: 'ArenaRadioGroupControl',
    host: RadioGroupHost,
    el: (root) => root.querySelector('input[type="radio"]') as HTMLInputElement,
    set: 'pro',
    drawn: (root) => radios(root)[1]?.checked,
    expectedDrawn: true,
    drive: (root) => {
      const pro = radios(root)[1]!;
      pro.checked = true;
      pro.dispatchEvent(new Event('change', { bubbles: true }));
    },
    seen: ['pro'],
  },
  {
    name: 'ArenaInputControl',
    host: InputHost,
    el: (root) => root.querySelector('input') as HTMLInputElement,
    set: 'Grace',
    drawn: (root) => (root.querySelector('input') as HTMLInputElement).value,
    expectedDrawn: 'Grace',
    drive: (root) => typeInto(root.querySelector('input') as HTMLInputElement)('Lin'),
    seen: ['Lin'],
  },
  {
    name: 'ArenaSwitchControl',
    host: SwitchHost,
    el: (root) => root.querySelector('button') as HTMLButtonElement,
    set: true,
    drawn: (root) => (root.querySelector('button') as HTMLButtonElement).getAttribute('aria-checked'),
    expectedDrawn: 'true',
    drive: (root) => (root.querySelector('button') as HTMLButtonElement).click(),
    seen: [true],
  },
  {
    name: 'ArenaTextareaControl',
    host: TextareaHost,
    el: (root) => root.querySelector('textarea') as HTMLTextAreaElement,
    set: 'Grace',
    drawn: (root) => (root.querySelector('textarea') as HTMLTextAreaElement).value,
    expectedDrawn: 'Grace',
    drive: (root) => typeInto(root.querySelector('textarea') as HTMLTextAreaElement)('Lin'),
    seen: ['Lin'],
  },
  {
    name: 'ArenaSelectControl',
    host: SelectHost,
    el: (root) => root.querySelector('select') as HTMLSelectElement,
    set: 'pro',
    drawn: (root) => (root.querySelector('select') as HTMLSelectElement).value,
    expectedDrawn: 'pro',
    drive: (root) => {
      const el = root.querySelector('select') as HTMLSelectElement;
      el.value = 'pro';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },
    seen: ['pro'],
  },
];

function render<T>(host: Type<T>) {
  const fixture = TestBed.createComponent(host);
  fixture.detectChanges();
  return { fixture, host: fixture.componentInstance, root: fixture.nativeElement as HTMLElement };
}

test('setValue redraws the control', () => {
  assert.ok(ROWS.length > 0);
  for (const row of ROWS) {
    const { fixture, host, root } = render(row.host);
    try {
      host.control.setValue(row.set);
      fixture.detectChanges();
      assert.equal(row.drawn(root), row.expectedDrawn, `${row.name}: drawn value`);
    } finally { fixture.destroy(); }
  }
});

test('a change reports through valueChanges', () => {
  assert.ok(ROWS.length > 0);
  for (const row of ROWS) {
    const { fixture, host, root } = render(row.host);
    try {
      const seen: unknown[] = [];
      host.control.valueChanges.subscribe((value) => seen.push(value));
      row.drive(root);
      assert.deepEqual(seen, row.seen, `${row.name}: reported`);
    } finally { fixture.destroy(); }
  }
});

test('disable() disables the control', () => {
  assert.ok(ROWS.length > 0);
  for (const row of ROWS) {
    const { fixture, host, root } = render(row.host);
    try {
      host.control.disable();
      fixture.detectChanges();
      assert.equal(row.el(root).disabled, true, `${row.name}: disabled`);
    } finally { fixture.destroy(); }
  }
});

test('leaving the control marks it touched', () => {
  assert.ok(ROWS.length > 0);
  for (const row of ROWS) {
    const { fixture, host, root } = render(row.host);
    try {
      row.el(root).dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      assert.equal(host.control.touched, true, `${row.name}: touched`);
    } finally { fixture.destroy(); }
  }
});

test('with confirm, a press reports nothing and asks, and setValue draws the answer', () => {
  const { fixture, host, root } = render(SwitchHost);
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

test('a number input reports a number, and an emptied one reports null', () => {
  const { fixture, host, root } = render(InputHost);
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
