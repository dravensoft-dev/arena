/* The anchor convention, and the one question this member adds to it: what happens when a cell that
 * navigates sits inside a row that also activates. The answer is that the anchor wins and the row
 * stays silent, which is not new behaviour but the predicate the row already applies to any control
 * a consumer puts in a cell -- so what is asserted here is that Arena's OWN anchor is on the same
 * side of it as a consumer's would be. The rest is the settled split: one activation a router owns,
 * every other one left to the browser with nothing emitted. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { assertNoNode } from '../../../test/NodeAssert';
import type { ArenaTableColumn } from '../../../Api.generated';
import { ArenaTable } from '../arena-table/ArenaTable';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow';
import { ArenaTableCell } from './ArenaTableCell';

const COLUMNS: ArenaTableColumn[] = [{ header: 'Sale' }, { header: 'Customer' }];

@Component({
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table label="Recent sales" [columns]="columns" [responsive]="false">
      <tr arena-table-row [interactive]="interactive" (click)="rows = rows + 1">
        <td arena-table-cell href="/sales/4f2a1c9" (navigate)="went = went + 1">4f2a1c9</td>
        <td arena-table-cell>Nestor</td>
      </tr>
    </arena-table>
  `,
})
class AnchoredHost {
  columns: ArenaTableColumn[] = COLUMNS;
  interactive = true;
  rows = 0;
  went = 0;
}

function render(patch: Partial<AnchoredHost> = {}): ComponentFixture<AnchoredHost> {
  const fixture = TestBed.createComponent(AnchoredHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  return fixture;
}

function anchorOf(fixture: ComponentFixture<AnchoredHost>): HTMLAnchorElement {
  const host = fixture.nativeElement as HTMLElement;
  return host.querySelector('td[arena-table-cell] a') as HTMLAnchorElement;
}

function press(el: Element, over: Partial<MouseEventInit> = {}): MouseEvent {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...over });
  el.dispatchEvent(event);
  return event;
}

test('a cell with href draws a real anchor inside its own box, carrying the address', () => {
  const fixture = render();
  try {
    const anchor = anchorOf(fixture);
    assert.ok(anchor, 'no anchor was drawn at all, so the destination is reachable by nothing');
    assert.equal(anchor.getAttribute('href'), '/sales/4f2a1c9',
      'the anchor carries no address, which is the whole of what a crawler and a ctrl-click read');
    assert.equal(anchor.parentElement?.tagName, 'TD',
      'the anchor is not inside the cell box, which is the one place HTML admits it without breaking '
      + 'the row and cell structure the grid is made of');
    assert.match(anchor.textContent ?? '', /4f2a1c9/, 'the projected content is not inside the anchor');
  } finally {
    fixture.destroy();
  }
});

test('a cell with no href draws no anchor, so nothing announces a destination there is none of', () => {
  const fixture = render();
  try {
    const host = fixture.nativeElement as HTMLElement;
    const plain = host.querySelectorAll('td[arena-table-cell]')[1] as HTMLElement;
    assertNoNode(plain.querySelector('a'), 'a cell with no href drew an anchor');
  } finally {
    fixture.destroy();
  }
});

test('a primary click is cancelled and reported, and the row it sits in does not fire', () => {
  const fixture = render();
  try {
    const event = press(anchorOf(fixture));
    fixture.detectChanges();

    assert.equal(fixture.componentInstance.went, 1, 'the anchor did not report the one activation a router owns');
    assert.equal(event.defaultPrevented, true,
      'the anchor was left to navigate on its own, so a router never gets the chance to');
    assert.equal(fixture.componentInstance.rows, 0,
      'the row fired under its own cell anchor, so one press ran two destinations: the precedence is '
      + 'that a press landing on a control inside the row was never the row\'s');
  } finally {
    fixture.destroy();
  }
});

test('a modified click and a middle click stay the browser\'s, and report nothing', () => {
  const fixture = render();
  try {
    const anchor = anchorOf(fixture);
    for (const over of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
      const event = press(anchor, over);
      fixture.detectChanges();
      assert.equal(event.defaultPrevented, false,
        `${JSON.stringify(over)} was cancelled -- the reader asked for a new tab or for the address, and `
        + 'answering with an in-app route is the defect the convention exists to avoid');
    }
    assert.equal(fixture.componentInstance.went, 0, 'a modified activation reported through `navigate`');
    assert.equal(fixture.componentInstance.rows, 0, 'a modified activation reached the row instead');
  } finally {
    fixture.destroy();
  }
});

test('the row still activates from a cell that carries no anchor, so the two coexist', () => {
  const fixture = render();
  try {
    const host = fixture.nativeElement as HTMLElement;
    press(host.querySelectorAll('td[arena-table-cell]')[1] as Element);
    fixture.detectChanges();

    assert.equal(fixture.componentInstance.rows, 1,
      'the anchor in a sibling cell silenced the row everywhere, which is a member taking more than it asks for');
    assert.equal(fixture.componentInstance.went, 0, 'and the anchor reported an activation that never touched it');
  } finally {
    fixture.destroy();
  }
});

test('the anchor is a tab stop of its own, one Tab from the cell rather than a step-in', () => {
  const fixture = render();
  try {
    const anchor = anchorOf(fixture);
    assert.equal(anchor.hasAttribute('tabindex'), false,
      'the anchor was given a tabindex, and a native anchor is already in the tab sequence: writing one '
      + 'back onto it is how a grid ends up with a stop it did not mean to place');
  } finally {
    fixture.destroy();
  }
});
