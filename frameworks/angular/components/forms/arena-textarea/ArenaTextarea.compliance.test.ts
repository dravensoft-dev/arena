/* Every verdict in the behavioural map below is earned by a named assertion in this file.
 * states.required and states.readonly are earned by the native attributes on the real
 * <textarea>; states.multiline the evaluator decides for itself from the element. autoResize is
 * NOT asserted here and cannot be: happy-dom has no layout, so scrollHeight is 0 and a growing
 * box and a broken one look identical. It is a by-hand item on the demo page. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaTextarea } from './ArenaTextarea';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'forms/arena-textarea/ArenaTextarea.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaTextarea],
  template: `<arena-textarea [label]="label" [id]="id" [hint]="hint" [error]="error"
                             [required]="required" [readOnly]="readOnly" [disabled]="disabled"
                             [counter]="counter" [maxLength]="maxLength" [rows]="rows"
                             [value]="value" (change)="edits.push($event)" />`,
})
class TextareaHost {
  label: string | undefined = 'Release notes';
  id: string | undefined = undefined;
  hint: string | undefined = undefined;
  error: string | undefined = undefined;
  required = false;
  readOnly = false;
  disabled = false;
  counter = false;
  maxLength: number | undefined = undefined;
  rows = 4;
  value: string | undefined = '';
  edits: string[] = [];
}

function render(patch: Partial<TextareaHost> = {}) {
  const fixture = TestBed.createComponent(TextareaHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const control = host.querySelector('textarea') as HTMLTextAreaElement;
  return { fixture, host, control };
}

test('the control is a real <textarea>, which is what makes it multiline without aria-multiline', () => {
  const { fixture, control } = render();
  try {
    assert.equal(control.tagName, 'TEXTAREA');
    assert.equal(control.getAttribute('aria-multiline'), null,
      'a native textarea already reports as multiline; the attribute would be a second claim');
    assert.equal(control.getAttribute('rows'), '4');
  } finally {
    fixture.destroy();
  }
});

test('the label points at the control by a ta- slug, which is not ArenaInput\'s prefix', () => {
  const { fixture, host, control } = render();
  try {
    assert.equal(control.getAttribute('id'), 'ta-release-notes');
    assert.equal((host.querySelector('label') as HTMLElement).getAttribute('for'), 'ta-release-notes');
  } finally {
    fixture.destroy();
  }
});

test('required and readOnly land on the native attributes, not on aria-', () => {
  const { fixture, host, control } = render({ required: true, readOnly: true });
  try {
    assert.ok(control.hasAttribute('required'));
    assert.ok(control.hasAttribute('readonly'));
    assert.equal(control.getAttribute('aria-required'), null);
    assert.equal(control.getAttribute('aria-readonly'), null);
    assert.equal((host.querySelector('label span') as HTMLElement).textContent, '*');
  } finally {
    fixture.destroy();
  }
});

test('typing emits change once, carrying the text, and the native change never reaches the consumer', () => {
  const { fixture, control } = render();
  try {
    control.value = 'Shipped the CDK foundation';
    control.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    assert.deepEqual(fixture.componentInstance.edits, ['Shipped the CDK foundation']);

    control.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    assert.equal(fixture.componentInstance.edits.length, 1,
      'change is an output named after a native DOM event; the commit must not emit a second time');
  } finally {
    fixture.destroy();
  }
});

test('an error sets aria-invalid and replaces the hint rather than stacking under it', () => {
  const { fixture, host, control } = render({ hint: 'Markdown is supported', error: 'Too long' });
  try {
    assert.equal(control.getAttribute('aria-invalid'), 'true');
    assert.equal(host.textContent?.includes('Too long'), true);
    assert.equal(host.textContent?.includes('Markdown is supported'), false);
  } finally {
    fixture.destroy();
  }

  const clean = render({ hint: 'Markdown is supported' });
  try {
    assert.equal(clean.control.getAttribute('aria-invalid'), 'false');
    assert.equal(clean.host.textContent?.includes('Markdown is supported'), true);
  } finally {
    clean.fixture.destroy();
  }
});

test('the counter needs both counter and maxLength, and shows neither without the pair', () => {
  const neither = render({ value: 'abc' });
  try {
    assert.equal(neither.host.textContent?.includes('/'), false);
  } finally {
    neither.fixture.destroy();
  }

  const capOnly = render({ value: 'abc', maxLength: 10 });
  try {
    assert.equal(capOnly.host.textContent?.includes('3/10'), false,
      'a maxLength alone caps the field; it does not ask for the count to be shown');
  } finally {
    capOnly.fixture.destroy();
  }

  const both = render({ value: 'abc', maxLength: 10, counter: true });
  try {
    assert.equal(both.host.textContent?.includes('3/10'), true);
    assert.equal(both.control.getAttribute('maxlength'), '10');
  } finally {
    both.fixture.destroy();
  }
});

test('the counter changes slot past nine tenths of the cap rather than changing a group', () => {
  const calm = render({ value: 'a'.repeat(90), maxLength: 100, counter: true });
  try {
    const el = Array.from(calm.host.querySelectorAll('span')).find((s) => s.textContent === '90/100');
    assert.ok(el, 'the counter did not render at 90/100');
    assert.equal(el.hasAttribute('data-arena-near'), false);
  } finally {
    calm.fixture.destroy();
  }

  const near = render({ value: 'a'.repeat(95), maxLength: 100, counter: true });
  try {
    const el = Array.from(near.host.querySelectorAll('span')).find((s) => s.textContent === '95/100');
    assert.ok(el);
    assert.equal(el.getAttribute('data-arena-near'), '');
  } finally {
    near.fixture.destroy();
  }
});

test('the foot keeps a placeholder when there is no message, so the counter stays right-aligned', () => {
  const { fixture, host } = render({ value: 'abc', maxLength: 10, counter: true });
  try {
    const foot = Array.from(host.querySelectorAll('div'))
      .find((d) => (d.getAttribute('class') ?? '').includes('arena-textarea__foot')) as HTMLElement;
    assert.ok(foot, 'no foot row rendered');
    assert.equal(foot.children.length, 2,
      'with no error and no hint the first child must still exist, or justify-between has nothing to push against');
  } finally {
    fixture.destroy();
  }
});

test('the host is the field group itself -- the root recipe lands on it, not on a wrapper inside', () => {
  const { fixture, host } = render();
  try {
    assert.match((host.querySelector('arena-textarea') as HTMLElement).getAttribute('class') ?? '', /arena-textarea__root/);
  } finally {
    fixture.destroy();
  }
});

test('arena-textarea meets the textbox pattern', () => {
  const { fixture, host, control } = render({ required: true, readOnly: true });
  try {
    assertPattern({
      root: host,
      bindingPath: BINDING,
      subjects: { default: control },
      behavioural: { 'states.required': true, 'states.readonly': true },
    });
  } finally {
    fixture.destroy();
  }
});
