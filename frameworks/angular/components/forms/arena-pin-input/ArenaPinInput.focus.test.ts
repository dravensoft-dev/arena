/* focus() is the one method the class exposes, named in IMPERATIVE_HANDLES: after a wrong code the
 * host empties the value and asks for the first cell again, which autoFocus, firing once at mount,
 * cannot do. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import { ArenaPinInput } from './ArenaPinInput';
import { assertNotSameNode, assertSameNode } from '../../../test/NodeAssert';

test('focus() reaches the first cell, which is how a host asks for the code again', () => {
  const fixture = TestBed.createComponent(ArenaPinInput);
  fixture.componentRef.setInput('label', 'Verification code');
  fixture.detectChanges();
  try {
    const first = (fixture.nativeElement as HTMLElement).querySelector('[data-arena-part="pin-input.cell"]') as HTMLInputElement;
    assertNotSameNode(first.ownerDocument.activeElement, first, 'nothing focuses a cell on its own');
    fixture.componentInstance.focus();
    assertSameNode(first.ownerDocument.activeElement, first);
  } finally { fixture.destroy(); }
});

test('a blank label throws, since nothing can derive what a code is for', () => {
  const fixture = TestBed.createComponent(ArenaPinInput);
  fixture.componentRef.setInput('label', '   ');
  try {
    assert.throws(() => fixture.detectChanges(), /ArenaPinInput: `label` is required/);
  } finally { fixture.destroy(); }
});
