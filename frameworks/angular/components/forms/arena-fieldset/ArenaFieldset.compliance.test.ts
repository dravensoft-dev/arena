/* The host is a bare display: contents element, so the subject of the group pattern is the real
 * fieldset inside it. The pattern requires the role alone, so the legend naming the fieldset is
 * asserted by hand, as HTML-AAM maps it. The disabled cascade is the platform's and happy-dom does
 * not compute it, so its precondition is asserted: the attribute on a real fieldset holding every
 * control. The two guards run here because only a render sees them. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaFieldset } from './ArenaFieldset';
import { ArenaCheckbox } from '../arena-checkbox/ArenaCheckbox';
import { ArenaInput } from '../arena-input/ArenaInput';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';
import { assertSameNode } from '../../../test/NodeAssert';

const BINDING = join(ANGULAR_COMPONENTS, 'forms/arena-fieldset/ArenaFieldset.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaFieldset, ArenaCheckbox, ArenaInput],
  template: `
    <arena-fieldset [legend]="legend" [hint]="hint" [error]="error" [disabled]="disabled">
      <arena-checkbox label="Deploys" name="notify" value="deploys" />
      <arena-input label="Digest address" />
    </arena-fieldset>
  `,
})
class FieldsetHost {
  legend = 'Notifications';
  hint: string | undefined = undefined;
  error: string | undefined = undefined;
  disabled = false;
}

@Component({
  standalone: true,
  imports: [ArenaFieldset],
  template: `<arena-fieldset legend="Notifications" />`,
})
class ChildlessHost {}

@Component({
  standalone: true,
  imports: [ArenaFieldset],
  template: `<arena-fieldset legend="Notifications">@if (false) { <span>x</span> }</arena-fieldset>`,
})
class FalseConditionalHost {}

@Component({
  standalone: true,
  imports: [ArenaFieldset],
  template: `
    <arena-fieldset legend="One" hint="First"><span>A</span></arena-fieldset>
    <arena-fieldset legend="Two" hint="Second"><span>B</span></arena-fieldset>
  `,
})
class TwoHost {}

@Component({
  standalone: true,
  imports: [ArenaFieldset],
  template: `<arena-fieldset legend="Notifications" disabled><span>A</span></arena-fieldset>`,
})
class StaticDisabledHost {}

function render(patch: Partial<FieldsetHost> = {}) {
  const fixture = TestBed.createComponent(FieldsetHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  return fixture;
}

const fieldsetOf = (fixture: { nativeElement: HTMLElement }) =>
  fixture.nativeElement.querySelector('fieldset') as HTMLFieldSetElement;

test('arena-fieldset meets the group pattern on the real fieldset, named by its legend and nothing else', () => {
  const fixture = render();
  try {
    const host = fixture.nativeElement.querySelector('arena-fieldset') as HTMLElement;
    const fieldset = fieldsetOf(fixture);
    assert.equal(host.getAttribute('style'), 'display: contents;');
    assert.equal(host.getAttribute('role'), null, 'the host is inert; the fieldset carries the role');
    assert.equal(fieldset.firstElementChild?.tagName, 'LEGEND');
    assert.equal(fieldset.firstElementChild?.textContent, 'Notifications');
    assert.equal(fieldset.hasAttribute('aria-labelledby'), false);
    assert.equal(fieldset.hasAttribute('aria-label'), false);
    assertPattern({ root: host, bindingPath: BINDING, subjects: { default: fieldset } });
  } finally { fixture.destroy(); }
});

test('disabled sits on the real fieldset that holds every native control, and never on the host', () => {
  const fixture = render({ disabled: true });
  try {
    const fieldset = fieldsetOf(fixture);
    assert.equal(fieldset.disabled, true);
    const inputs = Array.from(fieldset.querySelectorAll('input'));
    assert.equal(inputs.length, 2);
    for (const input of inputs) assertSameNode(input.closest('fieldset[disabled]'), fieldset);
  } finally { fixture.destroy(); }

  const bare = TestBed.createComponent(StaticDisabledHost);
  bare.detectChanges();
  try {
    const host = bare.nativeElement.querySelector('arena-fieldset') as HTMLElement;
    assert.equal(host.hasAttribute('disabled'), false, 'a static attribute on the inert host is cleared');
    assert.equal(bare.nativeElement.querySelector('fieldset').disabled, true, 'and it still sets the input');
  } finally { bare.destroy(); }
});

test('the hint is the set\'s description, and the error replaces it with the glyph inside its line', () => {
  const hinted = render({ hint: 'At most once a day.' });
  try {
    const fieldset = fieldsetOf(hinted);
    const id = fieldset.getAttribute('aria-describedby')!;
    assert.equal(fieldset.querySelector(`[id="${id}"]`)?.textContent?.trim(), 'At most once a day.');
  } finally { hinted.destroy(); }

  const failed = render({ hint: 'At most once a day.', error: 'Choose at least one.' });
  try {
    const fieldset = fieldsetOf(failed);
    const line = fieldset.querySelector(`[id="${fieldset.getAttribute('aria-describedby')}"]`)!;
    assert.equal(line.textContent?.trim(), 'Choose at least one.');
    assert.equal(line.querySelector('svg')?.getAttribute('aria-hidden'), 'true');
    assert.equal(fieldset.textContent?.includes('At most once a day.'), false, 'the error wins over the hint');
    assert.equal(fieldset.hasAttribute('aria-invalid'), false);
  } finally { failed.destroy(); }

  const plain = render();
  try {
    assert.equal(fieldsetOf(plain).hasAttribute('aria-describedby'), false);
  } finally { plain.destroy(); }
});

test('two fieldsets on one page describe themselves by ids that differ', () => {
  const fixture = TestBed.createComponent(TwoHost);
  fixture.detectChanges();
  try {
    const [a, b] = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('fieldset'))
      .map((f) => f.getAttribute('aria-describedby'));
    assert.ok(a && b);
    assert.notEqual(a, b);
  } finally { fixture.destroy(); }
});

test('a legend of nothing but spaces is refused', () => {
  const fixture = TestBed.createComponent(FieldsetHost);
  fixture.componentInstance.legend = '   ';
  try {
    assert.throws(() => fixture.detectChanges(), /ArenaFieldset: `legend` is required/);
  } finally { fixture.destroy(); }
});

test('a fieldset with nothing projected is refused, because its legend would name nothing', () => {
  const fixture = TestBed.createComponent(ChildlessHost);
  try {
    assert.throws(() => fixture.detectChanges(), /not a legal shape/);
  } finally { fixture.destroy(); }
});

test('a fieldset whose only child is a false conditional counts as childless', () => {
  const fixture = TestBed.createComponent(FalseConditionalHost);
  try {
    assert.throws(() => fixture.detectChanges(), /not a legal shape/);
  } finally { fixture.destroy(); }
});
