/* The cells edit one code under real input, key and paste events: a character fills its cell and
 * focus moves on, Backspace and Delete close the code up, the arrows walk the cells, a paste
 * spreads across them, a refused character emits nothing, and complete follows change once per
 * fill. A focusout leaving the group emits blur; one moving between cells does not. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaPinInput } from './ArenaPinInput';
import { assertSameNode } from '../../../test/NodeAssert';

@Component({
  selector: 'pin-input-keys-host',
  standalone: true,
  imports: [ArenaPinInput],
  template: `<div [attr.dir]="dir()"><arena-pin-input label="Verification code" [value]="value()" (change)="seen.push('change ' + $event); answer($event)"
               (complete)="seen.push('complete ' + $event)" (blur)="seen.push('blur ' + $event)" /><button type="button">Verify</button></div>`,
})
class Host {
  readonly value = signal('');
  readonly dir = signal<string | null>(null);
  readonly answers = signal(true);
  seen: string[] = [];
  answer(code: string): void {
    if (this.answers()) this.value.set(code);
  }
}

@Component({
  selector: 'pin-input-keys-verify-host',
  standalone: true,
  imports: [ArenaPinInput],
  template: `<arena-pin-input label="Verification code" [value]="value()" (change)="value.set($event)" (complete)="verify.focus()" />
             <button #verify type="button">Verify</button>`,
})
class VerifyHost {
  readonly value = signal('48291');
}

@Component({
  selector: 'pin-input-keys-free-host',
  standalone: true,
  imports: [ArenaPinInput],
  template: `<arena-pin-input label="Verification code" (change)="seen.push($event)" />`,
})
class FreeHost {
  seen: string[] = [];
}

function render(value = '', dir: string | null = null, answers = true) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.answers.set(answers);
  fixture.componentInstance.value.set(value);
  fixture.componentInstance.dir.set(dir);
  fixture.detectChanges();
  return drive(fixture.nativeElement as HTMLElement, () => fixture.detectChanges(), fixture.componentInstance.seen, () => fixture.destroy());
}

function drive(root: HTMLElement, settle: () => void, seen: string[], destroy: () => void) {
  const cells = () => [...root.querySelectorAll<HTMLInputElement>('[data-arena-part="pin-input.cell"]')];
  const active = () => cells().indexOf(root.ownerDocument.activeElement as HTMLInputElement);
  const code = () => cells().map((cell) => cell.value).join('');
  const focus = (index: number) => { cells()[index]!.focus(); settle(); };
  const type = (text: string) => {
    const cell = cells()[active()]!;
    cell.value = cell.value + text;
    cell.dispatchEvent(new Event('input', { bubbles: true }));
    settle();
  };
  const key = (name: string) => {
    cells()[active()]!.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
    settle();
  };
  const paste = (text: string) => {
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
    cells()[active()]!.dispatchEvent(event);
    settle();
  };
  const autofill = (text: string) => {
    const cell = cells()[active()]!;
    cell.value = text;
    cell.dispatchEvent(new Event('input', { bubbles: true }));
    settle();
  };
  const stops = () => cells().flatMap((cell, index) => (cell.getAttribute('tabindex') === '0' ? [index] : []));
  return { root, cells, active, code, focus, type, key, paste, seen, destroy, stops, settle, autofill };
}

test('a typed character fills its cell and moves focus to the next', () => {
  const pin = render();
  try {
    pin.focus(0);
    pin.type('4');
    pin.type('8');
    assert.deepEqual([pin.code(), pin.active()], ['48', 2]);
    assert.deepEqual(pin.seen, ['change 4', 'change 48']);
  } finally { pin.destroy(); }
});

test('a refused character changes no cell and emits nothing', () => {
  const pin = render();
  try {
    pin.focus(0);
    pin.type('x');
    assert.deepEqual([pin.code(), pin.active()], ['', 0]);
    assert.deepEqual(pin.seen, []);
  } finally { pin.destroy(); }
});

test('Backspace on an empty cell empties the one before and moves there, and on a filled cell empties it and stays', () => {
  const pin = render('482');
  try {
    pin.focus(3);
    pin.key('Backspace');
    assert.deepEqual([pin.code(), pin.active()], ['48', 2]);
    pin.key('Backspace');
    assert.deepEqual([pin.code(), pin.active()], ['4', 1]);
    pin.focus(0);
    pin.key('Backspace');
    assert.deepEqual([pin.code(), pin.active()], ['', 0]);
  } finally { pin.destroy(); }
});

test('Delete empties the focused cell and keeps focus, and the characters after it shift back', () => {
  const pin = render('482913');
  try {
    pin.focus(2);
    pin.key('Delete');
    assert.deepEqual([pin.code(), pin.active()], ['48913', 2]);
  } finally { pin.destroy(); }
});

test('the arrows stop at both ends, and Home and End jump to them', () => {
  const pin = render('482');
  try {
    pin.focus(0);
    pin.key('ArrowLeft');
    assert.equal(pin.active(), 0);
    pin.key('ArrowRight');
    assert.equal(pin.active(), 1);
    pin.key('End');
    assert.equal(pin.active(), 5);
    pin.key('ArrowRight');
    assert.equal(pin.active(), 5);
    pin.key('Home');
    assert.equal(pin.active(), 0);
    assert.deepEqual(pin.seen, []);
  } finally { pin.destroy(); }
});

test('under dir rtl, ArrowLeft moves on and ArrowRight moves back', () => {
  const pin = render('482', 'rtl');
  try {
    pin.focus(1);
    pin.key('ArrowLeft');
    assert.equal(pin.active(), 2);
    pin.key('ArrowRight');
    assert.equal(pin.active(), 1);
  } finally { pin.destroy(); }
});

test('a full-length paste lands from the first cell wherever it is dropped, then completes', () => {
  const pin = render();
  try {
    pin.focus(3);
    pin.paste('48 29-13');
    assert.deepEqual([pin.code(), pin.active()], ['482913', 5]);
    assert.deepEqual(pin.seen, ['change 482913', 'complete 482913']);
  } finally { pin.destroy(); }
});

test('a shorter paste lands from the focused cell, and an autofill typing the whole code spreads as well', () => {
  const pin = render('482913');
  try {
    pin.focus(2);
    pin.paste('07');
    assert.equal(pin.code(), '480713');
  } finally { pin.destroy(); }
  const filled = render();
  try {
    filled.focus(0);
    filled.type('551234');
    assert.equal(filled.code(), '551234');
  } finally { filled.destroy(); }
});

test('complete follows change once for each edit that fills the code again', () => {
  const pin = render('48291');
  try {
    pin.focus(5);
    pin.type('3');
    pin.key('Backspace');
    pin.type('9');
    pin.type('7');
    assert.deepEqual(pin.seen, ['change 482913', 'complete 482913', 'change 48291', 'change 482919', 'complete 482919', 'change 482917']);
  } finally { pin.destroy(); }
});

test('with no value bound the cells keep what is typed', () => {
  const fixture = TestBed.createComponent(FreeHost);
  fixture.detectChanges();
  const pin = drive(fixture.nativeElement as HTMLElement, () => fixture.detectChanges(), fixture.componentInstance.seen, () => fixture.destroy());
  try {
    pin.focus(0);
    pin.type('7');
    pin.type('3');
    assert.equal(pin.code(), '73');
    assert.deepEqual(pin.seen, ['7', '73']);
  } finally { pin.destroy(); }
});

test('blur fires once focus leaves the group, carrying the code, and never on a move between cells', () => {
  const pin = render('48');
  try {
    const [first, second] = pin.cells();
    first!.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: second }));
    assert.deepEqual(pin.seen, []);
    second!.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: pin.root.querySelector('button') }));
    assert.deepEqual(pin.seen, ['blur 48']);
  } finally { pin.destroy(); }
});

test('a paste that replaces a full code completes again, and a typed character over a full code does not', () => {
  const pin = render('482913');
  try {
    pin.focus(5);
    pin.paste('111111');
    pin.autofill('222222');
    pin.paste('7a');
    pin.type('3');
    assert.deepEqual(pin.seen, ['change 111111', 'complete 111111', 'change 222222', 'complete 222222', 'change 222227', 'change 222223']);
  } finally { pin.destroy(); }
});

test('a value the host does not write back keeps the cells as the host has them, and change still fires', () => {
  const pin = render('12', null, false);
  try {
    pin.focus(2);
    pin.type('3');
    pin.type('4');
    assert.equal(pin.code(), '12');
    assert.deepEqual(pin.seen, ['change 123', 'change 124']);
  } finally { pin.destroy(); }
});

test('focus never sits past the first empty cell once the host has answered an edit', () => {
  const pin = render('12', null, false);
  try {
    pin.focus(2);
    pin.type('3');
    assert.equal(pin.active(), 2);
  } finally { pin.destroy(); }
  const full = render('482913', null, false);
  try {
    full.focus(5);
    full.type('2');
    assert.equal(full.active(), 5);
  } finally { full.destroy(); }
});

test('the tab stop follows focus while the group holds it, and returns to the first empty cell after focus leaves', () => {
  const pin = render('482');
  try {
    assert.deepEqual(pin.stops(), [3]);
    pin.focus(1);
    assert.deepEqual(pin.stops(), [1]);
    pin.cells()[1]!.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: pin.root.querySelector('button') }));
    pin.settle();
    assert.deepEqual(pin.stops(), [3]);
  } finally { pin.destroy(); }
});

test('Delete past the end of the code changes nothing and keeps focus where it was', () => {
  const pin = render('48');
  try {
    pin.focus(0);
    pin.key('End');
    pin.key('Delete');
    assert.equal(pin.active(), 5);
    assert.deepEqual(pin.seen, []);
  } finally { pin.destroy(); }
});

test('a host that moves focus on complete keeps it there', () => {
  const fixture = TestBed.createComponent(VerifyHost);
  fixture.detectChanges();
  const pin = drive(fixture.nativeElement as HTMLElement, () => fixture.detectChanges(), [], () => fixture.destroy());
  try {
    pin.focus(5);
    pin.type('3');
    assertSameNode(pin.root.ownerDocument.activeElement, pin.root.querySelector('button'));
  } finally { pin.destroy(); }
});
