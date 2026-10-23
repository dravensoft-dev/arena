import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ArenaTableColumn } from '../../../Api.generated';
import { ArenaTable } from './ArenaTable';

const root = document.documentElement;
before(() => {
  root.style.setProperty('--bp-md', '768px');
});
after(() => {
  root.style.removeProperty('--bp-md');
});

@Component({
  standalone: true, imports: [ArenaTable],
  template: `<arena-table label="Recent deployments" [columns]="columns" />`,
})
class EmptyHost { columns: ArenaTableColumn[] = [{ header: 'Service' }]; }

test('a table with no rows and no projected empty content says what ArenaTable.json contracts it says', () => {
  const fixture = TestBed.createComponent(EmptyHost);
  fixture.detectChanges();
  try {
    const text = (fixture.nativeElement as Element).textContent ?? '';
    assert.match(text, /No data\./,
      'an empty table that says nothing is a blank box the consumer has to explain; the fallback is the '
      + 'generic answer and a consumer who has a better one projects it');
  } finally { fixture.destroy(); }
});
