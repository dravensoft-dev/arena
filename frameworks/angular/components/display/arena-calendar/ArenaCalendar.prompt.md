Week or day schedule on a time grid: a toolbar, one column per day, events positioned by their wall-clock span. Use it for an agenda someone reads against the clock: bookings, classes, shifts. It is not a date picker (use `arena-input type="date"`) and not a month planner (Arena ships no month grid).

**The events are its content.** Write one `<arena-calendar-event>` per event; `arena-calendar` reads each one's `start`, `end` and `colorId`, works out where the chip goes, and each chip reads that placement back out. There is no `events` input, and no throw for projecting nothing: a calendar with no children is a legitimately empty schedule, not a caller's mistake.

```html
<arena-calendar timeZone="Europe/Madrid" (rangeChange)="refetch($event)">
  <arena-button actions size="sm" variant="secondary">New class</arena-button>
  @for (c of classes(); track c.id) {
    <arena-calendar-event [id]="c.id" [title]="c.name" [start]="c.start" [end]="c.end"
                          [colorId]="c.room" (click)="open(c)" />
  }
</arena-calendar>
```

<!-- @api GENERATED from contracts/api/components/ArenaCalendar.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `content` | slot |  |  | One ArenaCalendarEvent per event. ArenaCalendar reads each one's start, end and colorId and settles where the chip goes, what colour it takes and how the keyboard reaches it; the chip itself is ArenaCalendarEvent's. |
| `timeZone` | primitive | `string` |  | IANA zone name. Defaults to the reader's own resolved zone, which is right whenever the schedule belongs to the person looking at it. Pass it when the calendar has a zone of its own that differs (a Madrid timetable read from Tokyo), and when server-rendering, where the reader's zone is not knowable. |
| `anchorDate` | primitive | `string` |  | ISO date the view opens on. Defaults to today in `timeZone`; pass and change it to drive the date yourself. |
| `view` | enum | `ArenaCalendarView` |  | Omit to derive from the CONTAINER width: day below --bp-md, else week. |
| `dayStart` | primitive | `string` |  | HH:MM the grid starts at. Defaults to the earliest visible event's hour, floored. |
| `dayEnd` | primitive | `string` | `"23:00"` | HH:MM the grid ends at. |
| `weekStartsOn` | primitive | `number` | `1` | 0 = Sunday … 6 = Saturday. |
| `hideEmptyWeekend` | primitive | `boolean` | `true` | Drop Sunday from the week unless an event falls on it. |
| `dayInteractive` | primitive | `boolean` | `false` | Whether a day can be activated. A boolean rather than "is `dateClick` bound?", because Arena never derives what it draws from what a consumer listens for, and the same member `ArenaTableRow.interactive` and `ArenaCalendarEvent.interactive` are for the same reason; here the derived render was the day's own cursor, and the layers diverged on screen because of it. With it on, the day header is a <button> (the keyboard's route to the date, and the one element that already names it), and the column background takes a pointer cursor; with it off both are inert and the cursor says so. The default is false because a schedule someone only reads is the ordinary calendar, and a pointer cursor over days that answer nothing is the defect this member exists to end. |
| `dateClick` | event | `string` |  | A day header or column background was activated; carries the ISO date. Never emitted unless `dayInteractive`. |
| `rangeChange` | event | `string` |  | The anchor moved via prev/Today/next; carries the new ISO date. A date rather than a delta, because Today is not a delta. |
| `actions` | slot |  |  | Right-aligned in the toolbar, beside the range title. |

<!-- @api end -->

`timeZone` is optional and defaults to the reader's own resolved zone, which is right whenever the schedule belongs to whoever is looking at it. **Pass it when the calendar has a zone of its own**: a class at 09:00 in Madrid must stay at 09:00 for a student loading the page from Lima, and only an explicit `timeZone="Europe/Madrid"` says so. It is also **not safe under server rendering**: on a server it resolves to the *server's* zone and then to the client's on hydration.

The anchor is internal, so prev/Today/next work with nothing wired. `rangeChange` reports the new anchor date; take it as the cue to refetch. Bind `anchorDate` only when you want to drive the date yourself: it is a `linkedSignal` source, so it wins whenever it changes and resets any navigation the reader had done.

**The toolbar's actions slot needs its marker directive.** `<ng-content select="[actions]">` is drawn only when `contentChild(ArenaActions)` resolves, so a consumer who writes `actions` on an element without importing `ArenaActions` from the layer root gets no toolbar actions and no error. That is the one failure mode of every marker slot in this layer.

**A day is activable only if you say so.** `dateClick` emits the ISO date of the day a reader picked, and it emits for nobody unless `dayInteractive` is bound too:

```html
<arena-calendar dayInteractive (dateClick)="openDay($event)">
```

