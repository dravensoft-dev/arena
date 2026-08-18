/* `none` requires nothing, so assertPattern alone would pass over a list that had grown a role or
 * a tab stop. The claim the binding makes is that the association between a term and its value is
 * the platform's, which means real dt and dd elements inside a real dl, and that is what the hand
 * assertions check. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ArenaKeyValueRow } from '../../../Api.generated';
import { ArenaKeyValue } from './ArenaKeyValue';
import { assertPattern, isFocusable, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'display/arena-key-value/ArenaKeyValue.behaviour.json');

const ROWS: ArenaKeyValueRow[] = [
  { term: 'Method', value: 'Standard' },
  { term: 'Subtotal', value: '42.00', numeric: true },
];

@Component({
  standalone: true,
  imports: [ArenaKeyValue],
  template: `<arena-key-value [rows]="rows" [total]="total" />`,
})
class ListHost {
  rows: readonly ArenaKeyValueRow[] = ROWS;
  total: ArenaKeyValueRow | undefined = undefined;
}

function render(patch: Partial<ListHost> = {}) {
  const fixture = TestBed.createComponent(ListHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  return fixture;
}

const listOf = (fixture: ReturnType<typeof render>) =>
  fixture.nativeElement.querySelector('dl') as HTMLElement;

test('arena-key-value renders a real definition list and nothing to act on', () => {
  const fixture = render();
  try {
    const list = listOf(fixture);
    assert.ok(list, 'the component renders no dl at all');
    assert.equal(list.getAttribute('role'), null,
      'a list role here would claim a structure a reader walks past rather than reads');
    assert.equal(list.querySelectorAll('dt').length, ROWS.length);
    assert.equal(list.querySelectorAll('dd').length, ROWS.length);

    for (const el of [list, ...Array.from(list.querySelectorAll('*'))]) {
      assert.equal(isFocusable(el as Element), false,
        `<${el.tagName.toLowerCase()}> inside the list is reachable by keyboard, so a user tabs to something inert`);
    }

    assertPattern({ root: list, bindingPath: BINDING, subjects: { default: list } });
  } finally { fixture.destroy(); }
});

test('a figure takes a different value class from a line of prose', () => {
  const fixture = render();
  try {
    const values = Array.from(listOf(fixture).querySelectorAll('dd')).map((dd) => dd.className);
    assert.notEqual(values[0], values[1],
      'a money column that does not take tabular numerals is a column that jitters as it changes');
  } finally { fixture.destroy(); }
});

test('the total is drawn last and only when given, in a row of its own', () => {
  const without = render();
  try {
    assert.equal(listOf(without).querySelectorAll('dt').length, ROWS.length);
  } finally { without.destroy(); }

  const withTotal = render({ total: { term: 'Total', value: '46.50', numeric: true } });
  try {
    const list = listOf(withTotal);
    const terms = Array.from(list.querySelectorAll('dt')).map((dt) => dt.textContent?.trim());
    assert.deepEqual(terms, ['Method', 'Subtotal', 'Total']);
    const rows = Array.from(list.children).map((row) => row.className);
    assert.notEqual(rows[rows.length - 1], rows[0],
      'deriving a total from its position would make the last adjustment in a list look like one');
  } finally { withTotal.destroy(); }
});

test('an empty list renders an empty dl rather than throwing', () => {
  const fixture = render({ rows: [] });
  try {
    assert.equal(listOf(fixture).children.length, 0);
  } finally { fixture.destroy(); }
});
