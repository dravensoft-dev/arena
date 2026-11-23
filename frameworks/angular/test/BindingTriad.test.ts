/* Eight form controls take their value, change reports and disabled state from a form
 * directive through ArenaControlBinding. Each table is one claim over those controls, one row
 * each; Slider, NumberField, PinInput, Switch and FileInput keep their own binding suites. */

import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Component, viewChild, type Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ArenaControlBinding } from '../ControlBinding';
import { disposeOverlays } from './Overlays';
import { ANGULAR_COMPONENTS } from './Compliance';
import { ArenaCombobox } from '../components/forms/arena-combobox/ArenaCombobox';
import { ArenaSelect } from '../components/forms/arena-select/ArenaSelect';
import { ArenaInput } from '../components/forms/arena-input/ArenaInput';
import { ArenaTextarea } from '../components/forms/arena-textarea/ArenaTextarea';
import { ArenaMultiSelect } from '../components/forms/arena-multi-select/ArenaMultiSelect';
import { ArenaCheckbox } from '../components/forms/arena-checkbox/ArenaCheckbox';
import { ArenaRadioGroup } from '../components/forms/arena-radio-group/ArenaRadioGroup';
import { ArenaRadio } from '../components/forms/arena-radio/ArenaRadio';
import { ArenaCheckboxGroup } from '../components/forms/arena-checkbox-group/ArenaCheckboxGroup';
import type { ArenaValueSet } from '../Api.generated';

const OTHER_SUITES = ['ArenaSlider', 'ArenaNumberField', 'ArenaPinInput', 'ArenaSwitch', 'ArenaFileInput'];

@Component({
  standalone: true,
  imports: [ArenaRadioGroup, ArenaRadio],
  template: `<arena-radio-group ariaLabel="Plan" [value]="initial">
    <arena-radio value="basic" label="Basic" /><arena-radio value="pro" label="Pro" />
  </arena-radio-group>`,
})
class RadioHost {
  initial: string | undefined;
  readonly group = viewChild.required(ArenaRadioGroup);
}

@Component({
  standalone: true,
  imports: [ArenaCheckboxGroup, ArenaCheckbox],
  template: `<arena-checkbox-group ariaLabel="Notify me about">
    <arena-checkbox value="deploys" label="Deploys" /><arena-checkbox value="incidents" label="Incidents" />
  </arena-checkbox-group>`,
})
class GroupHost { readonly group = viewChild.required(ArenaCheckboxGroup); }

interface Rendered {
  fixture: ComponentFixture<unknown>;
  binding: ArenaControlBinding;
  root: HTMLElement;
  output: { subscribe: (next: (value: any) => void) => unknown };
}

interface Row {
  name: string;
  render: (own?: boolean) => Rendered;
  own?: (fixture: ComponentFixture<unknown>) => void;
  warning?: RegExp;
  bound: unknown;
  drawn: (root: HTMLElement) => unknown;
  expectedDrawn: unknown;
  seed?: unknown;
  drive: (root: HTMLElement, fixture: ComponentFixture<unknown>) => void;
  reported: unknown[];
  emitted: unknown[];
  disabled: (root: HTMLElement) => Array<{ disabled: boolean }>;
}

function warnings(run: () => void): string[] {
  const saved = console.warn;
  const heard: string[] = [];
  console.warn = (message: string) => { heard.push(message); };
  try { run(); } finally { console.warn = saved; }
  return heard;
}

function single<T>(type: Type<T>, inputs: Record<string, unknown>): Rendered {
  const fixture = TestBed.createComponent(type);
  for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
  fixture.detectChanges();
  const binding = fixture.debugElement.injector.get(ArenaControlBinding);
  const instance = fixture.componentInstance as unknown as { valueChange: Rendered['output'] };
  return { fixture, binding, root: fixture.nativeElement as HTMLElement, output: instance.valueChange };
}

const PLAN_OPTIONS = [{ value: 'basic', label: 'Basic' }, { value: 'pro', label: 'Pro' }];
const REGION_OPTIONS = [{ value: 'eu', label: 'Europe' }, { value: 'us', label: 'Americas' }];
const type = (el: HTMLInputElement, text: string): void => {
  el.value = text;
  el.dispatchEvent(new Event('input', { bubbles: true }));
};
const enter = (el: Element): void => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
};
const combo = (root: HTMLElement) => root.querySelector('[role="combobox"]') as HTMLInputElement;
const radios = (root: HTMLElement) => [...root.querySelectorAll('input[type="radio"]')] as HTMLInputElement[];
const boxes = (root: HTMLElement) => [...root.querySelectorAll('input[type="checkbox"]')] as HTMLInputElement[];

