/* The closed control: a named field with the combobox roles and no list anywhere in the document, the
 * chosen label in the field and its value in a hidden input that exists only with a name, and a label
 * of nothing but spaces refused. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { assertNoNode } from '../../../test/NodeAssert';
import { TestBed } from '@angular/core/testing';
import { disposeOverlays } from '../../../test/Overlays';
import { ArenaCombobox, arenaFilterOptions } from './ArenaCombobox';

const REGIONS = [
  { value: 'eu-west', label: 'Europe West' },
  { value: 'us-east', label: 'US East' },
];

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(ArenaCombobox);
  fixture.componentRef.setInput('label', 'Region');
  fixture.componentRef.setInput('options', REGIONS);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  return { fixture, host, input: host.querySelector('[role="combobox"]') as HTMLInputElement };
}

test('the closed field is a combobox that says it is collapsed, and no list is open in the overlay container', () => {
  const { fixture, input } = render({});
  try {
    assert.equal(input.getAttribute('aria-expanded'), 'false');
    assert.equal(input.getAttribute('aria-autocomplete'), 'list');
    assert.equal(input.getAttribute('aria-haspopup'), 'listbox');
    assert.equal(input.hasAttribute('aria-controls'), false);
    assertNoNode((document.querySelector('.cdk-overlay-container') ?? document.body).querySelector('[role="listbox"]'));
  } finally { fixture.destroy(); }
});

test('the field shows the chosen label and the hidden input submits its value; the host drops name', () => {
  const { fixture, host, input } = render({ value: 'us-east', name: 'region' });
  try {
    assert.equal(input.value, 'US East');
    const hidden = host.querySelector('input[type="hidden"]') as HTMLInputElement;
    assert.equal(hidden.name, 'region');
    assert.equal(hidden.value, 'us-east');
    assert.equal(host.hasAttribute('name'), false);
  } finally { fixture.destroy(); }
});

test('a disabled combobox submits nothing: its hidden input is disabled', () => {
  const { fixture, host } = render({ value: 'us-east', name: 'region', disabled: true });
  try {
    assert.equal((host.querySelector('input[type="hidden"]') as HTMLInputElement).disabled, true);
  } finally { fixture.destroy(); }
});

test('without a name there is no hidden input, and a value no option holds draws an empty field', () => {
  const { fixture, host, input } = render({ value: 'mars', placeholder: 'Search' });
  try {
    assertNoNode(host.querySelector('input[type="hidden"]'));
    assert.equal(input.value, '');
    assert.equal(input.getAttribute('placeholder'), 'Search');
  } finally { fixture.destroy(); }
});

test('the label names the field through for, or through aria-label when it is not drawn', () => {
  const drawn = render({});
  try {
    assert.equal(drawn.host.querySelector('label')?.getAttribute('for'), drawn.input.id);
  } finally { drawn.fixture.destroy(); }
  const bare = render({ showLabel: false });
  try {
    assertNoNode(bare.host.querySelector('label'));
    assert.equal(bare.input.getAttribute('aria-label'), 'Region');
  } finally { bare.fixture.destroy(); }
});

test('error marks the field invalid, describes it and draws the warning glyph; valid draws the check', () => {
  const failed = render({ error: 'Pick a region' });
  try {
    assert.equal(failed.input.getAttribute('aria-invalid'), 'true');
    const note = failed.host.querySelector(`#${failed.input.getAttribute('aria-describedby')}`);
    assert.equal(note?.textContent?.trim(), 'Pick a region');
    assert.ok(failed.host.querySelector('.ph-warning-circle'));
  } finally { failed.fixture.destroy(); }
  const valid = render({ valid: true });
  try {
    assert.ok(valid.host.querySelector('.ph-check-circle'));
  } finally { valid.fixture.destroy(); }
});

test('a label of nothing but spaces is refused', () => {
  assert.throws(() => render({ label: '   ' }), /label/);
});

test('the filter the component exports is the one it draws with', () => {
  assert.deepEqual(arenaFilterOptions(REGIONS, 'east').map((row) => row.value), ['us-east']);
});

test('a choice stays drawn when the host binds value and does not write it back', () => {
  const { fixture, input } = render({ value: 'eu-west' });
  try {
    input.value = 'us';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    assert.equal(input.value, 'US East');
  } finally { fixture.destroy(); disposeOverlays(); }
});
