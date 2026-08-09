/* The bare-attribute spelling is a COMPILE-time claim as much as a runtime one: without
 * booleanAttribute the host template below fails ngc under strictTemplates, which is where a
 * consumer meets it. So this suite is compiled by build:angular-tests before it is run, and
 * asserting the rendered result is the second half rather than the whole of it. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaBulkActionBar } from './ArenaBulkActionBar';
import type { ArenaBulkAction } from '../../../Api.generated';

const ACTIONS: readonly ArenaBulkAction[] = [{ id: 'archive', label: 'Archive' }];

@Component({
  standalone: true,
  imports: [ArenaBulkActionBar],
  template: `
    <arena-bulk-action-bar clearable [count]="2" [actions]="actions" />
    <arena-bulk-action-bar [clearable]="false" [count]="2" [actions]="actions" />
  `,
})
class Host {
  protected readonly actions = ACTIONS;
}

test('a bare clearable means true, and its absence is spelled by binding false', () => {
  const fixture = TestBed.createComponent(Host);
  try {
    fixture.detectChanges();
    const bars = fixture.nativeElement.querySelectorAll('arena-bulk-action-bar');
    assert.equal(bars.length, 2);
    assert.ok(bars[0].textContent?.includes('Clear'), 'a bare attribute did not read as true');
    assert.ok(!bars[1].textContent?.includes('Clear'), 'a bound false still drew the control');
  } finally {
    fixture.destroy();
  }
});
