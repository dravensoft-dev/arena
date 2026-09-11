/* Every word Arena draws is answered through the locale. Each case renders a component under a
 * locale whose every field reads ⟦field⟧, and fails on a text node or an aria-label,
 * aria-roledescription or title that still carries a word once the sentinels, the case's own
 * consumer strings and the dates it accepts are taken out. The roster is Components.json: a
 * component is a CASE, or NO_WORDS says why it draws no word of its own, so the next component
 * fails here until somebody classifies it, and a name left behind fails as stale. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { mount, cleanup, act } from './Harness.tsx';
import { ARENA_DEFAULT_LOCALE, ArenaLocaleProvider } from '../ArenaLocale.ts';
import { arenaPhraseParts } from '../Phrase.ts';
import type { ArenaLocale } from '../Api.generated';
import { ARENA_DATE_OPTIONS, arenaAddDays, arenaFormatDate, arenaRangeTitle } from '../components/display/arena-calendar/CalendarInternals.ts';
import { ArenaCalendar } from '../components/display/arena-calendar/ArenaCalendar.tsx';
import { ArenaCalendarEvent } from '../components/display/arena-calendar-event/ArenaCalendarEvent.tsx';
import { ArenaPagination } from '../components/navigation/arena-pagination/ArenaPagination.tsx';
import { ArenaTable } from '../components/display/arena-table/ArenaTable.tsx';
import { ArenaTableRow } from '../components/display/arena-table-row/ArenaTableRow.tsx';
import { ArenaTableCell } from '../components/display/arena-table-cell/ArenaTableCell.tsx';
import { ArenaToast } from '../components/feedback/arena-toast/ArenaToast.tsx';
import { ArenaSheet } from '../components/feedback/arena-sheet/ArenaSheet.tsx';
import { ArenaAlert } from '../components/feedback/arena-alert/ArenaAlert.tsx';
import { ArenaTag } from '../components/display/arena-tag/ArenaTag.tsx';
import { ArenaSkeleton } from '../components/display/arena-skeleton/ArenaSkeleton.tsx';
import { ArenaSpinner } from '../components/feedback/arena-spinner/ArenaSpinner.tsx';
import { ArenaSwitch } from '../components/forms/arena-switch/ArenaSwitch.tsx';
import { ArenaBulkActionBar } from '../components/navigation/arena-bulk-action-bar/ArenaBulkActionBar.tsx';
import { ArenaCommandPalette } from '../components/navigation/arena-command-palette/ArenaCommandPalette.tsx';
import { ArenaOnboarding } from '../components/feedback/arena-onboarding/ArenaOnboarding.tsx';
import { ArenaConfirmDialog } from '../components/feedback/arena-confirm-dialog/ArenaConfirmDialog.tsx';
import { ArenaErrorState } from '../components/feedback/arena-error-state/ArenaErrorState.tsx';
import { ArenaAvatar } from '../components/display/arena-avatar/ArenaAvatar.tsx';
import { ArenaLineChart } from '../components/charts/arena-line-chart/ArenaLineChart.tsx';
import { ArenaBarChart } from '../components/charts/arena-bar-chart/ArenaBarChart.tsx';
import { ArenaHorizontalBarChart } from '../components/charts/arena-horizontal-bar-chart/ArenaHorizontalBarChart.tsx';
import { ArenaPyramidChart } from '../components/charts/arena-pyramid-chart/ArenaPyramidChart.tsx';
import { ArenaDoughnutChart } from '../components/charts/arena-doughnut-chart/ArenaDoughnutChart.tsx';
import { ArenaRadarChart } from '../components/charts/arena-radar-chart/ArenaRadarChart.tsx';
import { ArenaScatterChart } from '../components/charts/arena-scatter-chart/ArenaScatterChart.tsx';

afterEach(() => cleanup());

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

export function narrowWidths<T>(width: number, body: () => T): T {
  const saved = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class {
    callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) { this.callback = callback; }
    observe(target: Element) {
      this.callback([{ target, contentRect: { width } }] as unknown as ResizeObserverEntry[], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  try {
    return body();
  } finally {
    globalThis.ResizeObserver = saved;
  }
}

type Case = { renders: (() => React.ReactElement)[]; consumer: string[]; accept?: () => string[]; narrow?: boolean };

const WEEK = '2026-03-16';

const CASES: Record<string, Case> = {
  ArenaCalendar: {
    renders: [() => (
      <ArenaCalendar anchorDate={WEEK} view="week" timeZone="Europe/Madrid" dayStart="08:00" dayEnd="12:00">
        <ArenaCalendarEvent id="standup" title="Standup" start="2026-03-16T09:00" end="2026-03-16T10:00" actionsEnabled interactive />
      </ArenaCalendar>
    )],
    consumer: ['Standup'],
    accept: () => {
      const days = Array.from({ length: 7 }, (_, i) => arenaAddDays(WEEK, i));
      return [arenaRangeTitle(days, 'es-ES'), ...days.flatMap((day) => Object.values(ARENA_DATE_OPTIONS).map((opts) => arenaFormatDate(day, 'es-ES', opts)))];
    },
  },
  ArenaPagination: { renders: [() => <ArenaPagination page={2} pageCount={5} ariaLabel="Deployments" />], consumer: ['Deployments'] },
  ArenaTable: {
    renders: [
      () => <ArenaTable label="Projects" columns={[{ header: 'Name', sortable: true }]} />,
      () => (
        <ArenaTable label="Projects" columns={[{ header: 'Name', sortable: true }]} sort={{ column: 0, direction: 'asc' }}>
          <ArenaTableRow><ArenaTableCell>Atlas</ArenaTableCell></ArenaTableRow>
        </ArenaTable>
      ),
    ],
    consumer: ['Projects', 'Name', 'Atlas'],
    narrow: true,
  },
  ArenaToast: { renders: [() => <ArenaToast title="Saved" message="Draft stored" persist dismissible />], consumer: ['Saved', 'Draft stored'] },
  ArenaSheet: { renders: [() => <ArenaSheet open title="Filters" dismissible>Body</ArenaSheet>], consumer: ['Filters', 'Body'] },
  ArenaAlert: { renders: [() => <ArenaAlert tone="info" title="Heads up" dismissible>Body</ArenaAlert>], consumer: ['Heads up', 'Body'] },
  ArenaTag: { renders: [() => <ArenaTag removable>Beta</ArenaTag>], consumer: ['Beta'] },
  ArenaSkeleton: { renders: [() => <ArenaSkeleton />, () => <ArenaSkeleton variant="text" lines={2} />], consumer: [] },
  ArenaSpinner: { renders: [() => <ArenaSpinner />], consumer: [] },
  ArenaSwitch: { renders: [() => <ArenaSwitch label="Auto deploy" confirm />], consumer: ['Auto deploy'] },
  ArenaBulkActionBar: { renders: [() => <ArenaBulkActionBar count={3} actions={[{ id: 'archive', label: 'Archive' }]} />], consumer: ['Archive'] },
  ArenaCommandPalette: { renders: [() => <ArenaCommandPalette open commands={[{ id: 'deploy', label: 'Deploy' }]} />], consumer: ['Deploy', 'zzz'] },
  ArenaOnboarding: {
    renders: [
      () => <ArenaOnboarding open index={1} steps={[{ body: 'One' }, { body: 'Two' }, { body: 'Three' }]} />,
      () => <ArenaOnboarding open index={2} steps={[{ body: 'One' }, { body: 'Two' }, { body: 'Three' }]} />,
    ],
    consumer: ['One', 'Two', 'Three'],
  },
  ArenaConfirmDialog: { renders: [() => <ArenaConfirmDialog open title="Delete project" requireText="atlas" destructive>Gone for good</ArenaConfirmDialog>], consumer: ['Delete project', 'atlas', 'Gone for good'] },
  ArenaErrorState: { renders: [() => <ArenaErrorState message="The server did not answer" />], consumer: ['The server did not answer'] },
  ArenaAvatar: { renders: (['online', 'busy', 'away', 'offline'] as const).map((status) => () => <ArenaAvatar name="Ada Lovelace" status={status} />), consumer: ['Ada Lovelace', 'AL'] },
  ArenaLineChart: { renders: [() => <ArenaLineChart label="Latency" labels={['Mon', 'Tue']} series={[{ label: 'p95', values: [1, 2] }]} />], consumer: ['Latency', 'Mon', 'Tue', 'p95'] },
  ArenaBarChart: { renders: [() => <ArenaBarChart label="Builds" labels={['Mon', 'Tue']} series={[{ label: 'ok', values: [1, 2] }]} />], consumer: ['Builds', 'Mon', 'Tue', 'ok'] },
  ArenaHorizontalBarChart: { renders: [() => <ArenaHorizontalBarChart label="Builds" labels={['Mon', 'Tue']} series={[{ label: 'ok', values: [1, 2] }]} />], consumer: ['Builds', 'Mon', 'Tue', 'ok'] },
  ArenaPyramidChart: { renders: [() => <ArenaPyramidChart label="Ages" labels={['0-17', '18+']} series={[{ label: 'Women', values: [1, 2] }, { label: 'Men', values: [2, 1] }]} />], consumer: ['Ages', 'Women', 'Men'] },
  ArenaDoughnutChart: {
    renders: [
      () => <ArenaDoughnutChart label="Share" labels={['A', 'B']} series={[{ label: 'share', values: [1, 2] }]} />,
      () => <ArenaDoughnutChart label="Share" shape="pie" labels={['A', 'B']} series={[{ label: 'share', values: [1, 2] }]} />,
    ],
    consumer: ['Share', 'share', 'A', 'B'],
  },
  ArenaRadarChart: { renders: [() => <ArenaRadarChart label="Skills" labels={['Go', 'TS', 'SQL']} series={[{ label: 'Ada', values: [1, 2, 3] }]} />], consumer: ['Skills', 'Go', 'TS', 'SQL', 'Ada'] },
  ArenaScatterChart: { renders: [() => <ArenaScatterChart label="Load" xLabel="Requests" yLabel="Latency" series={[{ label: 'Staging', x: [1, 2], y: [3, 4] }]} />], consumer: ['Load', 'Requests', 'Latency', 'Staging'] },
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

const declared: string[] = Object.values(JSON.parse(readFileSync(new URL('../../Components.json', import.meta.url), 'utf8')) as Record<string, string[]>).flat();

test('the roster is Components.json: every component is a case or says why it draws no word', () => {
  const classified = new Set([...Object.keys(CASES), ...Object.keys(NO_WORDS)]);
  assert.deepEqual(declared.filter((name) => !classified.has(name)), [], 'unclassified: add a CASE or a NO_WORDS reason');
  assert.deepEqual([...classified].filter((name) => !declared.includes(name)), [], 'stale: Components.json no longer declares it');
  assert.deepEqual(Object.keys(CASES).filter((name) => name in NO_WORDS), [], 'a component is a case or a reason, never both');
});

for (const [name, one] of Object.entries(CASES)) {
  test(`${name} draws no word the locale does not answer`, () => {
    const locale = sentinelLocale();
    const run = () => one.renders.flatMap((render) => {
      const host = mount(<ArenaLocaleProvider value={locale}>{render()}</ArenaLocaleProvider>);
      if (name === 'ArenaCommandPalette') {
        const input = host.ownerDocument.querySelector('input');
        act(() => {
          if (!input) return;
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, 'zzz');
          input.dispatchEvent(new Event('input', { bubbles: true }));
        });
      }
      const found = strayWords(host.ownerDocument.body, [...one.consumer, ...(one.accept?.() ?? [])]);
      cleanup();
      return found;
    });
    const found = one.narrow ? narrowWidths(320, run) : run();
    assert.deepEqual(found, [], `${name} still draws: ${found.join(' | ')}`);
  });
}
