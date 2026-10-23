/* Every verdict in the behavioural map below is earned by a named assertion in this file.
 * The textbox pattern names no keys the browser has to supply, so states.required and
 * states.readonly are earned by the native attributes being set on the real <input> -- those,
 * not aria-required and aria-readonly, are what the accessibility tree reads from a native
 * control, and writing both would be two claims that could disagree. */

import { useTestEnvironment, glyphIds, symbol } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { assertNoNode } from '../../../test/NodeAssert';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaInput } from './ArenaInput';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'forms/arena-input/ArenaInput.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaInput],
  template: `<arena-input [label]="label" [id]="id" [hint]="hint" [error]="error" [valid]="valid"
                          [required]="required" [readOnly]="readOnly" [disabled]="disabled"
                          [validate]="validate" [validateOn]="validateOn" [value]="value"
                          [icon]="icon" [prefix]="prefix"
                          (change)="edits.push($event)" (blur)="blurs.push($event)" />`,
})
class InputHost {
  label: string | undefined = 'Project name';
  id: string | undefined = undefined;
  hint: string | undefined = undefined;
  error: string | undefined = undefined;
  valid = false;
  required = false;
  readOnly = false;
  disabled = false;
  validate: ((value: string) => string) | undefined = undefined;
  validateOn: 'blur' | 'change' = 'blur';
  value: string | undefined = '';
  icon: string | undefined = undefined;
  prefix: string | undefined = undefined;
  edits: string[] = [];
  blurs: string[] = [];
}