The boolean is not ceremony. What a component draws may never be derived from whether a listener is bound, because a subscriber list is private here, so the day's cursor, which is a render, follows the boolean and not your binding. **With it on, each day header becomes a `<button>`** carrying the full date as its label, so a keyboard reaches a day at the one element that already names it; the column background takes the same click but stays pointer-only, because it is the same date reachable above.

**Keyboard.** The grid is one tab stop, not one per event (`dayInteractive` adds the header strip's, above it). Tab lands on a single hour cell; **a row is a day**, so Left/Right move a day and Up/Down move an hour, Home/End jump to the first/last hour of the focused day, and focus clamps at every edge. Enter steps into the first event overlapping the focused hour, Escape steps back out to the cell.

**A chip is not a DOM child of its day column, and `aria-owns` is why that does not matter.** This layer cannot project one set of children into several positions, so every chip is a child of the grid and each day column claims its own through `aria-owns`, which is what the `grid` pattern actually asks for, since it constrains the accessibility tree and not the DOM. It is the shape Arena renders everywhere, so a chip sits in the same place in every layer. Two consequences are real: the day columns are CSS grid **tracks** rather than flex items, because a chip's horizontal placement is a percentage of the whole grid and unequal columns would slide the last day's chips off; and anything projected that is not an `arena-calendar-event` becomes a **grid item** and adds a column, so project nothing else.

**The chip body is Arena's, and there is nothing you can put inside it.** An `arena-calendar-event` carries `id`, `title`, `start`, `end` and `colorId`, and Arena draws all of it. There is no per-event template, because a structural directive returning markup is not a member of any Arena contract.

**So a consumer cannot mark an event cancelled or tentative at all.** Colour is spoken for by identity, and the non-chromatic channel a strikethrough or a dashed border would have used is not reachable. Say it in the `title` (`'Ballet I, cancelled'`), or do not render an event for it and show it somewhere that is not the schedule.

**Do**
- Give an entity a stable `colorId` and reuse it everywhere that entity appears, which is what makes the ramp identity rather than decoration.
- Let `dayStart` default. It follows the earliest event, so a schedule that begins at 16:00 does not open on eight empty morning rows.
- Set `weekStartsOn` and `hideEmptyWeekend` to your locale and product. The defaults (Monday, Sunday hidden until used) are defaults, not the system's opinion.
- Preformat every `title` you pass. The calendar does no locale and no truncation of your own text beyond the chip's ellipsis.

**Don't**
- Don't try to paint an event `--danger` to mean cancelled. You cannot: `colorId` picks a ramp slot and nothing else, and identity and meaning in one palette makes both unreadable. Same rule the charts enforce.
- Don't reach past `colorId: 8`. There are eight slots and they never cycle; a ninth entity wrapping to slot 1 claims two different things are the same thing.
- Don't feed it multi-day or all-day events. There is no all-day row: an event running past midnight is clamped to the end of the day it started on.
- Don't project anything but `arena-calendar-event` into the default slot. Anything else lands in the grid as a track of its own.
- Don't wrap it to add a month view or a mini datepicker and call it Arena.

## Verifying by hand

happy-dom does no layout, so the geometry below is checked in a real browser and
nowhere else. `bun run build:angular-demo && bun run demos`, then open
`frameworks/angular/components/display/arena-calendar/ArenaCalendar.demo.generated.html`:

1. Tab reaches the schedule ONCE, and one more Tab leaves it. No chip and no
   kebab is a stop of its own. An OPEN panel is the exception and is meant to be.
2. From an hour cell, Enter steps into an event chip; Escape steps back out. Walk
   a chip with a panel as well as one without, since they are different elements.
3. Arrow keys move by day and hour, and clamp at all four edges.
4. **Every chip sits inside its own day column**, with an even gutter each side.
   This is the one claim no suite can make: read a day column's track boundaries
   and the chip's own `getBoundingClientRect().left` and confirm. A chip crossing
   a column border means the tracks are no longer equal.
5. On a chip carrying a kebab, the title stops before the button and ellipsises
   there. Check a full-width chip and a half-width one.
6. A short event, 30 minutes or less, still shows its whole title. Its chip is
   at the height floor, and that floor is an outer height under `border-box`.
7. A chip sharing its slot with an overlap draws no time label; one that has the
   column to itself does.
8. On a chip that shares its column and is at least 56px tall, the kebab sits at
   the BOTTOM-right with the title running the full width above it. Open the
   panel in that case too: it hangs below the chip and every control is clickable.
9. The now line is drawn over the chips rather than under them, being the last child of
   the grid and carries no z-index of its own.
10. **Enter and Space on a focused day header fire `dateClick`.** That is the
    browser's own activation of a `<button>`, so no suite can claim it: happy-dom
    has no such behaviour and a test for it would pass against a `<div>` too. Tab
    through the headers, fire both keys, and confirm one more Tab past the last one
    lands on the grid's single roving cell.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
