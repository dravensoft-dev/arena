import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaCalendar } from './ArenaCalendar.tsx';
import { ArenaCalendarEvent } from '../arena-calendar-event/ArenaCalendarEvent.tsx';
import { ARENA_DATE_OPTIONS, arenaFormatDate, arenaRangeTitle, arenaShowsTime, arenaStacksActions } from './CalendarInternals.ts';

const EVENTS: React.ComponentProps<typeof ArenaCalendarEvent>[] = [
  { id: 'a', title: 'Standup', start: '2026-07-20T09:00:00Z', end: '2026-07-20T09:30:00Z', colorId: 1 },
  { id: 'b', title: 'Review', start: '2026-07-21T14:00:00Z', end: '2026-07-21T15:00:00Z', colorId: 2 },
];

const chips = (eventExtra: Partial<React.ComponentProps<typeof ArenaCalendarEvent>> = {}) => EVENTS.map((e) => <ArenaCalendarEvent key={e.id} {...e} {...eventExtra} />);
const render = (calendarExtra: Record<string, unknown> = {},
  eventExtra: Partial<React.ComponentProps<typeof ArenaCalendarEvent>> = {}) => renderToStaticMarkup(
  <ArenaCalendar timeZone="UTC" anchorDate="2026-07-20" view="week" {...calendarExtra}>{chips(eventExtra)}</ArenaCalendar>,
);

test('the chip body is Arena own, and a consumer renderer reaches nothing', () => {
  const html = render({ renderEvent: (e: { title: string }) => <em>{e.title.toUpperCase()}</em> });
  assert.match(html, /Standup/, 'the default chip body did not render');
  assert.doesNotMatch(html, /<em>/, 'a consumer renderer still reaches the chip -- renderEvent is not gone');
  assert.doesNotMatch(html, /STANDUP/, 'the consumer renderer ran');
});

test('an ArenaCalendar with no children renders an empty schedule rather than throwing', () => {
  const html = renderToStaticMarkup(<ArenaCalendar timeZone="UTC" anchorDate="2026-07-20" view="week" />);
  assert.match(html, /role="grid"/, 'an eventless ArenaCalendar drew no grid at all');
  assert.match(html, /role="gridcell"/, 'an eventless ArenaCalendar drew no hour cells');
  assert.doesNotMatch(html, /Standup/, 'the fixture leaked an event into an ArenaCalendar with no children');
});

test('an ArenaCalendarEvent missing a required member throws', () => {
  const full = { id: 'a', title: 'Standup', start: '2026-07-20T09:00:00Z', end: '2026-07-20T09:30:00Z' };
  for (const missing of ['id', 'title', 'start', 'end']) {
    const props = { ...full, [missing]: undefined };
    assert.throws(
      () => renderToStaticMarkup(<ArenaCalendarEvent {...props} />),
      new RegExp(`ArenaCalendarEvent: \\\`${missing}\\\` is required`),
      `an ArenaCalendarEvent with no ${missing} rendered instead of failing hard`,
    );
  }
});

test('an omitted timeZone resolves to the reader own zone, exactly', () => {
  const Real = Intl.DateTimeFormat;
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  Intl.DateTimeFormat = function (...args) {
    const inst = new Real(...args);
    if (args.length === 0) {
      return { resolvedOptions: () => ({ ...inst.resolvedOptions(), timeZone: 'Asia/Tokyo' }) };
    }
    return inst;
  };
  try {
    const implicit = renderToStaticMarkup(
      <ArenaCalendar anchorDate="2026-07-20" view="week">{chips()}</ArenaCalendar>,
    );
    const explicit = renderToStaticMarkup(
      <ArenaCalendar timeZone="Asia/Tokyo" anchorDate="2026-07-20" view="week">{chips()}</ArenaCalendar>,
    );
    assert.equal(implicit, explicit, 'the default is not the reader resolved zone');
    assert.match(implicit, /18:00/, 'the default did not shift the 09:00Z event into the stubbed zone');
  } finally {
    Intl.DateTimeFormat = Real;
  }
});