const ROWS: Row[] = [
  {
    name: 'ArenaCombobox',
    render: () => single(ArenaCombobox, { label: 'Plan', options: PLAN_OPTIONS }),
    own: (fixture) => fixture.componentRef.setInput('value', 'basic'),
    warning: /ArenaCombobox: `value` is bound while a form directive binds the same control/,
    bound: 'pro',
    drawn: (root) => combo(root).value,
    expectedDrawn: 'Pro',
    drive: (root, fixture) => {
      type(combo(root), 'ba');
      fixture.detectChanges();
      enter(combo(root));
    },
    reported: ['basic'],
    emitted: ['basic'],
    disabled: (root) => [combo(root)],
  },
  {
    name: 'ArenaSelect',
    render: () => single(ArenaSelect, { label: 'Plan', options: PLAN_OPTIONS }),
    own: (fixture) => fixture.componentRef.setInput('value', 'basic'),
    warning: /ArenaSelect: `value` is bound while a form directive binds the same control/,
    bound: 'pro',
    drawn: (root) => root.querySelector('select')!.value,
    expectedDrawn: 'pro',
    drive: (root) => {
      const el = root.querySelector('select')!;
      el.value = 'basic';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },
    reported: ['basic'],
    emitted: ['basic'],
    disabled: (root) => [root.querySelector('select')!],
  },
  {
    name: 'ArenaInput',
    render: () => single(ArenaInput, { label: 'Name' }),
    own: (fixture) => fixture.componentRef.setInput('value', 'own'),
    warning: /ArenaInput: `value` is bound while a form directive binds the same control/,
    bound: 'form',
    drawn: (root) => root.querySelector('input')!.value,
    expectedDrawn: 'form',
    drive: (root) => type(root.querySelector('input')!, 'Ada'),
    reported: ['Ada'],
    emitted: ['Ada'],
    disabled: (root) => [root.querySelector('input')!],
  },
  {
    name: 'ArenaTextarea',
    render: () => single(ArenaTextarea, { label: 'Notes' }),
    own: (fixture) => fixture.componentRef.setInput('value', 'own'),
    warning: /ArenaTextarea: `value` is bound while a form directive binds the same control/,
    bound: 'form',
    drawn: (root) => root.querySelector('textarea')!.value,
    expectedDrawn: 'form',
    drive: (root) => type(root.querySelector('textarea') as unknown as HTMLInputElement, 'Ada'),
    reported: ['Ada'],
    emitted: ['Ada'],
    disabled: (root) => [root.querySelector('textarea')!],
  },
  {
    name: 'ArenaMultiSelect',
    render: () => single(ArenaMultiSelect, { label: 'Regions', options: REGION_OPTIONS }),
    own: (fixture) => fixture.componentRef.setInput('value', ['eu']),
    warning: /ArenaMultiSelect: `value` is bound while a form directive binds the same control/,
    bound: ['us'],
    drawn: (root) => Array.from(root.querySelectorAll('arena-tag [data-arena-boundary]')).map((one) => one.textContent?.trim()),
    expectedDrawn: ['Americas'],
    seed: ['eu'],
    drive: (root, fixture) => {
      type(combo(root), 'amer');
      fixture.detectChanges();
      enter(combo(root));
    },
    reported: [['eu', 'us']],
    emitted: [{ values: ['eu', 'us'] }],
    disabled: (root) => [combo(root)],
  },
  {
    name: 'ArenaCheckbox',
    render: () => single(ArenaCheckbox, { label: 'Agree' }),
    own: (fixture) => fixture.componentRef.setInput('checked', false),
    bound: true,
    drawn: (root) => root.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked,
    expectedDrawn: true,
    drive: (root) => {
      const el = root.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
      el.checked = true;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },
    reported: [true],
    emitted: [true],
    disabled: (root) => [root.querySelector<HTMLInputElement>('input[type="checkbox"]')!],
  },
  {
    name: 'ArenaRadioGroup',
    render: (own) => {
      const fixture = TestBed.createComponent(RadioHost);
      fixture.componentInstance.initial = own ? 'basic' : undefined;
      fixture.detectChanges();
      const groupEl = fixture.debugElement.query((node) => node.componentInstance instanceof ArenaRadioGroup);
      return {
        fixture,
        binding: groupEl.injector.get(ArenaControlBinding),
        root: fixture.nativeElement as HTMLElement,
        output: fixture.componentInstance.group().valueChange,
      };
    },
    warning: /ArenaRadioGroup: `value` is bound while a form directive binds the same control/,
    bound: 'pro',
    drawn: (root) => radios(root).map((radio) => radio.checked),
    expectedDrawn: [false, true],
    drive: (root) => {
      const pro = radios(root)[1]!;
      pro.checked = true;
      pro.dispatchEvent(new Event('change', { bubbles: true }));
    },
    reported: ['pro'],
    emitted: ['pro'],
    disabled: (root) => radios(root),
  },
  {
    name: 'ArenaCheckboxGroup',
    render: () => {
      const fixture = TestBed.createComponent(GroupHost);
      fixture.detectChanges();
      const groupEl = fixture.debugElement.query((node) => node.componentInstance instanceof ArenaCheckboxGroup);
      return {
        fixture,
        binding: groupEl.injector.get(ArenaControlBinding),
        root: fixture.nativeElement as HTMLElement,
        output: fixture.componentInstance.group().valueChange,
      };
    },
    bound: ['incidents'],
    drawn: (root) => boxes(root).map((box) => box.checked),
    expectedDrawn: [false, true],
    seed: ['incidents'],
    drive: (root) => {
      const first = boxes(root)[0]!;
      first.checked = true;
      first.dispatchEvent(new Event('change', { bubbles: true }));
    },
    reported: [['incidents', 'deploys']],
    emitted: [{ values: ['incidents', 'deploys'] } satisfies ArenaValueSet],
    disabled: (root) => boxes(root),
  },
];

