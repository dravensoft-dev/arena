Week or day schedule on a time grid: a toolbar, one column per day, events positioned by their wall-clock span. Use it for an agenda someone reads against the clock: bookings, classes, shifts. It is not a date picker (use `ArenaInput type="date"`) and not a month planner (Arena ships no month grid).

**The events are its children.** Write one `<ArenaCalendarEvent>` per event; `ArenaCalendar` reads each one's `start`, `end` and `colorId`, works out where the chip goes and injects that back into the element. There is no `events` array, and no throw for omitting one: an `ArenaCalendar` with no children is a legitimately empty schedule, a week with nothing booked in it, rather than a caller's mistake.

`timeZone` is optional and defaults to the reader's own resolved zone, which is right whenever the schedule belongs to whoever is looking at it. **Pass it when the calendar has a zone of its own**: a class at 09:00 in Madrid must stay at 09:00 for a student loading the page from Lima, and only an explicit `timeZone="Europe/Madrid"` says so. Events carry ISO datetimes and are read in that zone.

Two things this default is not. It is not a `'UTC'` fallback, which would be arbitrary, wrong for almost every reader, and would produce silently the very defect the member exists to prevent. And it is **not safe under server rendering**: on a server it resolves to the *server's* zone and then to the client's on hydration, so a server-rendered calendar must pass `timeZone` explicitly. Same shape as `useArenaContainerWidth` reporting `null` before it has measured.

`ArenaCalendar` reads the categorical ramp through the same `arenaCatColor` the charts use, and measures its container to pick the view, so both travel with it: importing from `@dravensoft/arena-react` brings them, and both are exported for a legend or a responsive panel of your own.

```tsx
<ArenaCalendar
  timeZone="Europe/Madrid"
  onRangeChange={(iso) => refetch(iso)}
  actions={<ArenaButton size="sm" variant="secondary">New class</ArenaButton>}
>
  {classes.map((c) => (
    <ArenaCalendarEvent key={c.id} id={c.id} title={c.name} start={c.start} end={c.end}
      colorId={c.room} onClick={() => open(c)} />
  ))}
</ArenaCalendar>
```

<!-- @api GENERATED from contracts/api/components/ArenaCalendar.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `children` | slot |  |  | One ArenaCalendarEvent per event. ArenaCalendar reads each one's start, end and colorId and settles where the chip goes, what colour it takes and how the keyboard reaches it; the chip itself is ArenaCalendarEvent's. |
| `timeZone` | primitive | `string` |  | IANA zone name. Defaults to the reader's own resolved zone, which is right whenever the schedule belongs to the person looking at it. Pass it when the calendar has a zone of its own that differs (a Madrid timetable read from Tokyo), and when server-rendering, where the reader's zone is not knowable. |
| `anchorDate` | primitive | `string` |  | ISO date the view opens on. Defaults to today in `timeZone`; pass and change it to drive the date yourself. |
| `view` | enum | `ArenaCalendarView` |  | Omit to derive from the CONTAINER width: day below --bp-md, else week. |
| `dayStart` | primitive | `string` |  | HH:MM the grid starts at. Defaults to the earliest visible event's hour, floored. |
| `dayEnd` | primitive | `string` | `"23:00"` | HH:MM the grid ends at. |
| `weekStartsOn` | primitive | `number` | `1` | 0 = Sunday … 6 = Saturday. |
| `hideEmptyWeekend` | primitive | `boolean` | `true` | Drop Sunday from the week unless an event falls on it. |
| `dayInteractive` | primitive | `boolean` | `false` | Whether a day can be activated. A boolean rather than "is `dateClick` bound?", because Arena never derives what it draws from what a consumer listens for, and the same member `ArenaTableRow.interactive` and `ArenaCalendarEvent.interactive` are for the same reason; here the derived render was the day's own cursor, and the layers diverged on screen because of it. With it on, the day header is a <button> (the keyboard's route to the date, and the one element that already names it), and the column background takes a pointer cursor; with it off both are inert and the cursor says so. The default is false because a schedule someone only reads is the ordinary calendar, and a pointer cursor over days that answer nothing is the defect this member exists to end. |
| `onDateClick` | event | `string` |  | A day header or column background was activated; carries the ISO date. Never emitted unless `dayInteractive`. |
| `onRangeChange` | event | `string` |  | The anchor moved via prev/Today/next; carries the new ISO date. A date rather than a delta, because Today is not a delta. |
| `actions` | slot |  |  | Right-aligned in the toolbar, beside the range title. |

<!-- @api end -->

The anchor is internal, so prev/Today/next work with nothing wired. `onRangeChange` reports the new anchor date; take it as the cue to refetch. Pass `anchorDate` only when you want to drive the date yourself; it wins whenever it changes.

**The range in the toolbar is a label, not a heading.** It says which dates are on screen and is
rewritten every time the reader steps a week, so a document outline built on it would carry
"13 – 15 Jul 2026" where the name of a region belongs. The region is named already: the grid takes
an `aria-label` composed from the same range, which is what a reader arriving by name lands on.
The heading that says what this calendar IS belongs outside it, on the `ArenaSection` or the page
head that holds it.

