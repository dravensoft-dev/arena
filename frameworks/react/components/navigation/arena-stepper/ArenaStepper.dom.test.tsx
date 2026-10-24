import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { join } from 'node:path';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { assertPatternCases, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { ArenaStepper } from './ArenaStepper.tsx';

afterEach(cleanup);

const CHECKOUT = [{ label: 'Account' }, { label: 'Shipping' }, { label: 'Payment' }, { label: 'Review' }];
const BINDING = join(REACT_COMPONENTS, 'navigation', 'arena-stepper', 'ArenaStepper.behaviour.json');

test('choosing a step behind the current one reports its index, and nothing else reports', () => {
  const seen: number[] = [];
  const root = mount(<ArenaStepper ariaLabel="Checkout" steps={CHECKOUT} index={2} interactive onValueChange={(i) => seen.push(i)} />);
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('button')];
  assert.equal(buttons.length, 2);
  act(() => { buttons[1]!.click(); });
  act(() => { buttons[0]!.click(); });
  act(() => { root.querySelector<HTMLElement>('[aria-current="step"] [data-arena-part="stepper.trigger"]')!.click(); });
  assert.deepEqual(seen, [1, 0], 'the current step is text, so a press on it reports nothing');
});

test('a stepper that is not interactive has no button and no tab stop', () => {
  const root = mount(<ArenaStepper ariaLabel="Checkout" steps={CHECKOUT} index={3} onValueChange={() => assert.fail('no step can report')} />);
  assert.equal(root.querySelector('button, [tabindex]'), null);
});

test('a chosen step is named by its state word and its label', () => {
  const root = mount(<ArenaStepper ariaLabel="Checkout" steps={CHECKOUT} index={1} interactive />);
  assert.equal(root.querySelector('button')!.textContent, 'CompletedAccount');
});

test('ArenaStepper renders both of its cases as the binding declares', () => {
  assertPatternCases({
    bindingPath: BINDING,
    cases: {
      readonly: () => ({ root: mount(<ArenaStepper ariaLabel="Checkout" steps={CHECKOUT} index={1} />) }),
      interactive: () => ({ root: mount(<ArenaStepper ariaLabel="Checkout" steps={CHECKOUT} index={1} interactive />) }),
    },
  });
});
