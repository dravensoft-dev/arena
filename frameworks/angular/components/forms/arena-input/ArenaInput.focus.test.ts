/* The input's imperative handle, and the reason it is not a member: none of the nine
 * contract forms is imperative, and returning focus after each completed transaction is the
 * gesture a point of sale is built on. autoFocus fires once at mount and the caller needs it
 * again every time, so the declarative alternative answers a different question.
 * IMPERATIVE_HANDLES in scripts/lib/arena/api-surface.ts is what lets check:api read a public
 * method here at all, and it names each one with its reason. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import { ArenaInput } from './ArenaInput';

test('focus() and select() reach the real input, which is what the class exposes instead of a member', async () => {
  const fixture = TestBed.createComponent(ArenaInput);
  try {
    fixture.componentRef.setInput('label', 'Search');
    fixture.componentRef.setInput('value', 'ACME-1042');
    fixture.detectChanges();
    await fixture.whenStable();

    const control = (fixture.nativeElement as Element).querySelector('input')!;
    assert.notEqual(control.ownerDocument.activeElement, control, 'nothing focuses it on its own');

    fixture.componentInstance.focus();
    assert.equal(control.ownerDocument.activeElement, control,
      'chaining data entry means returning focus after each completion, and no declarative member does that');

    fixture.componentInstance.select();
    assert.equal(control.selectionStart, 0);
    assert.equal(control.selectionEnd, 'ACME-1042'.length);
  } finally { fixture.destroy(); }
});