function render(patch: Partial<InputHost> = {}) {
  const fixture = TestBed.createComponent(InputHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const control = host.querySelector('input') as HTMLInputElement;
  return { fixture, host, control };
}

function type(fixture: ReturnType<typeof render>['fixture'], control: HTMLInputElement, text: string) {
  control.value = text;
  control.dispatchEvent(new Event('input', { bubbles: true }));
  fixture.detectChanges();
}

test('the control is a real <input>, and the label points at it by a derived id', () => {
  const { fixture, host, control } = render();
  try {
    assert.equal(control.tagName, 'INPUT');
    assert.equal(control.getAttribute('type'), 'text');
    assert.equal(control.getAttribute('id'), 'in-project-name',
      'the id derivation is contracted in ArenaInput.json, or the same markup gets two different ids per layer');
    const label = host.querySelector('label') as HTMLElement;
    assert.equal(label.getAttribute('for'), 'in-project-name');
  } finally {
    fixture.destroy();
  }
});

test('an explicit id wins, and with neither id nor label the attribute is absent rather than empty', () => {
  const explicit = render({ id: 'repo-url' });
  try {
    assert.equal(explicit.control.getAttribute('id'), 'repo-url');
  } finally {
    explicit.fixture.destroy();
  }

  const bare = render({ label: undefined });
  try {
    assert.equal(bare.control.getAttribute('id'), null);
    assertNoNode(bare.host.querySelector('label'), 'no label was given and one was rendered anyway');
  } finally {
    bare.fixture.destroy();
  }
});

test('required marks the label and sets the native attribute, not aria-required', () => {
  const { fixture, host, control } = render({ required: true });
  try {
    assert.equal(control.required, true);
    assert.ok(control.hasAttribute('required'));
    assert.equal(control.getAttribute('aria-required'), null,
      'a native required already maps to required in the accessibility tree; aria-required is a second claim');
    const marker = host.querySelector('label span') as HTMLElement;
    assert.ok(marker, 'required drew no marker beside the label');
    assert.equal(marker.textContent, '*');
  } finally {
    fixture.destroy();
  }
});

test('readOnly sets the native attribute, not aria-readonly', () => {
  const { fixture, control } = render({ readOnly: true });
  try {
    assert.equal(control.readOnly, true);
    assert.ok(control.hasAttribute('readonly'));
    assert.equal(control.getAttribute('aria-readonly'), null);
  } finally {
    fixture.destroy();
  }
});

test('typing emits change once per keystroke, carrying the value rather than the event', () => {
  const { fixture, control } = render();
  try {
    type(fixture, control, 'are');
    type(fixture, control, 'arena');
    assert.deepEqual(fixture.componentInstance.edits, ['are', 'arena']);
  } finally {
    fixture.destroy();
  }
});

test('the native change never reaches the consumer, so a commit does not look like a second edit', () => {
  const { fixture, control } = render();
  try {
    type(fixture, control, 'arena');
    control.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    assert.equal(fixture.componentInstance.edits.length, 1,
      'change is an output named after a native DOM event; without stopPropagation the commit emits again');
  } finally {
    fixture.destroy();
  }
});

test('blur emits exactly once, because a native blur does not bubble to the host', () => {
  const { fixture, control } = render();
  try {
    type(fixture, control, 'arena');
    control.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    assert.deepEqual(fixture.componentInstance.blurs, ['arena'],
      'blur is named after a native event too -- it survives without stopPropagation only because it does not bubble');
  } finally {
    fixture.destroy();
  }
});

test('validate runs on blur by default and its message reaches the DOM only once touched', () => {
  const { fixture, host, control } = render({ validate: (v) => (v.length < 3 ? 'Too short' : '') });
  try {
    type(fixture, control, 'ab');
    assert.equal(host.textContent?.includes('Too short'), false,
      'an untouched field must not accuse the user of anything');

    control.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    assert.equal(host.textContent?.includes('Too short'), true);
    assert.equal(control.getAttribute('aria-invalid'), 'true');
  } finally {
    fixture.destroy();
  }
});

test('validateOn="change" touches the field on the first keystroke instead', () => {
  const { fixture, host, control } = render({
    validateOn: 'change', validate: (v) => (v.length < 3 ? 'Too short' : ''),
  });
  try {
    type(fixture, control, 'ab');
    assert.equal(host.textContent?.includes('Too short'), true);
    type(fixture, control, 'abc');
    assert.equal(host.textContent?.includes('Too short'), false,
      'a validator that now passes must clear its own message');
  } finally {
    fixture.destroy();
  }
});

test('a controlled error wins over the validator, and an empty string counts as an error present', () => {
  const { fixture, host, control } = render({
    error: 'Taken', validate: () => '',
  });
  try {
    control.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    assert.equal(host.textContent?.includes('Taken'), true);
    assert.equal(control.getAttribute('aria-invalid'), 'true');
  } finally {
    fixture.destroy();
  }

  const empty = render({ error: '', validate: () => 'Too short', hint: 'Lowercase, no spaces' });
  try {
    empty.control.dispatchEvent(new Event('blur'));
    empty.fixture.detectChanges();
    assert.equal(empty.control.getAttribute('aria-invalid'), 'false',
      'error="" is present enough to suppress the validator and empty enough not to be an error, '
      + 'which is what ArenaInput.json contracts: every use downstream reads its truthiness, not its nullness');
    assert.equal(empty.host.textContent?.includes('Too short'), false,
      'a controlled error, even blank, wins over the validator');
    assert.equal(empty.host.textContent?.includes('Lowercase, no spaces'), true,
      'with no message to show, the field falls back to its hint rather than to a blank line');
  } finally {
    empty.fixture.destroy();
  }
});

test('the error replaces the hint rather than stacking under it', () => {
  const withHint = render({ hint: 'Lowercase, no spaces' });
  try {
    assert.equal(withHint.host.textContent?.includes('Lowercase, no spaces'), true);
  } finally {
    withHint.fixture.destroy();
  }

  const both = render({ hint: 'Lowercase, no spaces', error: 'Already taken' });
  try {
    assert.equal(both.host.textContent?.includes('Already taken'), true);
    assert.equal(both.host.textContent?.includes('Lowercase, no spaces'), false,
      'two lines of guidance under one field is one too many, and the error is the one that matters');
  } finally {
    both.fixture.destroy();
  }
});

test('the status glyphs are decoration -- the message beside them is what is announced', () => {
  const bad = render({ error: 'Already taken' });
  try {
    const glyph = bad.host.querySelector('svg') as SVGElement;
    assert.ok(glyph, 'an error drew no status glyph');
    assert.deepEqual(glyphIds(bad.host), [symbol('fill', 'warning-circle')]);
    assert.equal(glyph.getAttribute('aria-hidden'), 'true',
      'a Phosphor ligature announced beside its own message reads the state twice');
  } finally {
    bad.fixture.destroy();
  }

  const good = render({ valid: true });
  try {
    const glyph = good.host.querySelector('svg') as SVGElement;
    assert.deepEqual(glyphIds(good.host), [symbol('fill', 'check-circle')]);
    assert.equal(glyph.getAttribute('aria-hidden'), 'true');
  } finally {
    good.fixture.destroy();
  }
});

test('the leading icon and the prefix are drawn before the control and neither is announced', () => {
  const { fixture, host, control } = render({ icon: 'ph-bold ph-globe', prefix: 'git@' });
  try {
    const glyph = host.querySelector('svg') as SVGElement;
    assert.deepEqual(glyphIds(host), [symbol('bold', 'globe')]);
    assert.equal(glyph.getAttribute('aria-hidden'), 'true');
    assert.equal(host.textContent?.includes('git@'), true);
    assert.ok(glyph.compareDocumentPosition(control) & Node.DOCUMENT_POSITION_FOLLOWING,
      'the icon must precede the control it decorates');
  } finally {
    fixture.destroy();
  }
});

test('the host is the field group itself -- the root recipe lands on it, not on a wrapper inside', () => {
  const { fixture, host } = render();
  try {
    const inner = host.querySelector('arena-input') as HTMLElement;
    assert.match(inner.getAttribute('class') ?? '', /arena-input__root/);
  } finally {
    fixture.destroy();
  }
});

test('arena-input meets the textbox pattern', () => {
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
