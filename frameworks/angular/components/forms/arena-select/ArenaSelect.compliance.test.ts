/* Both requirements of `select` are decidable from the element, so this file has no
 * `behavioural` map at all: the browser owns the popup, the keys and the focus, which
 * is the whole reason ArenaSelect binds `select` rather than `combobox`. What is NOT free is
 * containment — `change` is an Arena output whose name a native <select> event already
 * carries, so the second test measures that the native one never leaves the host
 * instead of arguing that it cannot. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';
import type { ArenaSelectOption } from '../../../Api.generated';
import { ArenaSelect } from './ArenaSelect';

const BINDING = join(ANGULAR_COMPONENTS, 'forms/arena-select/ArenaSelect.behaviour.json');

const OPTIONS: ArenaSelectOption[] = [
  { value: 'staging', label: 'Staging' },
  { value: 'production', label: 'Production' },
];

@Component({
  standalone: true,
  imports: [ArenaSelect],
  template: `
    <div id="outside">
      <arena-select label="Environment" [options]="options" value="staging" name="env"
                    (change)="chosen.push($event)" />
    </div>
  `,
})
class SelectHost {
  readonly options = OPTIONS;
  readonly chosen: string[] = [];
}

test('arena-select meets the select pattern it binds', () => {
  const fixture = TestBed.createComponent(SelectHost);
  try {
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('arena-select') as HTMLElement;
    const field = host.querySelector('select') as HTMLSelectElement;
    assert.ok(field, 'arena-select must render the native element the pattern is about');

    const labels = Array.from(host.querySelectorAll('label'));
    assert.equal(labels.length, 1, 'the fixture must supply exactly one label');
    assert.equal(labels[0].getAttribute('for'), field.getAttribute('id'),
      'roles.label: the label must point at the control it names');

    assertPattern({ root: host, bindingPath: BINDING, subjects: { default: field } });
  } finally {
    fixture.destroy();
  }
});

test('the native change event never leaves the host, so a consumer sees the Arena output once and the DOM event never', () => {
  const fixture = TestBed.createComponent(SelectHost);
  const seen: Event[] = [];
  try {
    fixture.detectChanges();
    const outside = fixture.nativeElement.querySelector('#outside') as HTMLElement;
    const host = fixture.nativeElement.querySelector('arena-select') as HTMLElement;
    const field = host.querySelector('select') as HTMLSelectElement;
    outside.addEventListener('change', (event) => seen.push(event));

    field.value = 'production';
    field.dispatchEvent(new Event('change', { bubbles: true }));

    assert.deepEqual(fixture.componentInstance.chosen, ['production'],
      'the Arena output must carry the chosen value exactly once');
    assert.equal(seen.length, 0,
      'the native change must be stopped inside the host: it shares a name with the contracted output, ' +
      'so a consumer listening on an ancestor would otherwise be told twice');
  } finally {
    fixture.destroy();
  }
});

test('value selects the matching option rather than being written onto the element before its options exist', () => {
  const fixture = TestBed.createComponent(SelectHost);
  try {
    fixture.detectChanges();
    const field = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    const options = Array.from(field.querySelectorAll('option'));
    assert.deepEqual(options.map((o) => o.getAttribute('value')), ['staging', 'production']);
    assert.equal(field.value, 'staging', 'the option matching value must be the selected one');
    assert.equal(field.getAttribute('name'), 'env', 'name must reach the control that submits');
  } finally {
    fixture.destroy();
  }
});

test('the name input does not leave a stray global attribute on the host element', () => {
  const fixture = TestBed.createComponent(SelectHost);
  try {
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('arena-select') as HTMLElement;
    assert.equal(host.getAttribute('name'), null,
      'name belongs to the inner control, not to <arena-select>');
  } finally {
    fixture.destroy();
  }
});

@Component({
  standalone: true,
  imports: [ArenaSelect],
  template: `
    <arena-select label="Customer" [options]="options" [placeholder]="placeholder"
                  [hint]="hint" [error]="error" [valid]="valid" [icon]="icon" />
  `,
})
class NotedHost {
  readonly options = OPTIONS;
  placeholder: string | undefined = undefined;
  hint: string | undefined = undefined;
  error: string | undefined = undefined;
  valid = false;
  icon: string | undefined = undefined;
}

function noted(patch: Partial<NotedHost> = {}) {
  const fixture = TestBed.createComponent(NotedHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  const host = fixture.nativeElement.querySelector('arena-select') as HTMLElement;
  return { fixture, host, field: host.querySelector('select') as HTMLSelectElement };
}

test('error takes the crimson state and names itself to the control, so the failure is announced', () => {
  const { fixture, host, field } = noted({ error: 'Pick a customer' });
  try {
    assert.equal(field.getAttribute('aria-invalid'), 'true', 'an errored select did not announce itself as invalid');
    const id = field.getAttribute('aria-describedby');
    assert.ok(id, 'the message is drawn but nothing points at it, so a screen reader never reaches it');
    const note = host.querySelector(`#${id}`);
    assert.ok(note, 'aria-describedby names an id the render does not contain');
    assert.equal(note.textContent?.trim(), 'Pick a customer');
    assert.equal(field.getAttribute('data-arena-state'), 'error', 'the error state did not reach the field');
  } finally {
    fixture.destroy();
  }
});

test('error wins over hint, which is the same state order ArenaInput declares', () => {
  const { fixture, host } = noted({ hint: 'Start typing', error: 'Pick a customer' });
  try {
    assert.match(host.textContent ?? '', /Pick a customer/);
    assert.doesNotMatch(host.textContent ?? '', /Start typing/,
      'both notes rendered: an errored field that still shows its hint buries the failure under advice');
  } finally {
    fixture.destroy();
  }
});

test('a hint alone is neutral, and is still named to the control', () => {
  const { fixture, host, field } = noted({ hint: 'Start typing' });
  try {
    assert.equal(field.getAttribute('aria-invalid'), 'false', 'a hint is help, not a failure');
    assert.ok(field.getAttribute('aria-describedby'), 'the hint is not named to the control');
    assert.match(host.textContent ?? '', /Start typing/);
  } finally {
    fixture.destroy();
  }
});

test('valid takes the green state, and error still beats it', () => {
  const ok = noted({ valid: true });
  try {
    assert.equal(ok.field.getAttribute('data-arena-state'), 'valid');
  } finally {
    ok.fixture.destroy();
  }

  const both = noted({ valid: true, error: 'No' });
  try {
    assert.equal(both.field.getAttribute('data-arena-state'), 'error',
      'valid won over error, so a field reports success while it is failing');
  } finally {
    both.fixture.destroy();
  }
});

test('placeholder is a disabled empty first option, so "nothing chosen" is not the first choice', () => {
  const { fixture, field } = noted({ placeholder: 'Choose a customer' });
  try {
    const first = field.querySelector('option') as HTMLOptionElement;
    assert.equal(first.getAttribute('value'), '');
    assert.equal(first.disabled, true, 'a selectable placeholder is a choice nobody meant to offer');
    assert.equal(first.textContent?.trim(), 'Choose a customer');
  } finally {
    fixture.destroy();
  }
});

test('icon is drawn hidden and pushes the text clear of it', () => {
  const { fixture, host, field } = noted({ icon: 'ph-bold ph-user' });
  try {
    const glyph = host.querySelector('i') as HTMLElement;
    assert.ok(glyph, 'no <i> was drawn for the icon');
    assert.match(glyph.getAttribute('class') ?? '', /ph-bold ph-user/);
    assert.equal(glyph.getAttribute('aria-hidden'), 'true');
    assert.equal(field.getAttribute('data-arena-has-icon'), '', 'the text runs under the glyph');
  } finally {
    fixture.destroy();
  }
});