test('an explicit timeZone still decides the wall clock', () => {
  const utc = renderToStaticMarkup(
    <ArenaCalendar timeZone="UTC" anchorDate="2026-07-20" view="week">{chips()}</ArenaCalendar>,
  );
  const tokyo = renderToStaticMarkup(
    <ArenaCalendar timeZone="Asia/Tokyo" anchorDate="2026-07-20" view="week">{chips()}</ArenaCalendar>,
  );
  assert.match(utc, /09:00/, 'the UTC render does not start at the event hour');
  assert.match(tokyo, /18:00/, 'the Tokyo render did not shift the event by nine hours');
  assert.doesNotMatch(tokyo, /09:00/, 'the Tokyo render still shows the UTC hour -- timeZone was ignored');
});

test('ArenaCalendar drops a consumer style object -- the ...style escape is gone', () => {
  const html = render({ style: { color: '#ff00ff' } });
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
});

test('ArenaCalendar drops a consumer attribute -- no {...rest} spread reaches the root', () => {
  const html = render({ 'data-stray': 'x' });
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root -- a {...rest} escape is back');
});

test('ArenaCalendarEvent drops a consumer style object -- no ...style escape on the chip', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  const html = render({}, { style: { color: '#ff00ff' } });
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the chip -- an R4 escape opened');
});

test('ArenaCalendarEvent drops a consumer attribute -- no {...rest} spread on the chip', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  const html = render({}, { 'data-stray': 'x' });
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the chip -- a {...rest} escape opened');
});

test('an event colours its chip from colorId, not from the old slot field', () => {
  const html = render({});
  const two = 'var(--color-cat-2)';
  assert.ok(html.includes(two), 'the second event did not take its ramp colour from colorId');
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  const staleChip = <ArenaCalendarEvent id="c" title="Stale" start="2026-07-20T09:00:00Z" end="2026-07-20T10:00:00Z" slot={2} />;
  const stale = renderToStaticMarkup(
    <ArenaCalendar timeZone="UTC" anchorDate="2026-07-20" view="week">{staleChip}</ArenaCalendar>,
  );
  assert.ok(!stale.includes(two), 'the old `slot` field still picks a ramp colour -- the rename did not land');
});

test('the day affordance follows dayInteractive and never the listener -- R6', () => {
  const dayLabel = arenaFormatDate('2026-07-20', 'en-GB', ARENA_DATE_OPTIONS.dayName);
  const head = new RegExp(`<button[^>]*aria-label="${dayLabel}"`);
  const column = /role="row"[^>]*arena-calendar__column--day-interactive-true/;

  const bound = render({ onDateClick: () => {} });
  assert.doesNotMatch(bound, column, 'binding the listener alone painted a pointer cursor over the day columns');
  assert.doesNotMatch(bound, head, 'binding the listener alone turned the day headers into buttons');

  const on = render({ dayInteractive: true });
  assert.match(on, column, 'dayInteractive did not reach the day column cursor');
  assert.match(on, head, 'dayInteractive did not make the day header a named button');

  const off = render({});
  assert.doesNotMatch(off, column, 'an inert day column still invites a click');
  assert.doesNotMatch(off, head, 'an inert day header is still a button');
});

test('an ArenaCalendar grid renders exactly one roving tab stop, kebab or no kebab', () => {
  const plain = renderToStaticMarkup(
    <ArenaCalendar timeZone="UTC" anchorDate="2026-07-20" view="week">
      <ArenaCalendarEvent id="a" title="Standup" start="2026-07-20T09:00:00Z" end="2026-07-20T09:30:00Z" />
    </ArenaCalendar>,
  );
  assert.equal((plain.match(/tabindex="0"/g) || []).length, 1, 'an ArenaCalendar is not one tab stop');

  const withKebab = renderToStaticMarkup(
    <ArenaCalendar timeZone="UTC" anchorDate="2026-07-20" view="week">
      <ArenaCalendarEvent id="a" title="Standup" start="2026-07-20T09:00:00Z" end="2026-07-20T09:30:00Z"
        actionsEnabled actions={<button type="button">Delete</button>} />
    </ArenaCalendar>,
  );
  assert.equal((withKebab.match(/tabindex="0"/g) || []).length, 1,
    'the kebab added a second tab stop inside the grid -- focus.roving is now false');
});

