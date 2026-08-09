/* Every OTHER fixture and playground here declares projected children with STATIC ATTRIBUTES,
 * which Angular sets at element creation, so the shape that broke ArenaCalendar in a real app
 * never appears: a property binding inside a `@for`, where `ɵɵrepeater` has created every
 * embedded view but only the first one's bindings have run, so a parent reaching for a sibling
 * gets NG0950 and loses the whole pass. So this suite writes children the way a consumer does and
 * pins the result against the static spelling of the same tree. Twice, because the moments
 * differ: a list bound before the first render creates its views inside the parent's first pass,
 * and one that grows later creates them into a tree already built. The walk is bidirectional, so
 * a new component owning a content query cannot ship without a fixture and a name left behind
 * once a query is gone fails as stale. The rule itself is in AGENTS.md. */

import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Component, type Type, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ArenaTableColumn } from '../Api.generated';
import { ArenaCalendar } from '../components/display/arena-calendar/ArenaCalendar';
import { ArenaCalendarEvent } from '../components/display/arena-calendar-event/ArenaCalendarEvent';
import { ArenaTable } from '../components/display/arena-table/ArenaTable';
import { ArenaTableCell } from '../components/display/arena-table-cell/ArenaTableCell';
import { ArenaTableRow } from '../components/display/arena-table-row/ArenaTableRow';
import { ArenaTab } from '../components/navigation/arena-tab/ArenaTab';
import { ArenaTabs } from '../components/navigation/arena-tabs/ArenaTabs';
import { ANGULAR_COMPONENTS } from './Compliance';

interface Growable {
  fill(): void;
}

interface EventSpec {
  id: string;
  title: string;
  start: string;
  end: string;
}

const EVENTS: readonly EventSpec[] = [
  { id: 'long', title: 'Design review', start: '2027-03-17T09:00:00Z', end: '2027-03-17T11:00:00Z' },
  { id: 'over', title: 'Vendor sync', start: '2027-03-17T09:30:00Z', end: '2027-03-17T10:30:00Z' },
  { id: 'short', title: 'Standup', start: '2027-03-18T09:00:00Z', end: '2027-03-18T09:30:00Z' },
];

const CALENDAR = 'timeZone="UTC" anchorDate="2027-03-15" view="week" dayStart="09:00" dayEnd="12:00"';

@Component({
  standalone: true,
  imports: [ArenaCalendar, ArenaCalendarEvent],
  template: `
    <arena-calendar ${CALENDAR}>
      @for (event of shown(); track event.id) {
        <arena-calendar-event [id]="event.id" [title]="event.title"
                              [start]="event.start" [end]="event.end" />
      }
    </arena-calendar>
  `,
})
class CalendarRepeat implements Growable {
  readonly shown = signal<readonly EventSpec[]>([]);

  fill(): void {
    this.shown.set(EVENTS);
  }
}

@Component({
  standalone: true,
  imports: [ArenaCalendar, ArenaCalendarEvent],
  template: `
    <arena-calendar ${CALENDAR}>
      <arena-calendar-event id="long" title="Design review"
                            start="2027-03-17T09:00:00Z" end="2027-03-17T11:00:00Z" />
      <arena-calendar-event id="over" title="Vendor sync"
                            start="2027-03-17T09:30:00Z" end="2027-03-17T10:30:00Z" />
      <arena-calendar-event id="short" title="Standup"
                            start="2027-03-18T09:00:00Z" end="2027-03-18T09:30:00Z" />
    </arena-calendar>
  `,
})
class CalendarFixed {}

interface TabSpec {
  value: string;
  label: string;
}

const TABS: readonly TabSpec[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'nodes', label: 'Nodes' },
  { value: 'alerts', label: 'Alerts' },
];

@Component({
  standalone: true,
  imports: [ArenaTabs, ArenaTab],
  template: `
    <arena-tabs>
      @for (tab of shown(); track tab.value) {
        <arena-tab [value]="tab.value" [label]="tab.label">{{ tab.label }} panel</arena-tab>
      }
    </arena-tabs>
  `,
})
class TabsRepeat implements Growable {
  readonly shown = signal<readonly TabSpec[]>([]);

  fill(): void {
    this.shown.set(TABS);
  }
}

@Component({
  standalone: true,
  imports: [ArenaTabs, ArenaTab],
  template: `
    <arena-tabs>
      <arena-tab value="overview" label="Overview">Overview panel</arena-tab>
      <arena-tab value="nodes" label="Nodes">Nodes panel</arena-tab>
      <arena-tab value="alerts" label="Alerts">Alerts panel</arena-tab>
    </arena-tabs>
  `,
})
class TabsFixed {}

const COLUMNS: readonly ArenaTableColumn[] = [{ header: 'Node' }, { header: 'Region' }];

interface RowSpec {
  id: string;
  node: string;
  region: string;
}

const ROWS: readonly RowSpec[] = [
  { id: 'n1', node: 'eu-south-1', region: 'eu-south' },
  { id: 'n2', node: 'eu-west-2', region: 'eu-west' },
];

@Component({
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table label="Nodes" [columns]="columns">
      @for (row of shown(); track row.id) {
        <arena-table-row [interactive]="true">
          <arena-table-cell>{{ row.node }}</arena-table-cell>
          <arena-table-cell>{{ row.region }}</arena-table-cell>
        </arena-table-row>
      }
    </arena-table>
  `,
})
class TableRepeat implements Growable {
  readonly columns = COLUMNS;

  readonly shown = signal<readonly RowSpec[]>([]);

  fill(): void {
    this.shown.set(ROWS);
  }
}

@Component({
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table label="Nodes" [columns]="columns">
      <arena-table-row interactive>
        <arena-table-cell>eu-south-1</arena-table-cell>
        <arena-table-cell>eu-south</arena-table-cell>
      </arena-table-row>
      <arena-table-row interactive>
        <arena-table-cell>eu-west-2</arena-table-cell>
        <arena-table-cell>eu-west</arena-table-cell>
      </arena-table-row>
    </arena-table>
  `,
})
class TableFixed {
  readonly columns = COLUMNS;
}

