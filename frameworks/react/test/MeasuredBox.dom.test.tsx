/* check:measured-box holds a manifest slot to its branch, and nothing in the gate proves that
 * slot is the element the component measures. This mounts every manifest-backed entry of
 * MEASURED and reads the element the helper handed its observer. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup } from './Harness.tsx';
import { laidOut, SilentObserver } from './LaidOut.ts';
import { MEASURED } from '../../../scripts/check/arena/check-measured-box.ts';
import { kebab } from '../../../scripts/utils/case.ts';
import { ArenaTable } from '../components/display/arena-table/ArenaTable.tsx';
import { ArenaCalendar } from '../components/display/arena-calendar/ArenaCalendar.tsx';
import { ArenaDialog } from '../components/feedback/arena-dialog/ArenaDialog.tsx';
import { ArenaBulkActionBar } from '../components/navigation/arena-bulk-action-bar/ArenaBulkActionBar.tsx';
import { ArenaPageHead } from '../components/navigation/arena-page-head/ArenaPageHead.tsx';

afterEach(cleanup);

const MOUNTS: Record<string, () => React.ReactElement> = {
  ArenaTable: () => <ArenaTable label="Orders" columns={[{ header: 'Order' }]} />,
  ArenaCalendar: () => <ArenaCalendar />,
  ArenaDialog: () => <ArenaDialog open title="Rename" onClose={() => {}} />,
  ArenaBulkActionBar: () => <ArenaBulkActionBar count={2} actions={[{ id: 'archive', label: 'Archive' }]} />,
  ArenaPageHead: () => <ArenaPageHead title="Orders" />,
};

const slotClass = (name: string, slot: string) => `arena-${kebab(name.replace(/^Arena/, ''))}__${kebab(slot)}`;

const BOXED = [...MEASURED].filter(([, entry]) => entry.slot !== null);

test('every manifest-backed entry of MEASURED is mounted here', () => {
  assert.deepEqual(BOXED.map(([name]) => name).sort(), Object.keys(MOUNTS).sort(),
    'MEASURED gained an entry this suite does not mount, so nothing proves the slot it names');
});

for (const [name, entry] of BOXED) {
  test(`${name} measures the element its ${entry.slot} slot draws`, () => {
    laidOut(900, () => mount(MOUNTS[name]!()));
    const observed = SilentObserver.made.flatMap((one) => one.observed);
    assert.ok(observed.length > 0, `${name} handed its observer nothing`);
    for (const element of observed) {
      assert.ok(element.classList.contains(slotClass(name, entry.slot!)),
        `${name} measures <${element.tagName.toLowerCase()} class="${element.className}">, and MEASURED says ${entry.slot}`);
    }
  });
}
