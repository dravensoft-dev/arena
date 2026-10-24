/* arena-stepper binds none in two cases, so each case is rendered and asserted as the binding
 * declares it, and the semantics no pattern holds are asserted here directly: the list role on the
 * ol, its name, aria-current on one item and the state words. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ArenaStepperStep } from '../../../Api.generated';
import { assertNoNode } from '../../../test/NodeAssert';
import { assertPatternCases, ANGULAR_COMPONENTS } from '../../../test/Compliance';
import { ArenaStepper } from './ArenaStepper';

const BINDING = join(ANGULAR_COMPONENTS, 'navigation/arena-stepper/ArenaStepper.behaviour.json');

@Component({
  selector: 'stepper-compliance-host',
  standalone: true,
  imports: [ArenaStepper],
  template: `<arena-stepper ariaLabel="Checkout" [steps]="steps" [index]="index" [interactive]="interactive" (valueChange)="chosen.push($event)" />`,
})
class StepperHost {
  steps: readonly ArenaStepperStep[] = [{ label: 'Account' }, { label: 'Shipping' }, { label: 'Payment' }, { label: 'Review' }];
  index = 1;
  interactive = false;
  chosen: number[] = [];
}

function render(patch: Partial<StepperHost> = {}) {
  const fixture = TestBed.createComponent(StepperHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  return { fixture, root: fixture.nativeElement as HTMLElement };
}

test('arena-stepper renders both of its cases as the binding declares', () => {
  const fixtures: ReturnType<typeof render>['fixture'][] = [];
  try {
    assertPatternCases({
      bindingPath: BINDING,
      cases: {
        readonly: () => { const one = render(); fixtures.push(one.fixture); return { root: one.root }; },
        interactive: () => { const one = render({ interactive: true }); fixtures.push(one.fixture); return { root: one.root }; },
      },
    });
  } finally {
    for (const fixture of fixtures) fixture.destroy();
  }
});

test('the list is an ol with an explicit list role and its name, and one item is current', () => {
  const { fixture, root } = render({ index: 2 });
  try {
    const list = root.querySelector('ol')!;
    assert.equal(list.getAttribute('role'), 'list', 'a list with list-style none loses its role in WebKit without one');
    assert.equal(list.getAttribute('aria-label'), 'Checkout');
    assert.deepEqual(Array.from(list.querySelectorAll('li')).map((li) => li.getAttribute('aria-current')), [null, null, 'step', null]);
  } finally {
    fixture.destroy();
  }
});

test('a stepper that is not interactive has no button and no tab stop', () => {
  const { fixture, root } = render({ index: 3 });
  try {
    assertNoNode(root.querySelector('button, [tabindex]'), 'a step a reader cannot choose is text');
  } finally {
    fixture.destroy();
  }
});
