/* The closed control: chips in the order chosen with a value no option holds drawn as its own text, the
 * remove buttons out of the Tab sequence, the placeholder only while nothing is chosen, the host free of
 * name, and a label of nothing but spaces refused. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import { assertNoNode } from '../../../test/NodeAssert';
import { ArenaMultiSelect } from './ArenaMultiSelect';

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(ArenaMultiSelect);
  fixture.componentRef.setInput('label', 'Regions');
  fixture.componentRef.setInput('options', [{ value: 'eu', label: 'Europe' }, { value: 'us', label: 'Americas' }]);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  return { fixture, host, input: host.querySelector('[role="combobox"]') as HTMLInputElement };
}

test('the chosen values are chips in the order chosen, each remove held out of the Tab sequence', () => {
  const { fixture, host } = render({ value: ['us', 'mars', 'eu'], name: 'regions' });
  try {
    const tags = Array.from(host.querySelectorAll('arena-tag'));
    const labels = tags.map((tag) => tag.querySelector('[data-arena-boundary]')?.textContent?.trim());
    assert.deepEqual(labels, ['Americas', 'mars', 'Europe']);
    for (const button of Array.from(host.querySelectorAll('button'))) assert.equal(button.getAttribute('tabindex'), '-1');
    assert.equal(host.hasAttribute('name'), false);
  } finally { fixture.destroy(); }
});

test('the field is a collapsed combobox naming no list, and the placeholder shows only while nothing is chosen', () => {
  const empty = render({ placeholder: 'Search' });
  try {
    assert.equal(empty.input.getAttribute('aria-expanded'), 'false');
    assert.equal(empty.input.hasAttribute('aria-controls'), false);
    assertNoNode((document.querySelector('.cdk-overlay-container') ?? document.body).querySelector('[role="listbox"]'));
    assert.equal(empty.input.getAttribute('placeholder'), 'Search');
  } finally { empty.fixture.destroy(); }
  const chosen = render({ placeholder: 'Search', value: ['eu'] });
  try {
    assert.equal(chosen.input.hasAttribute('placeholder'), false);
  } finally { chosen.fixture.destroy(); }
});

test('the clear control is drawn only when declared and something is chosen', () => {
  const none = render({ clearable: true });
  try { assertNoNode(none.host.querySelector('[data-arena-part="combobox.clear"]')); } finally { none.fixture.destroy(); }
  const some = render({ clearable: true, value: ['eu'] });
  try { assert.ok(some.host.querySelector('[data-arena-part="combobox.clear"][aria-label="Clear selection"]')); } finally { some.fixture.destroy(); }
});

test('a label of nothing but spaces is refused', () => {
  assert.throws(() => render({ label: ' ' }), /label/);
});
