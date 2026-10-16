/* What the number field draws, read from its markup: the hint and then the error describe the
 * field, a hidden label still names it, required is native and its mark is not spoken, the format
 * and the affixes reach the reading, a number outside the bounds is drawn at the nearest bound,
 * and a blank label throws. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { assertNoNode } from '../../../test/NodeAssert';
import { ArenaNumberField } from './ArenaNumberField';

function render(inputs: Record<string, unknown> = {}) {
  const fixture: ComponentFixture<ArenaNumberField> = TestBed.createComponent(ArenaNumberField);
  fixture.componentRef.setInput('label', 'Replicas');
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  try { fixture.detectChanges(); } catch (error) { fixture.destroy(); throw error; }
  const root = fixture.nativeElement as HTMLElement;
  const input = root.querySelector('input[role="spinbutton"]') as HTMLInputElement;
  return { fixture, root, input };
}

test('the hint and then the error describe the field, and a hidden label still names it', () => {
  const hinted = render({ hint: 'Between 1 and 20.' });
  try {
    assert.equal(hinted.input.getAttribute('aria-describedby'), 'nf-replicas-note');
    assert.equal(hinted.root.querySelector('#nf-replicas-note')?.textContent, 'Between 1 and 20.');
    hinted.fixture.componentRef.setInput('error', 'Too many.');
    hinted.fixture.detectChanges();
    assert.equal(hinted.root.querySelector('#nf-replicas-note')?.textContent, 'Too many.');
    assert.equal(hinted.input.getAttribute('aria-invalid'), 'true');
  } finally { hinted.fixture.destroy(); }
  const quiet = render({ showLabel: false });
  try {
    assertNoNode(quiet.root.querySelector('label'));
    assert.equal(quiet.input.getAttribute('aria-label'), 'Replicas');
  } finally { quiet.fixture.destroy(); }
});

test('required is the native attribute on the field, and the mark beside the label is not spoken', () => {
  const field = render({ required: true });
  try {
    assert.equal(field.input.required, true);
    assert.equal(field.input.hasAttribute('aria-required'), false);
    assert.equal(field.root.querySelector('[data-arena-part="number-field.required"]')?.getAttribute('aria-hidden'), 'true');
  } finally { field.fixture.destroy(); }
});

test('the value is written in the format, and the reading adds the prefix and the suffix', () => {
  const field = render({ value: 48200.5, prefix: '$', suffix: 'USD', format: { locale: 'en-US', fractionDigits: 2 } });
  try {
    assert.equal(field.input.value, '48,200.50');
    assert.equal(field.input.getAttribute('aria-valuetext'), '$48,200.50USD');
    assert.equal(field.root.querySelector('[data-arena-part="number-field.prefix"]')?.getAttribute('aria-hidden'), 'true');
  } finally { field.fixture.destroy(); }
});

test('a number outside the bounds is drawn and announced at the nearest bound', () => {
  const field = render({ value: 500, min: 1, max: 100 });
  try {
    assert.equal(field.input.value, '100');
    assert.equal(field.input.getAttribute('aria-valuenow'), '100');
    const [, increase] = [...field.root.querySelectorAll('[data-arena-part="number-field.stepper"]')] as HTMLButtonElement[];
    assert.equal(increase!.disabled, true);
  } finally { field.fixture.destroy(); }
});

test('a blank label throws, because nothing can derive what the number counts', () => {
  assert.throws(() => render({ label: '  ' }), /ArenaNumberField:/);
});
