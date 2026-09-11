/* Every word Arena draws is answered through the locale. Each case renders a component under a
 * locale whose every field reads ⟦field⟧, and fails on a text node or an aria-label,
 * aria-roledescription or title that still carries a word once the sentinels, the case's own
 * consumer strings and the dates it accepts are taken out. The roster is Components.json: a
 * component is a CASE, or NO_WORDS says why it draws no word of its own, so the next component
 * fails here until somebody classifies it, and a name left behind fails as stale. */
import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Component, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { REPO } from './Compliance';
import { ARENA_DEFAULT_LOCALE, provideArenaLocale } from '../ArenaLocale';
import { arenaPhraseParts } from '../Phrase';
import type { ArenaLocale } from '../Api.generated';
import { ARENA_DATE_OPTIONS, arenaAddDays, arenaFormatDate, arenaRangeTitle } from '../components/display/arena-calendar/CalendarInternals';
import { ArenaCalendar } from '../components/display/arena-calendar/ArenaCalendar';
import { ArenaCalendarEvent } from '../components/display/arena-calendar-event/ArenaCalendarEvent';
import { ArenaPagination } from '../components/navigation/arena-pagination/ArenaPagination';
import { ArenaTable } from '../components/display/arena-table/ArenaTable';
import { ArenaTableRow } from '../components/display/arena-table-row/ArenaTableRow';
import { ArenaTableCell } from '../components/display/arena-table-cell/ArenaTableCell';
import { ArenaToast } from '../components/feedback/arena-toast/ArenaToast';
import { ArenaSheet } from '../components/feedback/arena-sheet/ArenaSheet';
import { ArenaAlert } from '../components/feedback/arena-alert/ArenaAlert';
import { ArenaTag } from '../components/display/arena-tag/ArenaTag';
import { ArenaSkeleton } from '../components/display/arena-skeleton/ArenaSkeleton';
import { ArenaSpinner } from '../components/feedback/arena-spinner/ArenaSpinner';
import { ArenaSwitch } from '../components/forms/arena-switch/ArenaSwitch';
import { ArenaBulkActionBar } from '../components/navigation/arena-bulk-action-bar/ArenaBulkActionBar';
import { ArenaCommandPalette } from '../components/navigation/arena-command-palette/ArenaCommandPalette';
import { ArenaOnboarding } from '../components/feedback/arena-onboarding/ArenaOnboarding';
import { ArenaConfirmDialog } from '../components/feedback/arena-confirm-dialog/ArenaConfirmDialog';
import { ArenaErrorState } from '../components/feedback/arena-error-state/ArenaErrorState';
import { ArenaAvatar } from '../components/display/arena-avatar/ArenaAvatar';
import { ArenaLineChart } from '../components/charts/arena-line-chart/ArenaLineChart';
import { ArenaBarChart } from '../components/charts/arena-bar-chart/ArenaBarChart';
import { ArenaHorizontalBarChart } from '../components/charts/arena-horizontal-bar-chart/ArenaHorizontalBarChart';
import { ArenaPyramidChart } from '../components/charts/arena-pyramid-chart/ArenaPyramidChart';
import { ArenaDoughnutChart } from '../components/charts/arena-doughnut-chart/ArenaDoughnutChart';
import { ArenaRadarChart } from '../components/charts/arena-radar-chart/ArenaRadarChart';
import { ArenaScatterChart } from '../components/charts/arena-scatter-chart/ArenaScatterChart';

export function sentinelLocale(base: ArenaLocale = ARENA_DEFAULT_LOCALE): ArenaLocale {
  const out: Record<string, string> = {};
  for (const [key, text] of Object.entries(base)) {
    if (key === 'locale') { out[key] = 'es-ES'; continue; }
    const slots = arenaPhraseParts(text).flatMap((part) => ('slot' in part ? [`{${part.slot}}`] : []));
    out[key] = [`⟦${key}⟧`, ...slots].join(' ');
  }
  return out as unknown as ArenaLocale;
}

