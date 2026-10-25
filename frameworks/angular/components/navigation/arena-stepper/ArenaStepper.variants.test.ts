/* What arena-stepper draws for each index: the states, the words, the glyphs, the buttons and the
 * index a press reports. */
import { useTestEnvironment, glyphIds, symbol } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ArenaStepperStep } from '../../../Api.generated';
import { assertNoNode } from '../../../test/NodeAssert';
import { ArenaStepper } from './ArenaStepper';

const CHECKOUT: readonly ArenaStepperStep[] = [{ label: 'Account' }, { label: 'Shipping', description: 'Two addresses on file' }, { label: 'Payment' }, { label: 'Review' }];

@Component({
  selector: 'stepper-variants-host',
  standalone: true,
  imports: [ArenaStepper],
  template: `<arena-stepper [ariaLabel]="label" [steps]="steps" [index]="index" [interactive]="interactive" (valueChange)="chosen.push($event)" />`,
})
class VariantsHost {
  label = 'Checkout';
  steps: readonly ArenaStepperStep[] = CHECKOUT;
  index = 1;
  interactive = false;
  chosen: number[] = [];
}

function render(patch: Partial<VariantsHost> = {}) {
  const fixture = TestBed.createComponent(VariantsHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const names = () => Array.from(root.querySelectorAll('[data-arena-part="stepper.name"]')).map((n) => n.textContent);
  const markers = () => Array.from(root.querySelectorAll<HTMLElement>('[data-arena-part="stepper.marker"]'));
  return { fixture, root, names, markers, host: fixture.componentInstance };
}

test('every state is spoken before its label, and an error adds its own word', () => {
  const steps = CHECKOUT.map((s, i) => (i === 3 ? { ...s, error: true } : s));
  const { fixture, root, names } = render({ steps });
  try {
    assert.deepEqual(names(), ['Completed', 'Current step', 'Upcoming', 'Upcoming, Error']);
    const texts = Array.from(root.querySelectorAll('[data-arena-part="stepper.text"]'));
    assert.equal(texts.length, 4);
    assert.ok(
      texts.every((t) => t.firstElementChild?.getAttribute('data-arena-part') === 'stepper.name'
        && t.children[1]?.getAttribute('data-arena-part') === 'stepper.label'),
      'on every step the state word comes first in the text, then the label',
    );
  } finally {
    fixture.destroy();
  }
});

test('an index past the end completes every step and marks none current; a negative or non-finite one reads as the first', () => {
  for (const [index, want] of [
    [9, ['Completed', 'Completed', 'Completed', 'Completed']],
    [-3, ['Current step', 'Upcoming', 'Upcoming', 'Upcoming']],
    [Number.NaN, ['Current step', 'Upcoming', 'Upcoming', 'Upcoming']],
  ] as const) {
    const { fixture, root, names } = render({ index });
    try {
      assert.deepEqual(names(), want, String(index));
      if (index === 9) assertNoNode(root.querySelector('[aria-current]'), 'a finished process has no current step');
    } finally {
      fixture.destroy();
    }
  }
});

test('a complete marker draws a check, an error marker a warning glyph, and the rest their number', () => {
  const steps = CHECKOUT.map((s, i) => (i === 2 ? { ...s, error: true } : s));
  const { fixture, root, markers } = render({ steps });
  try {
    const drawn = markers();
    assert.deepEqual(glyphIds(drawn[0]!), [symbol('bold', 'check')]);
    assert.equal(drawn[1]!.textContent, '2');
    assert.deepEqual(glyphIds(drawn[2]!), [symbol('fill', 'warning-circle')]);
    assert.equal(drawn[3]!.textContent, '4');
    assert.equal(root.querySelectorAll('[data-arena-part="stepper.connector"]').length, 3, 'the last step has no connector');
    assert.ok(Array.from(root.querySelectorAll('[data-arena-part="stepper.rail"]')).every((r) => r.getAttribute('aria-hidden') === 'true'));
  } finally {
    fixture.destroy();
  }
});

test('choosing a step behind the current one reports its index, and nothing else reports', () => {
  const { fixture, root, host } = render({ index: 2, interactive: true });
  try {
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button'));
    assert.equal(buttons.length, 2);
    buttons[1]!.click();
    buttons[0]!.click();
    root.querySelector<HTMLElement>('[aria-current="step"] [data-arena-part="stepper.trigger"]')!.click();
    assert.deepEqual(host.chosen, [1, 0], 'the current step is text, so a press on it reports nothing');
    assert.equal(buttons[0]!.textContent?.replace(/\s+/g, ''), 'CompletedAccount');
  } finally {
    fixture.destroy();
  }
});

test('an empty list draws nothing, and a blank ariaLabel throws', () => {
  const empty = render({ steps: [] });
  try {
    assertNoNode(empty.root.querySelector('ol'), 'an empty list draws nothing');
  } finally {
    empty.fixture.destroy();
  }
  const fixture = TestBed.createComponent(VariantsHost);
  fixture.componentInstance.label = '   ';
  try {
    assert.throws(() => fixture.detectChanges(), (error: Error) => /^ArenaStepper: `ariaLabel`/.test(error.message));
  } finally {
    fixture.destroy();
  }
});