test('the kebab renders only when actionsEnabled, and never as a tab stop', () => {
  const off = renderToStaticMarkup(
    <ArenaCalendar timeZone="UTC" anchorDate="2026-07-20" view="week">
      <ArenaCalendarEvent id="a" title="Standup" start="2026-07-20T09:00:00Z" end="2026-07-20T09:30:00Z" />
    </ArenaCalendar>,
  );
  assert.doesNotMatch(off, /ph-dots-three/, 'a chip that did not ask for actions drew a kebab');

  const on = renderToStaticMarkup(
    <ArenaCalendar timeZone="UTC" anchorDate="2026-07-20" view="week">
      <ArenaCalendarEvent id="a" title="Standup" start="2026-07-20T09:00:00Z" end="2026-07-20T09:30:00Z"
        actionsEnabled actions={<button type="button">Delete</button>} />
    </ArenaCalendar>,
  );
  assert.match(on, /ph-dots-three/, 'actionsEnabled drew no kebab');
  assert.match(on, /aria-label="Actions"[^>]*tabindex="-1"|tabindex="-1"[^>]*aria-label="Actions"/,
    'the kebab is not out of the Tab sequence');
});

test('the action panel content is absent while the panel is closed', () => {
  const html = renderToStaticMarkup(
    <ArenaCalendar timeZone="UTC" anchorDate="2026-07-20" view="week">
      <ArenaCalendarEvent id="a" title="Standup" start="2026-07-20T09:00:00Z" end="2026-07-20T09:30:00Z"
        actionsEnabled actions={<button type="button">Delete</button>} />
    </ArenaCalendar>,
  );
  assert.doesNotMatch(html, /Delete/, 'the panel rendered its content while closed');
});

test('a chip carrying a kebab is not a button inside a button', () => {
  const html = renderToStaticMarkup(
    <ArenaCalendar timeZone="UTC" anchorDate="2026-07-20" view="week">
      <ArenaCalendarEvent id="a" title="Standup" start="2026-07-20T09:00:00Z" end="2026-07-20T09:30:00Z"
        interactive onClick={() => {}} actionsEnabled actions={<button type="button">Delete</button>} />
    </ArenaCalendar>,
  );
  assert.doesNotMatch(html, /<button[^>]*>(?:(?!<\/button>)[\s\S])*<button/,
    'a kebab was nested inside the chip button -- invalid HTML');
});

test('a paneled chip carries a focusable body for Enter to land on', () => {
  const html = renderToStaticMarkup(
    <ArenaCalendar timeZone="UTC" anchorDate="2026-07-20" view="week">
      <ArenaCalendarEvent id="a" title="Standup" start="2026-07-20T09:00:00Z" end="2026-07-20T09:30:00Z"
        interactive onClick={() => {}} actionsEnabled actions={<button type="button">Delete</button>} />
    </ArenaCalendar>,
  );

  assert.match(
    html,
    /<button[^>]*aria-label="Standup,[^"]*"[^>]*tabindex="-1"|<button[^>]*tabindex="-1"[^>]*aria-label="Standup,[^"]*"/,
    'a paneled chip has no focusable body -- Enter from the hour cell lands on nothing',
  );
});

test('ArenaCalendarEvent renders its panel content when the panel is open', () => {
  const html = renderToStaticMarkup(
    <ArenaCalendarEvent id="a" title="Standup" start="2026-07-20T09:00:00Z" end="2026-07-20T09:30:00Z"
      actionsEnabled actions={<button type="button">Delete</button>}
      box={{}} color="var(--color-cat-1)" timeLabel="09:00 – 09:30" dateLabel="Monday 20 July"
      defaultPanelOpen />,
  );
  assert.match(html, /Delete/, 'an open panel did not render its content');
});