const SENTINEL = /⟦\w+⟧/g;
const NEUTRAL = /^[\d\s.,:;%+\-/()‒-―↑↓▾−·…"'?!]*$/;
const NAMED = ['aria-label', 'aria-roledescription', 'title'];

export function strayWords(host: Element, allowed: readonly string[]): string[] {
  const longestFirst = [...allowed].filter(Boolean).sort((a, b) => b.length - a.length);
  const stray = (text: string) => {
    let rest = text.replace(SENTINEL, ' ');
    for (const one of longestFirst) rest = rest.split(one).join(' ');
    return NEUTRAL.test(rest) ? null : text.trim();
  };
  const found: string[] = [];
  const walker = host.ownerDocument.createTreeWalker(host, 4);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const hit = stray(node.textContent ?? '');
    if (hit) found.push(hit);
  }
  for (const el of [host, ...host.querySelectorAll('*')]) {
    for (const name of NAMED) {
      const value = el.getAttribute(name);
      const hit = value === null ? null : stray(value);
      if (hit) found.push(`${name}="${hit}"`);
    }
  }
  return found;
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

const WEEK = '2026-03-16';

function calendarDates(): string[] {
  const days = Array.from({ length: 7 }, (_, i) => arenaAddDays(WEEK, i));
  return [arenaRangeTitle(days, 'es-ES'), ...days.flatMap((day) => Object.values(ARENA_DATE_OPTIONS).map((opts) => arenaFormatDate(day, 'es-ES', opts)))];
}

@Component({
  standalone: true,
  imports: [ArenaCalendar, ArenaCalendarEvent],
  template: `
    <arena-calendar anchorDate="2026-03-16" view="week" timeZone="Europe/Madrid" dayStart="08:00" dayEnd="12:00">
      <arena-calendar-event id="standup" title="Standup" start="2026-03-16T09:00" end="2026-03-16T10:00" [actionsEnabled]="true" [interactive]="true" />
    </arena-calendar>`,
})
class CalendarHost {}

@Component({ standalone: true, imports: [ArenaPagination], template: `<arena-pagination [page]="2" [pageCount]="5" ariaLabel="Deployments" />` })
class PaginationHost {}

@Component({ standalone: true, imports: [ArenaTable], template: `<arena-table label="Projects" [columns]="[{ header: 'Name', sortable: true }]" />` })
class EmptyTableHost {}

@Component({
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table label="Projects" [columns]="[{ header: 'Name', sortable: true }]" [sort]="{ column: 0, direction: 'asc' }">
      <tr arena-table-row><td arena-table-cell>Atlas</td></tr>
    </arena-table>`,
})
class SortedTableHost {}

@Component({ standalone: true, imports: [ArenaToast], template: `<arena-toast title="Saved" message="Draft stored" [persist]="true" [dismissible]="true" />` })
class ToastHost {}

@Component({ standalone: true, imports: [ArenaSheet], template: `<arena-sheet [open]="true" title="Filters" [dismissible]="true">Body</arena-sheet>` })
class SheetHost {}

@Component({ standalone: true, imports: [ArenaAlert], template: `<arena-alert tone="info" title="Heads up" [dismissible]="true">Body</arena-alert>` })
class AlertHost {}

@Component({ standalone: true, imports: [ArenaTag], template: `<arena-tag [removable]="true">Beta</arena-tag>` })
class TagHost {}

@Component({ standalone: true, imports: [ArenaSkeleton], template: `<arena-skeleton /><arena-skeleton variant="text" [lines]="2" />` })
class SkeletonHost {}

@Component({ standalone: true, imports: [ArenaSpinner], template: `<arena-spinner />` })
class SpinnerHost {}

@Component({ standalone: true, imports: [ArenaSwitch], template: `<arena-switch label="Auto deploy" [confirm]="true" />` })
class SwitchHost {}

@Component({ standalone: true, imports: [ArenaBulkActionBar], template: `<arena-bulk-action-bar [count]="3" [actions]="[{ id: 'archive', label: 'Archive' }]" />` })
class BulkHost {}

@Component({ standalone: true, imports: [ArenaCommandPalette], template: `<arena-command-palette [open]="true" [commands]="[{ id: 'deploy', label: 'Deploy' }]" />` })
class PaletteHost {}

@Component({
  standalone: true,
  imports: [ArenaOnboarding],
  template: `<arena-onboarding [open]="true" [index]="1" [steps]="steps" /><arena-onboarding [open]="true" [index]="2" [steps]="steps" />`,
})
class OnboardingHost { steps = [{ body: 'One' }, { body: 'Two' }, { body: 'Three' }]; }

@Component({ standalone: true, imports: [ArenaConfirmDialog], template: `<arena-confirm-dialog [open]="true" title="Delete project" requireText="atlas" [destructive]="true">Gone for good</arena-confirm-dialog>` })
class ConfirmHost {}

@Component({ standalone: true, imports: [ArenaErrorState], template: `<arena-error-state message="The server did not answer" />` })
class ErrorStateHost {}

@Component({
  standalone: true,
  imports: [ArenaAvatar],
  template: `<arena-avatar name="Ada Lovelace" status="online" /><arena-avatar name="Ada Lovelace" status="busy" /><arena-avatar name="Ada Lovelace" status="away" /><arena-avatar name="Ada Lovelace" status="offline" />`,
})
class AvatarHost {}

@Component({ standalone: true, imports: [ArenaLineChart], template: `<arena-line-chart label="Latency" [labels]="['Mon', 'Tue']" [series]="[{ label: 'p95', values: [1, 2] }]" />` })
class LineHost {}

@Component({ standalone: true, imports: [ArenaBarChart], template: `<arena-bar-chart label="Builds" [labels]="['Mon', 'Tue']" [series]="[{ label: 'ok', values: [1, 2] }]" />` })
class BarHost {}

@Component({ standalone: true, imports: [ArenaHorizontalBarChart], template: `<arena-horizontal-bar-chart label="Builds" [labels]="['Mon', 'Tue']" [series]="[{ label: 'ok', values: [1, 2] }]" />` })
class HorizontalBarHost {}

@Component({
  standalone: true,
  imports: [ArenaPyramidChart],
  template: `<arena-pyramid-chart label="Ages" [labels]="['0-17', '18+']" [series]="[{ label: 'Women', values: [1, 2] }, { label: 'Men', values: [2, 1] }]" />`,
})
class PyramidHost {}

@Component({
  standalone: true,
  imports: [ArenaDoughnutChart],
  template: `<arena-doughnut-chart label="Share" [labels]="['A', 'B']" [series]="[{ label: 'share', values: [1, 2] }]" /><arena-doughnut-chart label="Share" shape="pie" [labels]="['A', 'B']" [series]="[{ label: 'share', values: [1, 2] }]" />`,
})
class DoughnutHost {}

@Component({ standalone: true, imports: [ArenaRadarChart], template: `<arena-radar-chart label="Skills" [labels]="['Go', 'TS', 'SQL']" [series]="[{ label: 'Ada', values: [1, 2, 3] }]" />` })
class RadarHost {}

@Component({ standalone: true, imports: [ArenaScatterChart], template: `<arena-scatter-chart label="Load" xLabel="Requests" yLabel="Latency" [series]="[{ label: 'Staging', x: [1, 2], y: [3, 4] }]" />` })
class ScatterHost {}

type Case = { hosts: Type<unknown>[]; consumer: string[]; accept?: () => string[]; narrow?: boolean };

const CASES: Record<string, Case> = {
  ArenaCalendar: { hosts: [CalendarHost], consumer: ['Standup'], accept: calendarDates },
  ArenaPagination: { hosts: [PaginationHost], consumer: ['Deployments'] },
  ArenaTable: { hosts: [EmptyTableHost, SortedTableHost], consumer: ['Projects', 'Name', 'Atlas'], narrow: true },
  ArenaToast: { hosts: [ToastHost], consumer: ['Saved', 'Draft stored'] },
  ArenaSheet: { hosts: [SheetHost], consumer: ['Filters', 'Body'] },
  ArenaAlert: { hosts: [AlertHost], consumer: ['Heads up', 'Body'] },
  ArenaTag: { hosts: [TagHost], consumer: ['Beta'] },
  ArenaSkeleton: { hosts: [SkeletonHost], consumer: [] },
  ArenaSpinner: { hosts: [SpinnerHost], consumer: [] },
  ArenaSwitch: { hosts: [SwitchHost], consumer: ['Auto deploy'] },
  ArenaBulkActionBar: { hosts: [BulkHost], consumer: ['Archive'] },
  ArenaCommandPalette: { hosts: [PaletteHost], consumer: ['Deploy', 'zzz'] },
  ArenaOnboarding: { hosts: [OnboardingHost], consumer: ['One', 'Two', 'Three'] },
  ArenaConfirmDialog: { hosts: [ConfirmHost], consumer: ['Delete project', 'atlas', 'Gone for good'] },
  ArenaErrorState: { hosts: [ErrorStateHost], consumer: ['The server did not answer'] },
  ArenaAvatar: { hosts: [AvatarHost], consumer: ['Ada Lovelace', 'AL'] },
  ArenaLineChart: { hosts: [LineHost], consumer: ['Latency', 'Mon', 'Tue', 'p95'] },
  ArenaBarChart: { hosts: [BarHost], consumer: ['Builds', 'Mon', 'Tue', 'ok'] },
  ArenaHorizontalBarChart: { hosts: [HorizontalBarHost], consumer: ['Builds', 'Mon', 'Tue', 'ok'] },
  ArenaPyramidChart: { hosts: [PyramidHost], consumer: ['Ages', 'Women', 'Men'] },
  ArenaDoughnutChart: { hosts: [DoughnutHost], consumer: ['Share', 'share', 'A', 'B'] },
  ArenaRadarChart: { hosts: [RadarHost], consumer: ['Skills', 'Go', 'TS', 'SQL', 'Ada'] },
  ArenaScatterChart: { hosts: [ScatterHost], consumer: ['Load', 'Requests', 'Latency', 'Staging'] },
};

const DRAWS_MEMBERS = 'every string it renders is a member, a slot or a datum the consumer supplies';
const DRAWN_BY_A_CASE = 'its only word is drawn inside ArenaCalendar\'s case';
const DRAWN_BY_TOAST = 'the words it shows are ArenaToast\'s, which has its own case';

const NO_WORDS: Record<string, string> = {
  ArenaCalendarEvent: DRAWN_BY_A_CASE,
  ArenaActivityFeed: DRAWS_MEMBERS,
  ArenaAppBar: DRAWS_MEMBERS,
  ArenaAppLogo: DRAWS_MEMBERS,
  ArenaBadge: DRAWS_MEMBERS,
  ArenaBoard: DRAWS_MEMBERS,
  ArenaBoardColumn: DRAWS_MEMBERS,
  ArenaBottomNav: DRAWS_MEMBERS,
  ArenaBottomNavItem: DRAWS_MEMBERS,
  ArenaBreadcrumbs: DRAWS_MEMBERS,
  ArenaButton: DRAWS_MEMBERS,
  ArenaCard: DRAWS_MEMBERS,
  ArenaChartCard: DRAWS_MEMBERS,
  ArenaCheckbox: DRAWS_MEMBERS,
  ArenaDialog: DRAWS_MEMBERS,
  ArenaEmptyState: DRAWS_MEMBERS,
  ArenaFigure: DRAWS_MEMBERS,
  ArenaGrid: DRAWS_MEMBERS,
  ArenaHero: DRAWS_MEMBERS,
  ArenaIconButton: DRAWS_MEMBERS,
  ArenaInput: DRAWS_MEMBERS,
  ArenaKeyValue: DRAWS_MEMBERS,
  ArenaMain: DRAWS_MEMBERS,
  ArenaMenu: DRAWS_MEMBERS,
  ArenaPageHead: DRAWS_MEMBERS,
  ArenaPeopleList: DRAWS_MEMBERS,
  ArenaPersonRow: DRAWS_MEMBERS,
  ArenaProgressBar: DRAWS_MEMBERS,
  ArenaRadio: DRAWS_MEMBERS,
  ArenaRadioGroup: DRAWS_MEMBERS,
  ArenaScroller: DRAWS_MEMBERS,
  ArenaScrollerItem: DRAWS_MEMBERS,
  ArenaSection: DRAWS_MEMBERS,
  ArenaSegmentedControl: DRAWS_MEMBERS,
  ArenaSelect: DRAWS_MEMBERS,
  ArenaSideNav: DRAWS_MEMBERS,
  ArenaSideNavCollapsible: DRAWS_MEMBERS,
  ArenaSideNavItem: DRAWS_MEMBERS,
  ArenaSideNavSection: DRAWS_MEMBERS,
  ArenaSiteFooter: DRAWS_MEMBERS,
  ArenaSkipLink: DRAWS_MEMBERS,
  ArenaStatCard: DRAWS_MEMBERS,
  ArenaTab: DRAWS_MEMBERS,
  ArenaTableCell: DRAWS_MEMBERS,
  ArenaTableRow: DRAWS_MEMBERS,
  ArenaTabs: DRAWS_MEMBERS,
  ArenaTextarea: DRAWS_MEMBERS,
  ArenaToastHost: DRAWN_BY_TOAST,
  ArenaTooltip: DRAWS_MEMBERS,
  ArenaUnauthCard: DRAWS_MEMBERS,
};

const declared: string[] = Object.values(JSON.parse(readFileSync(join(REPO, 'frameworks/Components.json'), 'utf8')) as Record<string, string[]>).flat();

test('the roster is Components.json: every component is a case or says why it draws no word', () => {
  const classified = new Set([...Object.keys(CASES), ...Object.keys(NO_WORDS)]);
  assert.deepEqual(declared.filter((name) => !classified.has(name)), [], 'unclassified: add a CASE or a NO_WORDS reason');
  assert.deepEqual([...classified].filter((name) => !declared.includes(name)), [], 'stale: Components.json no longer declares it');
  assert.deepEqual(Object.keys(CASES).filter((name) => name in NO_WORDS), [], 'a component is a case or a reason, never both');
});

async function wordsOf(host: Type<unknown>, name: string, allowed: string[]): Promise<string[]> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideArenaLocale(sentinelLocale())] });
  const fixture = TestBed.createComponent(host);
  try {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    if (name === 'ArenaCommandPalette') {
      const input = root.querySelector('input');
      if (input) { input.value = 'zzz'; input.dispatchEvent(new Event('input', { bubbles: true })); }
      fixture.detectChanges();
    }
    return strayWords(root, allowed);
  } finally {
    fixture.destroy();
    TestBed.resetTestingModule();
  }
}

for (const [name, one] of Object.entries(CASES)) {
  test(`${name} draws no word the locale does not answer`, async () => {
    const allowed = [...one.consumer, ...(one.accept?.() ?? [])];
    const restore = one.narrow ? stubResize(320) : () => {};
    if (one.narrow) document.documentElement.style.setProperty('--bp-md', '768px');
    const found: string[] = [];
    try {
      for (const host of one.hosts) found.push(...(await wordsOf(host, name, allowed)));
    } finally {
      restore();
      if (one.narrow) document.documentElement.style.removeProperty('--bp-md');
    }
    assert.deepEqual(found, [], `${name} still draws: ${found.join(' | ')}`);
  });
}
