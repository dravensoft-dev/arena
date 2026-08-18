/* The suite ArenaCard's shape obliges, now that a cell copies it. A cell renders two roots: the
 * wide one projects straight into the host, so no element of its own stands between the cell and
 * the value, and the card one wraps it in a labelled value span. Angular hands content to
 * the FIRST matching <ng-content>, so two branches cannot each carry their own, and the way out
 * is one <ng-template> stamped by whichever branch renders. What no documentation settles is
 * whether the content survives when the branch changes at runtime, which here is a resize rather
 * than an input: a table that re-densifies on rotation and comes back empty would be silent.
 * Reaching either shape needs the two levers the row's own cases use, since happy-dom ships a
 * ResizeObserver that never fires and arenaReadBreakpoint reads --bp-md off an empty computed
 * style, and this stub keeps its callback so a second width can be pushed after mount. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { assertNoNode } from '../../../test/NodeAssert';
import type { ArenaTableColumn } from '../../../Api.generated';
import { ArenaTable } from '../arena-table/ArenaTable';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow';
import { ArenaTableCell } from './ArenaTableCell';

const COLUMNS: ArenaTableColumn[] = [{ header: 'Service' }, { header: 'Status' }];
const BP_MD = '768px';
const WIDE = 1200;
const NARROW = 400;
const VALUE = 'checkout-api';

@Component({
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table label="Recent deployments" [columns]="columns" responsive>
      <tr arena-table-row>
        <td arena-table-cell>{{ value }}</td>
        <td arena-table-cell>Healthy</td>
      </tr>
    </arena-table>
  `,
})
class CellHost {
  columns: ArenaTableColumn[] = COLUMNS;
  value = VALUE;
}

type Entry = { target: Element; contentRect: { width: number } };

function stubResize() {
  const globals = globalThis as { ResizeObserver?: unknown };
  const saved = globals.ResizeObserver;
  const live: Array<{ cb: (e: Entry[]) => void; targets: Element[] }> = [];
  globals.ResizeObserver = class {
    private readonly entry: { cb: (e: Entry[]) => void; targets: Element[] };

    constructor(cb: (e: Entry[]) => void) {
      this.entry = { cb, targets: [] };
      live.push(this.entry);
    }

    observe(target: Element): void { this.entry.targets.push(target); }

    disconnect(): void {}
  };
  const emit = (width: number) => {
    for (const { cb, targets } of live) cb(targets.map((target) => ({ target, contentRect: { width } })));
  };
  return { emit, restore: () => { globals.ResizeObserver = saved; } };
}

const occurrences = (text: string, needle: string) => text.split(needle).length - 1;

test('a cell keeps its projected value through a resize in either direction, and wraps it only in the card shape', async () => {
  const root = document.documentElement;
  const savedBp = root.style.getPropertyValue('--bp-md');
  root.style.setProperty('--bp-md', BP_MD);
  const resize = stubResize();
  const fixture = TestBed.createComponent(CellHost);

  try {
    fixture.detectChanges();
    resize.emit(WIDE);
    fixture.detectChanges();
    await fixture.whenStable();
    const host = fixture.nativeElement as Element;

    const cell = () => host.querySelector('td[arena-table-cell]');
    assert.equal(occurrences(host.textContent ?? '', VALUE), 1, 'the value is projected once in the wide shape');
    assertNoNode(
      cell()?.querySelector('span'),
      'the wide shape must project straight into the cell. A wrapper span with no class of its own '
      + 'is an element nothing asked for, and it moves the text off the subpixel a cell without one '
      + 'draws it on, which is how this was found.',
    );

    resize.emit(NARROW);
    fixture.detectChanges();
    await fixture.whenStable();

    assert.equal(
      occurrences(host.textContent ?? '', VALUE), 1,
      'the value must survive the branch change. Angular projects content nodes once, so a template '
      + 'the other branch re-instantiates can arrive empty, and an empty table is the silent failure '
      + 'this shape is only allowed on condition of avoiding',
    );
    assert.ok(cell()?.querySelector('span'), 'the card shape wraps its value, which is what carries the label beside it');

    resize.emit(WIDE);
    fixture.detectChanges();
    await fixture.whenStable();

    assert.equal(occurrences(host.textContent ?? '', VALUE), 1, 'the value must survive the change back');
    assertNoNode(cell()?.querySelector('span'), 'and the wide shape must drop the wrapper again');
  } finally {
    fixture.destroy();
    resize.restore();
    if (savedBp) root.style.setProperty('--bp-md', savedBp); else root.style.removeProperty('--bp-md');
  }
});