test('the chip lifts its clip while the panel is open, and only then', () => {
  const chip = (extra: Record<string, unknown> = {}) => renderToStaticMarkup(
    <ArenaCalendarEvent id="a" title="Standup" start="2026-07-20T09:00:00Z" end="2026-07-20T09:30:00Z"
      actionsEnabled actions={<button type="button">Delete</button>}
      box={{}} color="var(--color-cat-1)" timeLabel="09:00 – 09:30" dateLabel="Monday 20 July"
      {...extra} />,
  );
  assert.match(chip({ defaultPanelOpen: true }), /\barena-calendar__chip--panel-open-true\b/,
    'the open panel is still clipped by the chip');
  assert.match(chip({}), /\b(?:arena-calendar__chip|arena-calendar__title)\b/,
    'a closed chip stopped clipping -- a long title no longer ellipsises');
  assert.match(chip({}), /\barena-calendar__title\b/,
    'the title span lost the ellipsis the chip clip was standing in for');
});

test('a chip is border-box, so the injected edges are its outer edges', () => {
  const html = render({});
  assert.match(html, /\barena-calendar__chip\b/,
    'the chip is still content-box -- its padding and border are added past the edges ArenaCalendar injected, and a full-width chip overruns its day column');
  assert.match(html, /left:0%;right:8[36]\.[0-9]+%/,
    'the chip is placed by width again, or its share stopped being of the whole grid: a chip is not '
    + 'a DOM child of its day, so its edges are percentages of every day track, not of one');
});

test('the chip height floor clears the title line once the height is an outer height', () => {
  const html = render({});
  assert.match(html, /height:max\(calc\(var\(--sp-1\) \* 6\.5\), \d+px\)/,
    'the height floor is still stated as a content height -- under border-box it leaves too little content box for the title line');
  assert.doesNotMatch(html, /calc\(var\(--sp-1\) \* 4\.5\)/,
    'the old content-box floor survived somewhere in the render');
});

test('a chip carrying a kebab reserves the width the kebab occupies', () => {
  const html = render({}, { actionsEnabled: true, actions: <b>act</b> });
  assert.match(html, /arena-calendar__chip--reserve-true/,
    'a panelled chip reserves nothing for its kebab, so the title is drawn underneath it');
});

test('a chip with no kebab reserves nothing, and keeps its ordinary right padding', () => {
  const html = render({});
  assert.doesNotMatch(html, /var\(--dz-ctl-h-sm\)/,
    'a chip with no kebab reserved a gutter for a button it never renders');
  assert.match(html, /\barena-calendar__chip\b/,
    'the unpanelled chip lost its ordinary lateral padding');
  assert.match(html, /\barena-calendar__chip\b/);
});

test('a day header cell has no bottom padding, and the scroller keeps its top padding', () => {
  const html = render({});
  assert.match(html, /\barena-calendar__day-head\b/,
    'the day header cell is drawn from its own slot, which is where its padding is decided');
  assert.match(html, /\barena-calendar__scroll\b/,
    'the scroll area is drawn from its own slot, which is where its top padding is decided');
});

test('a chip draws its time label only when it has room in both axes', () => {
  assert.equal(arenaShowsTime(66, 166), true, 'a tall chip in a full-width slot drew no time label');
  assert.equal(arenaShowsTime(22, 166), false, 'a 30-minute chip drew a time label it has no height for');
  assert.equal(arenaShowsTime(66, 83), false, 'a tall chip in a half-width slot drew a label that cannot fit on one line');
  assert.equal(arenaShowsTime(22, 83), false, 'a chip failing both terms drew a time label');
});

test('the thresholds are inclusive, so a chip exactly at one still draws', () => {
  assert.equal(arenaShowsTime(32, 100), true, 'a chip exactly at both thresholds was refused its time label');
  assert.equal(arenaShowsTime(31.9, 100), false, 'the height threshold is not being applied');
  assert.equal(arenaShowsTime(32, 99.9), false, 'the width threshold is not being applied');
});

