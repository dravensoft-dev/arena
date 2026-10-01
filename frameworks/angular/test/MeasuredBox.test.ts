/* check:measured-box holds a manifest slot to its branch, and nothing in the gate proves that
 * slot is the element the component measures. Every manifest-backed entry of MEASURED is mounted,
 * and the element the helper handed its observer must carry the class of the slot the map names.
 * A host that carries the root class counts, since it is the box. */

import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Component, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { laidOut, SilentObserver } from './LaidOut';
import { CHECKS, UTILS } from './Compliance';
import { ArenaTable } from '../components/display/arena-table/ArenaTable';
import { ArenaCalendar } from '../components/display/arena-calendar/ArenaCalendar';
import { ArenaDialog } from '../components/feedback/arena-dialog/ArenaDialog';
import { ArenaBulkActionBar } from '../components/navigation/arena-bulk-action-bar/ArenaBulkActionBar';
import { ArenaPageHead } from '../components/navigation/arena-page-head/ArenaPageHead';

type Measured = { slot: string | null; decides: readonly string[]; why: string };
const { MEASURED } = await import(pathToFileURL(join(CHECKS, 'arena', 'check-measured-box.ts')).href) as
  { MEASURED: Map<string, Measured> };
const { kebab } = await import(pathToFileURL(join(UTILS, 'case.ts')).href) as { kebab: (name: string) => string };

@Component({ standalone: true, imports: [ArenaTable], template: `<arena-table label="Orders" [columns]="[{ header: 'Order' }]" />` })
class TableHost {}

@Component({ standalone: true, imports: [ArenaCalendar], template: '<arena-calendar />' })
class CalendarHost {}

@Component({ standalone: true, imports: [ArenaDialog], template: '<arena-dialog [open]="true" title="Rename" />' })
class DialogHost {}

@Component({ standalone: true, imports: [ArenaBulkActionBar], template: '<arena-bulk-action-bar [count]="2" [actions]="actions" />' })
class BarHost { actions = [{ id: 'archive', label: 'Archive' }]; }

@Component({ standalone: true, imports: [ArenaPageHead], template: '<arena-page-head title="Orders" />' })
class HeadHost {}

const MOUNTS: Record<string, Type<unknown>> = {
  ArenaTable: TableHost, ArenaCalendar: CalendarHost, ArenaDialog: DialogHost,
  ArenaBulkActionBar: BarHost, ArenaPageHead: HeadHost,
};

const slotClass = (name: string, slot: string) => `arena-${kebab(name.replace(/^Arena/, ''))}__${kebab(slot)}`;

const BOXED = [...MEASURED].filter(([, entry]) => entry.slot !== null);

test('every manifest-backed entry of MEASURED is mounted here', () => {
  assert.deepEqual(BOXED.map(([name]) => name).sort(), Object.keys(MOUNTS).sort());
});

for (const [name, entry] of BOXED) {
  test(`${name} measures the element its ${entry.slot} slot draws`, () => {
    laidOut(900, () => {
      const fixture = TestBed.createComponent(MOUNTS[name]!);
      try {
        fixture.autoDetectChanges();
        TestBed.tick();
        const observed = SilentObserver.made.flatMap((one) => one.observed);
        assert.ok(observed.length > 0, `${name} handed its observer nothing`);
        for (const element of observed) {
          assert.ok(element.classList.contains(slotClass(name, entry.slot!)),
            `${name} measures <${element.tagName.toLowerCase()} class="${element.className}">, and MEASURED says ${entry.slot}`);
        }
      } finally {
        fixture.destroy();
      }
    });
  });
}