const CELLS: readonly string[] = ['eu-south-1', 'eu-south'];

@Component({
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table label="Nodes" [columns]="columns">
      <arena-table-row>
        @for (cell of shown(); track cell) {
          <arena-table-cell>{{ cell }}</arena-table-cell>
        }
      </arena-table-row>
    </arena-table>
  `,
})
class RowRepeat implements Growable {
  readonly columns = COLUMNS;

  readonly shown = signal<readonly string[]>([]);

  fill(): void {
    this.shown.set(CELLS);
  }
}

@Component({
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table label="Nodes" [columns]="columns">
      <arena-table-row>
        <arena-table-cell>eu-south-1</arena-table-cell>
        <arena-table-cell>eu-south</arena-table-cell>
      </arena-table-row>
    </arena-table>
  `,
})
class RowFixed {
  readonly columns = COLUMNS;
}

type Read = (root: HTMLElement) => unknown;

const chips: Read = (root) => [...root.querySelectorAll<HTMLElement>('[id^="arena-calendar-event-"]')]
  .map((chip) => ({
    text: chip.textContent,
    top: chip.style.top,
    height: chip.style.height,
    left: chip.style.left,
    right: chip.style.right,
  }));

const tabButtons: Read = (root) => [...root.querySelectorAll<HTMLElement>('[role="tab"]')]
  .map((button) => ({
    text: button.textContent,
    selected: button.getAttribute('aria-selected'),
    stop: button.getAttribute('tabindex'),
    panel: root.querySelector(`#${button.getAttribute('aria-controls')}`)?.tagName ?? null,
  }));

const gridCells: Read = (root) => [...root.querySelectorAll<HTMLElement>('[role="row"]')]
  .map((row) => ({
    cells: [...row.querySelectorAll<HTMLElement>('[role="gridcell"]')].map((cell) => ({
      text: cell.textContent, stop: cell.getAttribute('tabindex'), width: cell.style.width,
    })),
  }));

interface Family {
  repeat: Type<Growable>;
  fixed: Type<unknown>;
  read: Read;
}

const FAMILIES = new Map<string, Family>([
  ['display/arena-calendar', { repeat: CalendarRepeat, fixed: CalendarFixed, read: chips }],
  ['display/arena-table', { repeat: TableRepeat, fixed: TableFixed, read: gridCells }],
  ['display/arena-table-row', { repeat: RowRepeat, fixed: RowFixed, read: gridCells }],
  ['navigation/arena-tabs', { repeat: TabsRepeat, fixed: TabsFixed, read: tabButtons }],
]);

async function settle(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

async function repeatRead(family: Family, when: 'bound' | 'grown'): Promise<unknown> {
  const fixture = TestBed.createComponent(family.repeat);
  try {
    if (when === 'bound') fixture.componentInstance.fill();
    await settle(fixture);
    if (when === 'grown') {
      fixture.componentInstance.fill();
      await settle(fixture);
    }
    return family.read(fixture.nativeElement as HTMLElement);
  } finally {
    fixture.destroy();
  }
}

async function fixedRead(family: Family): Promise<unknown> {
  const fixture = TestBed.createComponent(family.fixed);
  try {
    await settle(fixture);
    return family.read(fixture.nativeElement as HTMLElement);
  } finally {
    fixture.destroy();
  }
}

function componentsWithContentQuery(): string[] {
  const found: string[] = [];
  for (const category of readdirSync(ANGULAR_COMPONENTS, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    const dir = join(ANGULAR_COMPONENTS, category.name);
    for (const component of readdirSync(dir, { withFileTypes: true })) {
      if (!component.isDirectory()) continue;
      const inside = join(dir, component.name);
      const owns = readdirSync(inside)
        .filter((file) => file.endsWith('.ts') && !file.includes('.test.'))
        .some((file) => readFileSync(join(inside, file), 'utf8').includes('contentChildren('));
      if (owns) found.push(`${category.name}/${component.name}`);
    }
  }
  return found.sort();
}

test('every component that queries its content children declares what it does under a repeat', () => {
  const owners = componentsWithContentQuery();
  assert.ok(owners.length > 0,
    'no contentChildren() query found anywhere -- the walk would silently check nothing');
  assert.deepEqual(owners, [...FAMILIES.keys()].sort(),
    'FAMILIES must name exactly the components that own a contentChildren() query. A new one owes '
    + 'a fixture here, because a content query is the only way to read a sibling too early; a name '
    + 'left behind after a query is gone is stale and says this suite covers more than it does.');
});

for (const [name, family] of FAMILIES) {
  for (const when of ['bound', 'grown'] as const) {
    test(`${name}: children property-bound in a @for, ${when}, render what static ones do`, async () => {
      const repeated = await repeatRead(family, when);
      const fixed = await fixedRead(family);

      assert.ok(Array.isArray(repeated) && repeated.length > 0,
        `${name} rendered no projected children through @for at all -- either the fixture projects `
        + 'nothing, or the parent threw mid-pass and left the tree unbuilt, which is the defect '
        + 'this suite exists for');
      assert.deepEqual(repeated, fixed,
        `${name} draws a different tree when its children are property-bound inside a @for than `
        + 'when they carry static attributes. The parent is reading a projected sibling before that '
        + 'sibling\'s bindings have run; have the child publish its inputs instead. See '
        + 'ProjectedInputs.ts.');
    });
  }
}
