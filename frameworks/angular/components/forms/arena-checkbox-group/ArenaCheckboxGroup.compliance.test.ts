/* Tab order and Space are the PLATFORM's: each native checkbox is its own tab stop and toggles on
 * Space, and happy-dom implements neither, so what is asserted is the structural precondition (the
 * host carries role="group" and the name, one shared form name, no tabindex Arena authored) and the
 * set the group reports, which is Arena's own arithmetic. Each box pulls its state from the group
 * through the state the group provides, so a box under @for or inside a wrapper is reached too. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import type { ArenaValueSet } from '../../../Api.generated';
import { forgetArenaWarnings } from '../../../WarnOnce';
import { ArenaCheckbox } from '../arena-checkbox/ArenaCheckbox';
import { ArenaCheckboxGroup } from './ArenaCheckboxGroup';
import { ArenaCheckboxControl } from '../../../forms/ArenaCheckboxControl';
import { ArenaCheckboxGroupControl } from '../../../forms/ArenaCheckboxGroupControl';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'forms/arena-checkbox-group/ArenaCheckboxGroup.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaCheckbox],
  selector: 'app-wrapped-box',
  template: `<arena-checkbox [value]="value()" [label]="value()" />`,
})
class WrappedBox {
  readonly value = input.required<string>();
}

@Component({
  standalone: true,
  imports: [ArenaCheckboxGroup, ArenaCheckbox, WrappedBox],
  template: `
    <arena-checkbox-group [ariaLabel]="ariaLabel" [name]="name" [value]="value" (valueChange)="seen.push($event); log.push('group')">
      <arena-checkbox value="deploys" label="Deploys" (valueChange)="own.push($event); log.push('box')" />
      @for (item of more; track item) { <arena-checkbox [value]="item" [label]="item" /> }
      <app-wrapped-box value="digest" />
    </arena-checkbox-group>
  `,
})
class GroupHost {
  ariaLabel = 'Notify me about';
  name: string | undefined = 'notify';
  value: readonly string[] | undefined = ['incidents'];
  more = ['incidents'];
  seen: ArenaValueSet[] = [];
  own: boolean[] = [];
  log: string[] = [];
}

@Component({
  standalone: true,
  imports: [ArenaCheckboxGroup, ArenaCheckbox],
  template: `
    <arena-checkbox-group ariaLabel="One"><arena-checkbox value="a" label="A" /><arena-checkbox value="b" label="B" /></arena-checkbox-group>
    <arena-checkbox-group ariaLabel="Two"><arena-checkbox value="a" label="A" /></arena-checkbox-group>
    <arena-checkbox-group ariaLabel="Three" name=""><arena-checkbox value="a" label="A" /></arena-checkbox-group>
  `,
})
class TwoGroupsHost {}

@Component({
  standalone: true,
  imports: [ArenaCheckboxGroup, ArenaCheckbox],
  template: `<arena-checkbox-group ariaLabel="Notify me about"><arena-checkbox label="Deploys" /></arena-checkbox-group>`,
})
class ValuelessHost {}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, ArenaCheckboxGroup, ArenaCheckbox, ArenaCheckboxControl],
  template: `<arena-checkbox-group ariaLabel="Notify me about" (valueChange)="log.push('group')"><arena-checkbox value="deploys" label="Deploys" [formControl]="own" (valueChange)="log.push('box')" /></arena-checkbox-group>`,
})
class BoxControlHost {
  own = new FormControl(false);
  log: string[] = [];
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, ArenaCheckboxGroup, ArenaCheckbox, ArenaCheckboxGroupControl],
  template: `<arena-checkbox-group ariaLabel="Notify me about" [value]="['deploys']" [formControl]="control"><arena-checkbox value="deploys" label="Deploys" /><arena-checkbox value="incidents" label="Incidents" /></arena-checkbox-group>`,
})
class DoubleBoundHost {
  control = new FormControl<string[] | null>(['incidents']);
}

@Component({
  standalone: true,
  imports: [ArenaCheckboxGroup, ArenaCheckbox],
  template: `<arena-checkbox-group ariaLabel="Notify me about" [value]="['deploys']"><arena-checkbox value="deploys" label="Deploys" [checked]="false" /><arena-checkbox value="incidents" label="Incidents" checked /></arena-checkbox-group>`,
})
class BoundCheckedHost {}

function render(patch: Partial<GroupHost> = {}) {
  const fixture = TestBed.createComponent(GroupHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const group = host.querySelector('arena-checkbox-group') as HTMLElement;
  const boxes = () => Array.from(host.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
  const toggle = (index: number) => {
    const box = boxes()[index]!;
    box.checked = !box.checked;
    box.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
  };
  return { fixture, host, group, boxes, toggle };
}

test('the group is the host, carrying role="group", the name and one shared form name', () => {
  const { fixture, host, group, boxes } = render();
  try {
    assert.equal(group.getAttribute('role'), 'group');
    assert.equal(group.getAttribute('aria-label'), 'Notify me about');
    assert.match(group.getAttribute('class') ?? '', /arena-checkbox__group/);
    assert.equal(group.hasAttribute('name'), false, 'the form name belongs to the boxes, never to the host');
    assert.equal(boxes().length, 3, 'a box under @for and one inside a wrapper are both in the group');
    assert.deepEqual([...new Set(boxes().map((box) => box.getAttribute('name')))], ['notify']);
    assert.deepEqual(boxes().map((box) => box.checked), [false, true, false]);
    assert.equal(host.querySelectorAll('[tabindex]').length, 0);
    assertPattern({ root: group, bindingPath: BINDING, subjects: { default: group } });
  } finally { fixture.destroy(); }
});

test('the set is reported in the order it was ticked, exactly once per toggle, after the box\'s own change', () => {
  const { fixture, toggle, boxes } = render({ value: undefined });
  try {
    toggle(2);
    toggle(0);
    toggle(1);
    toggle(0);
    assert.deepEqual(fixture.componentInstance.seen.map((set) => set.values), [
      ['digest'], ['digest', 'deploys'], ['digest', 'deploys', 'incidents'], ['digest', 'incidents'],
    ]);
    assert.deepEqual(fixture.componentInstance.log, ['group', 'box', 'group', 'group', 'box', 'group'],
      'the box reports its own change before the group reports the set');
    assert.deepEqual(fixture.componentInstance.own, [true, false], 'the box still reports its own change');
    assert.deepEqual(boxes().map((box) => box.checked), [false, true, true], 'an uncontrolled group governs itself');
  } finally { fixture.destroy(); }
});

test('a controlled value is drawn, and a value that matches no box is kept rather than dropped', () => {
  const { fixture, toggle } = render({ value: ['retired'] });
  try {
    toggle(0);
    assert.deepEqual(fixture.componentInstance.seen[0]?.values, ['retired', 'deploys']);
  } finally { fixture.destroy(); }
});

test('an omitted name is generated, shared by every box, and differs between two groups', () => {
  const fixture = TestBed.createComponent(TwoGroupsHost);
  fixture.detectChanges();
  try {
    const names = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('arena-checkbox-group'))
      .map((group) => [...new Set(Array.from(group.querySelectorAll('input')).map((box) => box.getAttribute('name')))]);
    assert.equal(names[0]?.length, 1);
    assert.ok(names[0]?.[0]);
    assert.notEqual(names[0]?.[0], names[1]?.[0]);
    assert.ok(names[2]?.[0], 'an empty name is generated as an omitted one is');
    assert.notEqual(names[2]?.[0], names[0]?.[0]);
  } finally { fixture.destroy(); }
});

test('a box with no value throws inside a group, naming the box', () => {
  const fixture = TestBed.createComponent(ValuelessHost);
  try {
    assert.throws(() => fixture.detectChanges(), /ArenaCheckbox: `value` is required inside an ArenaCheckboxGroup/);
  } finally {
    try { fixture.destroy(); } catch { return; }
  }
});

test('a checked bound on a box inside a group is ignored and warns once', () => {
  forgetArenaWarnings();
  const warnings: unknown[] = [];
  const original = console.warn;
  console.warn = (message: unknown) => { warnings.push(message); };
  const fixture = TestBed.createComponent(BoundCheckedHost);
  try {
    fixture.detectChanges();
    const boxes = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('input')) as HTMLInputElement[];
    assert.deepEqual(boxes.map((box) => box.checked), [true, false], 'the group value is drawn, not the box\'s checked');
    assert.equal(warnings.length, 1);
    assert.match(String(warnings[0]), /ArenaCheckbox: `checked` is bound inside an ArenaCheckboxGroup/);
  } finally {
    console.warn = original;
    fixture.destroy();
  }
});

test('an ariaLabel bound to nothing throws, because input.required only proves it was bound', () => {
  const fixture = TestBed.createComponent(GroupHost);
  fixture.componentInstance.ariaLabel = '  ';
  try {
    assert.throws(() => fixture.detectChanges(), /ArenaCheckboxGroup: .ariaLabel. is required/);
  } finally {
    try { fixture.destroy(); } catch { return; }
  }
});

test('a form directive on a box inside a group hears each toggle but never decides the tick', () => {
  const fixture = TestBed.createComponent(BoxControlHost);
  try {
    fixture.detectChanges();
    const box = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    const heard: unknown[] = [];
    fixture.componentInstance.own.valueChanges.subscribe((value) => heard.push(value));
    fixture.componentInstance.own.setValue(true);
    fixture.detectChanges();
    assert.equal(box.checked, false, 'setValue on the box\'s own control does not tick it');
    box.checked = true;
    box.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    assert.deepEqual(heard, [true, true], 'the box\'s control hears the toggle as a boolean');
    assert.deepEqual(fixture.componentInstance.log, ['box', 'group'], 'and the group reports the set');
    assert.equal(box.checked, true);
  } finally { fixture.destroy(); }
});

test('a value bound beside a form directive warns once and the form\'s value is drawn', () => {
  forgetArenaWarnings();
  const warnings: unknown[] = [];
  const original = console.warn;
  console.warn = (message: unknown) => { warnings.push(message); };
  const fixture = TestBed.createComponent(DoubleBoundHost);
  try {
    fixture.detectChanges();
    const boxes = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('input')) as HTMLInputElement[];
    assert.deepEqual(boxes.map((box) => box.checked), [false, true]);
    assert.equal(warnings.length, 1);
    assert.match(String(warnings[0]), /ArenaCheckboxGroup: `value` is bound while a form directive binds/);
  } finally {
    console.warn = original;
    fixture.destroy();
  }
});
