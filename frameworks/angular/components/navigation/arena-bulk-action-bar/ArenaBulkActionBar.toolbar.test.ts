/* The toolbar-pattern suite this component's binding requires. The host is the toolbar here, and
 * it drops its role and label entirely when the selection is empty -- before this
 * it announced a labelled region over an empty template, which is a landmark
 * pointing at nothing. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSameNode } from '../../../test/NodeAssert';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { ArenaBulkActionBar } from './ArenaBulkActionBar';
import { arenaBulkActionBarStyles } from './ArenaBulkActionBar.variants';
import type { ArenaBulkAction } from '../../../Api.generated';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'navigation/arena-bulk-action-bar/ArenaBulkActionBar.behaviour.json');

const ACTIONS = [
  { id: 'archive', label: 'Archive', icon: 'ph-bold ph-archive' },
  { id: 'retry', label: 'Retry' },
  { id: 'delete', label: 'Delete', destructive: true },
];

function press(el: Element, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return event;
}

function render(count: number) {
  const fixture = TestBed.createComponent(ArenaBulkActionBar);
  fixture.componentRef.setInput('count', count);
  fixture.componentRef.setInput('actions', ACTIONS);
  fixture.detectChanges();
  return fixture;
}

test('arena-bulk-action-bar is a toolbar with one tab stop, roved by the arrow keys', () => {
  const fixture = render(3);
  try {
    const bar = fixture.nativeElement as HTMLElement;
    assert.equal(bar.getAttribute('role'), 'toolbar', 'the host must be a toolbar, not the region it claimed');
    assert.equal(bar.getAttribute('aria-label'), 'Actions on the selection');

    const controls = Array.from(bar.querySelectorAll<HTMLElement>('button'));
    assert.equal(controls.length, ACTIONS.length + 1, 'every action plus Clear is a toolbar control');

    const stops = () => bar.querySelectorAll('[tabindex="0"]');
    assert.equal(stops().length, 1, 'a toolbar is ONE tab stop');
    assert.equal(stops()[0], controls[0], 'entry must land on the first control');

    controls[0].focus();
    const right = press(controls[0], 'ArrowRight');
    fixture.detectChanges();
    assertSameNode(document.activeElement, controls[1], 'ArrowRight did not move to the next control');
    assert.equal(right.defaultPrevented, true, 'ArrowRight was not claimed by the toolbar');
    assert.equal(stops().length, 1, 'the stop did not rove -- two controls are in the Tab sequence');
    assert.equal(stops()[0], controls[1], 'the tab stop did not follow focus');

    press(controls[1], 'ArrowLeft');
    fixture.detectChanges();
    assertSameNode(document.activeElement, controls[0], 'ArrowLeft did not move to the previous control');

    press(controls[0], 'ArrowLeft');
    fixture.detectChanges();
    assertSameNode(document.activeElement, controls[controls.length - 1],
      'ArrowLeft from the first control did not wrap to the last');

    assertPattern({
      root: bar,
      bindingPath: BINDING,
      subjects: { default: bar },
      behavioural: { 'focus.roving': true, 'keyboard.ArrowRight': true, 'keyboard.ArrowLeft': true },
    });
  } finally {
    fixture.destroy();
  }
});

test('an empty selection drops the role and the label, not only the contents', () => {
  const fixture = render(0);
  try {
    const bar = fixture.nativeElement as HTMLElement;
    assert.equal(bar.getAttribute('role'), null,
      'a toolbar with no controls is a landmark pointing at nothing');
    assert.equal(bar.getAttribute('aria-label'), null, 'and it must not keep a name either');
    assert.equal(bar.querySelectorAll('button').length, 0, 'the template body is gated on the count');
  } finally {
    fixture.destroy();
  }
});

test('the Clear output is `clear` and answers to nothing else, per the API contract\'s event binding', () => {
  const fixture = render(3);
  try {
    const instance = fixture.componentInstance;
    assert.equal(typeof instance.clear, 'object', '`clear` must exist and be an OutputEmitterRef');
    assert.equal('cleared' in instance, false, 'a name the contract does not declare must be absent, not merely aliased');
  } finally { fixture.destroy(); }
});

test('classesFor still resolves a destructive action\'s classes to the same recipe output after the ArenaBulkAction retype', () => {
  const fixture = render(3);
  try {
    const instance = fixture.componentInstance as unknown as {
      classesFor(action: ArenaBulkAction): { action(): string };
    };
    const viaMethod = instance.classesFor({ id: 'delete', label: 'Delete', destructive: true }).action();
    const viaRecipe = arenaBulkActionBarStyles({ destructive: true }).action();
    assert.equal(viaMethod, viaRecipe,
      'the wide shape is what the recipe default resolves, so the two must agree there');
  } finally { fixture.destroy(); }
});