function injecting(): string[] {
  const found: string[] = [];
  for (const group of readdirSync(ANGULAR_COMPONENTS, { withFileTypes: true })) {
    if (!group.isDirectory()) continue;
    for (const folder of readdirSync(join(ANGULAR_COMPONENTS, group.name), { withFileTypes: true })) {
      if (!folder.isDirectory()) continue;
      for (const file of readdirSync(join(ANGULAR_COMPONENTS, group.name, folder.name))) {
        if (!/^Arena[A-Za-z0-9]*\.ts$/.test(file)) continue;
        const source = readFileSync(join(ANGULAR_COMPONENTS, group.name, folder.name, file), 'utf8');
        if (/inject\(ArenaControlBinding\)/.test(source)) found.push(file.replace(/\.ts$/, ''));
      }
    }
  }
  return found.sort();
}

test('the table covers exactly the form controls that inject ArenaControlBinding, bar those with their own suite', () => {
  const found = injecting();
  assert.ok(found.length > 0, 'no component source injects ArenaControlBinding');
  for (const name of OTHER_SUITES) assert.ok(found.includes(name), `${name} no longer injects ArenaControlBinding`);
  assert.deepEqual(ROWS.map((row) => row.name).sort(), found.filter((name) => !OTHER_SUITES.includes(name)));
});

test('while bound, each control draws the binding\'s value and ignores its own', () => {
  assert.ok(ROWS.length > 0);
  for (const row of ROWS) {
    const { fixture, binding, root } = row.render(true);
    try {
      const heard = warnings(() => {
        row.own?.(fixture);
        binding.bound.set(true);
        binding.value.set(row.bound);
        fixture.detectChanges();
      });
      if (row.warning) {
        assert.equal(heard.length, 1, `${row.name}: one warning`);
        assert.match(heard[0] ?? '', row.warning, `${row.name}: warning text`);
      }
      assert.deepEqual(row.drawn(root), row.expectedDrawn, `${row.name}: drawn value`);
    } finally { fixture.destroy(); }
  }
});

test('while bound, a change calls onChange and the component\'s own output still fires', () => {
  assert.ok(ROWS.length > 0);
  for (const row of ROWS) {
    const { fixture, binding, root, output } = row.render();
    try {
      const reported: unknown[] = [];
      const emitted: unknown[] = [];
      binding.bound.set(true);
      if (row.seed !== undefined) binding.value.set(row.seed);
      binding.onChange = (value) => reported.push(value);
      output.subscribe((value: unknown) => emitted.push(value));
      fixture.detectChanges();
      row.drive(root, fixture);
      assert.deepEqual(reported, row.reported, `${row.name}: reported`);
      assert.deepEqual(emitted, row.emitted, `${row.name}: emitted`);
    } finally { fixture.destroy(); disposeOverlays(); }
  }
});

test('the binding\'s disabled state disables the control', () => {
  assert.ok(ROWS.length > 0);
  for (const row of ROWS) {
    const { fixture, binding, root } = row.render();
    try {
      binding.disabled.set(true);
      fixture.detectChanges();
      const controls = row.disabled(root);
      assert.ok(controls.length > 0, `${row.name}: no control found`);
      for (const control of controls) assert.equal(control.disabled, true, `${row.name}: disabled`);
    } finally { fixture.destroy(); }
  }
});
