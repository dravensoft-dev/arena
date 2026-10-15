import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ArenaValueSet } from '../../../Api.generated';
import { ArenaControlBinding } from '../../../ControlBinding';
import { ArenaCheckboxGroup } from './ArenaCheckboxGroup';
import { ArenaCheckbox } from '../arena-checkbox/ArenaCheckbox';

@Component({
  standalone: true,
  imports: [ArenaCheckboxGroup, ArenaCheckbox],
  template: `<arena-checkbox-group ariaLabel="Notify me about">
    <arena-checkbox value="deploys" label="Deploys" /><arena-checkbox value="incidents" label="Incidents" />
  </arena-checkbox-group>`,
})
class Host { readonly group = viewChild.required(ArenaCheckboxGroup); }

function render() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const groupEl = fixture.debugElement.query((node) => node.componentInstance instanceof ArenaCheckboxGroup);
  const binding = groupEl.injector.get(ArenaControlBinding);
  const boxes = [...(fixture.nativeElement as HTMLElement).querySelectorAll('input[type="checkbox"]')] as HTMLInputElement[];
  return { fixture, binding, boxes };
}

test('while bound, the group draws the binding\'s value and ignores its own', () => {
  const { fixture, binding, boxes } = render();
  try {
    binding.bound.set(true);
    binding.value.set(['incidents']);
    fixture.detectChanges();
    assert.deepEqual(boxes.map((box) => box.checked), [false, true]);
  } finally { fixture.destroy(); }
});

test('while bound, a toggle calls onChange with a fresh set and the change output still fires', () => {
  const { fixture, binding, boxes } = render();
  try {
    const reported: unknown[] = [];
    const emitted: ArenaValueSet[] = [];
    binding.bound.set(true);
    binding.value.set(['incidents']);
    binding.onChange = (value) => reported.push(value);
    fixture.componentInstance.group().change.subscribe((set: ArenaValueSet) => emitted.push(set));
    fixture.detectChanges();
    boxes[0]!.checked = true;
    boxes[0]!.dispatchEvent(new Event('change', { bubbles: true }));
    assert.deepEqual(reported, [['incidents', 'deploys']]);
    assert.deepEqual(emitted, [{ values: ['incidents', 'deploys'] }]);
  } finally { fixture.destroy(); }
});

test('while bound, two toggles in a row each build on the set the earlier ones left', () => {
  const { fixture, binding, boxes } = render();
  try {
    const reported: unknown[] = [];
    binding.bound.set(true);
    binding.value.set(['deploys']);
    binding.onChange = (value) => reported.push(value);
    fixture.detectChanges();
    boxes[1]!.checked = true;
    boxes[1]!.dispatchEvent(new Event('change', { bubbles: true }));
    boxes[0]!.checked = false;
    boxes[0]!.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    assert.deepEqual(reported, [['deploys', 'incidents'], ['incidents']]);
    assert.deepEqual(boxes.map((box) => box.checked), [false, true]);
  } finally { fixture.destroy(); }
});

test('the binding\'s disabled state disables every box', () => {
  const { fixture, binding, boxes } = render();
  try {
    binding.disabled.set(true);
    fixture.detectChanges();
    for (const box of boxes) assert.equal(box.disabled, true);
  } finally { fixture.destroy(); }
});
