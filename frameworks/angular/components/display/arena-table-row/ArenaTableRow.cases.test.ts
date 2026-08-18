/* The per-case suite this row's binding requires. The row injects ArenaTableState, so it cannot be
 * rendered alone -- every case mounts a real arena-table around it. Reaching the card shape
 * needs the same two levers ArenaTable.cases.test.ts uses and for the same reasons: happy-dom ships
 * no ResizeObserver that ever fires, and arenaReadBreakpoint reads --bp-md through getComputedStyle,
 * which is empty here. Both are set below and undone in a finally, because the document and the
 * breakpoint cache are shared by the whole run -- 768 is the value the cache already holds.
 * `activated` counts what a CONSUMER hears: Angular installs BOTH a DOM listener and an output
 * subscription for a native event name, so a template (click) binding counts the sum and one is
 * the only passing number. emissionsOf() counts the OUTPUT on the component instance, because
 * the sum alone cannot tell an emit from a bubble. Both are asserted; either alone is blind. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { ArenaTableColumn } from '../../../Api.generated';
import { ArenaTable } from '../arena-table/ArenaTable';
import { ArenaTableRow } from './ArenaTableRow';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell';
import { assertPatternCases, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'display/arena-table-row/ArenaTableRow.behaviour.json');
const LABEL = 'Recent deployments';
const COLUMNS: ArenaTableColumn[] = [{ header: 'Service' }, { header: 'Status' }];
const BP_MD = '768px';
const NARROW_WIDTH = 400;

@Component({
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table [label]="label" [columns]="columns" [responsive]="responsive">
      <tr arena-table-row [interactive]="interactive" [disabled]="disabled" (click)="activated = activated + 1">
        <td arena-table-cell>checkout-api</td>
        <td arena-table-cell>Healthy</td>
      </tr>
    </arena-table>
  `,
})
class RowHost {
  label = LABEL;
  columns: ArenaTableColumn[] = COLUMNS;
  responsive = false;
  interactive = false;
  disabled = false;
  activated = 0;
}

function stubResize(width: number): () => void {
  const globals = globalThis as { ResizeObserver?: unknown };
  const saved = globals.ResizeObserver;
  globals.ResizeObserver = class {
    private readonly callback: (entries: Array<{ target: Element; contentRect: { width: number } }>) => void;

    constructor(callback: (entries: Array<{ target: Element; contentRect: { width: number } }>) => void) {
      this.callback = callback;
    }

    observe(target: Element): void {
      this.callback([{ target, contentRect: { width } }]);
    }

    disconnect(): void {}
  };
  return () => { globals.ResizeObserver = saved; };
}

async function render(patch: Partial<RowHost>): Promise<ComponentFixture<RowHost>> {
  const fixture = TestBed.createComponent(RowHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

function emissionsOf(fixture: ComponentFixture<RowHost>): { count: number } {
  const seen = { count: 0 };
  const row = fixture.debugElement.query(By.directive(ArenaTableRow)).componentInstance as ArenaTableRow;
  row.click.subscribe(() => { seen.count += 1; });
  return seen;
}

function rowOf(fixture: ComponentFixture<RowHost>): HTMLElement {
  const table = fixture.nativeElement.querySelector('arena-table') as HTMLElement;
  return table.querySelectorAll<HTMLElement>('tr[arena-table-row]')[0];
}

function press(el: HTMLElement, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return event;
}

test('arena-table-row meets all three of its declared shapes', async () => {
  document.documentElement.style.setProperty('--bp-md', BP_MD);
  const restore = stubResize(NARROW_WIDTH);
  const fixtures: Array<ComponentFixture<RowHost>> = [];
  const open = async (patch: Partial<RowHost>) => {
    const fixture = await render(patch);
    fixtures.push(fixture);
    return fixture;
  };

  try {
    const wide = await open({ responsive: false, interactive: true });
    const interactive = await open({ responsive: true, interactive: true });
    const inert = await open({ responsive: true, interactive: false });
    const locked = await open({ responsive: true, interactive: true, disabled: true });

    assertPatternCases({
      bindingPath: BINDING,
      cases: {
        row: () => {
          const el = rowOf(wide);
          assert.equal(el.tagName, 'TR', 'the wide row is a real table row, and arena-table\'s grid owns it');
          assert.equal(el.hasAttribute('role'), false,
            'the element already maps to a row, so writing the role back onto it is the hand-rebuild the '
            + 'contract refuses');
          assert.equal(el.hasAttribute('tabindex'), false,
            'the roving stop lives on the CELLS -- a stop on the row would be a second one');
          return { root: el, subjects: { default: el } };
        },

        'card-interactive': () => {
          const el = rowOf(interactive);
          assert.equal(el.getAttribute('role'), 'button', 'an interactive card row is a button');
          assert.equal(el.getAttribute('tabindex'), '0', 'a card row is reached by Tab, unlike the wide row');
          assert.match(el.textContent ?? '', /checkout-api/,
            'the button pattern accepts text content as its name, and the cells are that text');

          const emitted = emissionsOf(interactive);
          const before = interactive.componentInstance.activated;
          const enter = press(el, 'Enter');
          interactive.detectChanges();
          assert.equal(emitted.count, 1, 'Enter did not reach the click OUTPUT');
          assert.equal(interactive.componentInstance.activated, before + 1,
            'Enter must reach a consumer exactly once -- two would be the emit plus the native event');
          assert.equal(enter.defaultPrevented, true, 'Enter was not claimed by the row');

          const space = press(el, ' ');
          interactive.detectChanges();
          assert.equal(emitted.count, 2, 'Space did not reach the click OUTPUT');
          assert.equal(interactive.componentInstance.activated, before + 2, 'Space did not activate the card row');
          assert.equal(space.defaultPrevented, true,
            'Space must be prevented, or the page scrolls under the row the user just pressed');

          const lockedEmitted = emissionsOf(locked);
          const offEl = rowOf(locked);
          assert.equal(offEl.getAttribute('aria-disabled'), 'true',
            'a disabled row must announce itself rather than leave the tab order');
          assert.equal(offEl.getAttribute('role'), 'button',
            'it is still a button -- a disabled control that stops being one cannot be found at all');
          press(offEl, 'Enter');
          offEl.click();
          locked.detectChanges();
          assert.equal(lockedEmitted.count, 0, 'a disabled row emitted click');
          assert.equal(locked.componentInstance.activated, 0,
            'and nothing reached the consumer, so the native event did not escape either');

          return {
            root: el,
            subjects: { default: el },
            behavioural: { 'keyboard.Enter': true, 'keyboard.Space': true, 'states.disabled': true },
          };
        },

        'card-inert': () => {
          const el = rowOf(inert);
          assert.equal(el.getAttribute('role'), 'presentation',
            'a row nobody can activate claims no interactive role, and the table role the element carries '
            + 'natively is stripped rather than left describing a stack of cards as a table');
          assert.equal(el.hasAttribute('tabindex'), false,
            'and no tab stop -- a dead stop on every row of every table is worse than the gap it would close');

          const emitted = emissionsOf(inert);
          const before = inert.componentInstance.activated;
          press(el, 'Enter');
          inert.detectChanges();
          assert.equal(emitted.count, 0, 'an inert row emitted click');
          assert.equal(inert.componentInstance.activated, before,
            'Enter reached the consumer through a row that declares itself inert');

          return { root: el, subjects: { default: el } };
        },
      },
    });
  } finally {
    for (const fixture of fixtures) fixture.destroy();
    restore();
    document.documentElement.style.removeProperty('--bp-md');
  }
});