**Keyboard.** The grid is one tab stop, not one per event (`dayInteractive` adds the header strip's, above it). Tab lands on a single hour cell; a *row is a day*, so Left/Right move a day and Up/Down move an hour, Home/End jump to the first/last hour of the focused day, and focus clamps at every edge. Enter steps into the first event overlapping the focused hour, Escape steps back out to the cell.

**A day is activable only if you say so.** `onDateClick` reports the ISO date of the day a reader picked, and it fires for nothing unless `dayInteractive` is also set. The boolean is not ceremony: what a component draws may never be derived from whether a listener is bound, because at least one platform cannot ask that question, so the day's cursor, which is a render, follows the boolean and not your handler. Bind one without the other and you get exactly half of what you asked for, in every layer alike.

```tsx
<ArenaCalendar dayInteractive onDateClick={(iso) => openDay(iso)}>
```

**With it on, the day headers become their own tab stops, and that is the point.** Each header is a `<button>` carrying the full date as its label, so a keyboard reaches a day at the one element that already names it. The column background takes the same click but stays pointer-only, because it is the same date, reachable above. The grid below is still a single roving tab stop, and the header strip is separate.

**The chip body is Arena's, and there is nothing you can put inside it.** A `ArenaCalendarEvent` carries `id`, `title`, `start`, `end` and `colorId`, and Arena draws all of it: the title, the time range and the identity colour. There is no per-event renderer, because a function returning markup is not a member of any Arena contract, because per-item projection has no answer on every layer Arena targets. Writing `<ArenaCalendarEvent>` as an element does not change that: it is the element Arena draws, not a wrapper around markup of yours.

**Activation lives on the event, and it is declared.** There is no `onEventClick` on `ArenaCalendar`; each `ArenaCalendarEvent` takes its own `onClick` and its own `interactive`. The handler carries no payload and needs none: you wrote the element, so it already closes over whatever the event is in your data, with no id-to-object lookup in between. **Pass `interactive` alongside `onClick` or the chip is inert**: a read-only schedule leaves it off and announces events rather than a screenful of buttons that do nothing.

**So a consumer cannot mark an event cancelled or tentative at all.** Colour is spoken for by identity, and the non-chromatic channel a strikethrough or a dashed border would have used is no longer reachable. What is left: say it in the `title` (`'Ballet I, cancelled'`), which is text Arena draws and a screen reader announces; or do not render an `ArenaCalendarEvent` for it at all and show it somewhere that is not the schedule. Neither is a styling hook, and that is deliberate rather than pending.

**Do**
- Give an entity a stable `colorId` and reuse it everywhere that entity appears, which is what makes the ramp identity rather than decoration.
- Let `dayStart` default. It follows the earliest event, so a schedule that begins at 16:00 does not open on eight empty morning rows.
- Set `weekStartsOn` and `hideEmptyWeekend` to your locale and product. The defaults (Monday, Sunday hidden until used) are defaults, not the system's opinion.
- Preformat every `title` you pass. The calendar does no locale and no truncation of your own text beyond the chip's ellipsis.

**Don't**
- Don't try to paint an event `--danger` to mean cancelled. You cannot: `colorId` picks a ramp slot and nothing else, and the reason it is closed is that identity and meaning in one palette makes both unreadable. Same rule the charts enforce.
- Don't reach past `colorId: 8`. There are eight slots and they never cycle; a ninth entity wrapping to slot 1 claims two different things are the same thing. Group the tail instead.
- Don't feed it multi-day or all-day events. There is no all-day row: an event running past midnight is clamped to the end of the day it started on.
- Don't reach for `style` to place it. It takes none; wrap it in a `<div>` that owns the margin and the width.
- Don't put anything but `ArenaCalendarEvent`s in it. Children are the event list, not a content area, and anything else is skipped by the placement pipeline and never renders.
- Don't wrap it to add a month view or a mini datepicker and call it Arena. Arena ships no month grid, and the date control is the native one, `type="date"` on `ArenaInput`; a hand-rolled one in your product is exactly the `fullcalendar-overrides.css` story that put this component here.

**Two accepted limits, both measured rather than argued.**

`arenaShowsTime()` compares a chip's column share against **one** threshold and never asks whether the
chip has a kebab. A chip without actions has a content box of its share less 18px; one with them
has its share less 46px, because the kebab's 34px reserve comes out too. So the kebab-safe
threshold is 124.02px where the plain one is 96.02px, and `--calendar-time-min-w` is set at the
plain one. **In a band of roughly a 768px to an 800px container, in week view, a chip that has
actions can still wrap its time label onto two lines**, measured on `ArenaCalendar.demo.generated.html` by
driving the viewport and reading the container beneath it, which is the viewport less the card's
24px body padding a side, and `--bp-md` is compared against the *container*. At an 812px container
the label fits on one line. Both alternatives are worse: the kebab-safe threshold suppresses the
label on every ordinary chip through that band and well past it, and a kebab-aware threshold puts
`ArenaCalendarEvent`'s 34px reserve back inside `ArenaCalendar`, laundered through a second token but still
a number that silently goes wrong if the reserve changes.

**A chip is NOT a DOM child of its day's `role="row"`**: every chip is a child of the grid, and
each day claims its own through `aria-owns`. The `grid` pattern constrains the accessibility tree
and not the DOM, which is what makes that legitimate, and it is the only shape available to a
layer that cannot distribute projected children into a per-day loop, so both layers use it and a
difference between them stops being a difference in the DOM. Two things follow. A chip's
`left`/`right` are percentages of **every** day track rather than of one, so the day tracks must
be equal for a chip to land on its own day. And a click on a chip does not reach its day, so it
reports no date: activate the day from its header or its background. Anything projected that is
not a chip is still silently skipped by the placement lookup.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