test('an unmeasured container satisfies the width term, so the static render is unchanged', () => {
  assert.equal(arenaShowsTime(66, null), true, 'a server render lost its time label');
  assert.equal(arenaShowsTime(22, null), false, 'the height term stopped applying when the width is unknown');
});

test('the static render still draws its time labels, because nothing has measured yet', () => {
  const html = render({});
  assert.match(html, /14:00 – 15:00/,
    'the server render lost a time label -- the width term is being applied before anything measured');
});

test('a chip stacks its kebab below only when it is narrow and tall enough', () => {
  assert.equal(arenaStacksActions(66, 83), true, 'a tall chip in a half-width slot did not stack its kebab');
  assert.equal(arenaStacksActions(44, 83), false, 'a 60-minute chip stacked a kebab that would overlap its title');
  assert.equal(arenaStacksActions(66, 166), false, 'a full-width chip stacked its kebab, which it has room not to');
  assert.equal(arenaStacksActions(26, 83), false, 'the shortest chip stacked its kebab');
});

test('the stacking threshold is inclusive, and an unmeasured container never stacks', () => {
  assert.equal(arenaStacksActions(56, 83), true, 'a chip exactly at the threshold was refused');
  assert.equal(arenaStacksActions(55.9, 83), false, 'the height threshold is not being applied');
  assert.equal(arenaStacksActions(66, null), false, 'a server render stacked, so the static markup would move');
});

test('a stacked chip anchors its kebab to the bottom and reserves no lateral band', () => {
  const stacked = renderToStaticMarkup(
    <ArenaCalendarEvent id="a" title="Client review — Northwind" start="2026-07-20T10:00:00Z" end="2026-07-20T11:30:00Z"
      actionsEnabled actions={<button type="button">Delete</button>} actionsBelow
      box={{}} color="var(--color-cat-1)" timeLabel="10:00 – 11:30" dateLabel="Monday 20 July" />,
  );
  assert.match(stacked, /\barena-calendar__kebab-wrap--actions-below-true\b/,
    'the kebab is not anchored to the chip bottom');
  assert.doesNotMatch(stacked, /pr-\[calc\(var\(--dz-ctl-h-sm\)/,
    'a stacked chip still reserves the lateral band, so the title gains nothing');
});

test('an unstacked chip keeps the top-right kebab and its reserve', () => {
  const plain = renderToStaticMarkup(
    <ArenaCalendarEvent id="a" title="Release window" start="2026-07-20T15:00:00Z" end="2026-07-20T16:30:00Z"
      actionsEnabled actions={<button type="button">Delete</button>}
      box={{}} color="var(--color-cat-1)" timeLabel="15:00 – 16:30" dateLabel="Monday 20 July" />,
  );
  assert.doesNotMatch(plain, /\barena-calendar__kebab-wrap--actions-below-true\b/, 'the kebab left its conventional corner');
  assert.match(plain, /arena-calendar__chip--reserve-true/,
    'the unstacked chip lost the reserve that keeps its title clear of the kebab');
});

test('arenaFormatDate formats in the locale it is given, and caches per locale', () => {
  assert.equal(arenaFormatDate('2026-03-16', 'en-GB', ARENA_DATE_OPTIONS.dayName), 'Monday 16 March');
  assert.equal(arenaFormatDate('2026-03-16', 'es-ES', ARENA_DATE_OPTIONS.dayName), 'lunes, 16 de marzo');
  assert.equal(arenaFormatDate('2026-03-16', 'en-GB', ARENA_DATE_OPTIONS.dayName), 'Monday 16 March');
});

test('arenaRangeTitle follows the locale and keeps its en dash', () => {
  const days = ['2026-03-16', '2026-03-17', '2026-03-18', '2026-03-19', '2026-03-20'];
  assert.equal(arenaRangeTitle(days, 'en-GB'), '16 \u2013 20 Mar 2026');
  assert.equal(arenaRangeTitle(days, 'es-ES'), '16 \u2013 20 mar 2026');
});
