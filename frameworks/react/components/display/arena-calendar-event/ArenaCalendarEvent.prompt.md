One event on an `ArenaCalendar`'s schedule. It is a child of `ArenaCalendar` and nothing else: everything about where the chip lands (its top, its height, the column it shares with its overlaps, its ramp colour, its place in the grid's keyboard order) is worked out by `ArenaCalendar` and injected into this element. On its own it renders an unplaced chip and means nothing.

```tsx
<ArenaCalendar timeZone="Europe/Madrid">
  {classes.map((c) => (
    <ArenaCalendarEvent key={c.id} id={c.id} title={c.name} start={c.start} end={c.end}
      colorId={c.room} onClick={() => open(c)} />
  ))}
</ArenaCalendar>
```

<!-- @api GENERATED from contracts/api/components/ArenaCalendarEvent.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `id*` | primitive | `string` |  | Stable identity, so a host can switch on it rather than on the title. |
| `title*` | primitive | `string` |  | What the chip reads. |
| `start*` | primitive | `string` |  | ISO datetime the event begins. |
| `end*` | primitive | `string` |  | ISO datetime the event ends. |
| `colorId` | enum | `ArenaCatSlot` |  | Identity colour. Give the same entity the same slot everywhere and it keeps its colour across views. |
| `interactive` | primitive | `boolean` | `false` | Whether the chip can be activated. A boolean rather than "is `click` bound?", because Arena never derives what it draws from what a consumer listens for, and the same member `ArenaTableRow.interactive` is for the same reason. An interactive chip is a <button> a keyboard user reaches with Enter from the hour cell it overlaps; a non-interactive one draws the same chip with no role and no activation, so a read-only schedule announces events rather than a screenful of buttons that do nothing. |
| `actionsEnabled` | primitive | `boolean` | `false` | Whether the chip shows its action button. A boolean rather than "is the actions slot filled?": Arena never derives what it draws from what a consumer listens for, because projected content is not inspectable in at least one platform, so gating the drawing on it is a divergence waiting to happen. |
| `actions` | slot |  |  | The action panel's content, revealed by the chip's action button. Rendered only while the panel is open, so a consumer's own controls never sit permanently in the grid's Tab sequence. |
| `disabled` | primitive | `boolean` | `false` | Whether the chip is drawn but cannot be activated: an event a consumer's rules lock, such as one already past or owned by someone else. It reflects through `aria-disabled` rather than the native `disabled` attribute, so the chip keeps its place in the grid's roving Tab sequence and is announced as unavailable instead of disappearing from it. With `interactive` false there is nothing to activate and the chip is inert already. |
| `onClick` | event |  |  | The chip was activated. No payload: the consumer wrote this element, so they already hold the event this is about. Never emitted while `disabled`. |

<!-- @api end -->

`id`, `title`, `start` and `end` are all required and **throw** when absent. `start` and `end` are ISO datetimes, read in the calendar's `timeZone` and never the reader's.

**`onClick` carries no payload, deliberately.** You wrote this element, so your handler already closes over the record it came from, so `onClick={() => open(c)}` reaches the whole of `c` with no id-to-object lookup. A payload would have handed back the five fields you had just passed in.

**Passing `onClick` is what makes the chip interactive.** With it the chip renders as a real `<button>` with an accessible name of "title, date, time range"; without it, it is an inert `<div>` and there is nothing for a keyboard or a screen reader to act on. That is the same conditional shape `ArenaTag` has, and it is recorded as a limitation of the behaviour layer rather than hidden: the binding claims the `button` pattern unconditionally because the schema cannot say "only when `onClick` is passed".

**An interactive chip is not a page-level tab stop, and that is on purpose.** The grid is one tab stop; Enter from the hour cell an event overlaps steps into the chip, Escape steps back out to the cell. Do not try to restore a `tabIndex`: `ArenaCalendar` injects `-1` and would overwrite it anyway, and a chip per tab stop is what the grid pattern exists to prevent.

What "into the chip" means depends on the shape. A chip with no action panel *is* the button, and focus lands on it. A chip with one cannot be, since a kebab nested inside a button is invalid HTML, so the chip is a `<div>`, the title and time move into a body `<button>` inside it, and that body is what Enter focuses. The distinction is invisible to a consumer and is written down because the ref `ArenaCalendar` focuses has to follow the focusable element; pointed at the wrong one, Enter on a paneled chip moves focus nowhere at all.

**The kebab is reachable by keyboard, and by arrows rather than Tab.** With focus on a chip, `ArrowRight` steps to its kebab and `ArrowLeft` steps back. Tab is deliberately not the route: Tab has to *leave* a composite, and a tabbable kebab is precisely what would make `ArenaCalendar`'s grid stop being the single tab stop its `grid` binding claims. Activating the kebab opens the panel and moves focus into it, since landing the user on the button they just pressed would leave them with no way in, and `Escape` closes the panel and returns focus to the kebab rather than letting it fall to the document.

**`actionsEnabled` draws a kebab on the chip; `actions` is what the panel behind it holds.**

```tsx
<ArenaCalendarEvent id={c.id} title={c.name} start={c.start} end={c.end} onClick={() => open(c)}
  actionsEnabled
  actions={<>
    <ArenaButton size="sm" variant="ghost" icon="ph-bold ph-pencil">Edit</ArenaButton>
    <ArenaButton size="sm" variant="ghost" icon="ph-bold ph-trash">Delete</ArenaButton>
  </>} />
```

**The boolean is what draws the kebab, not the slot being filled.** `actionsEnabled` with an empty `actions` draws a kebab over an empty panel; that is a consumer mistake rather than a state Arena hides, and it is deliberate. Nothing here is derived from whether a slot was filled or a listener was bound, which is the same reason `ArenaAlert.dismissible` and `ArenaToast.dismissible` are booleans.

**`interactive` is what makes the chip a button, not `onClick`.** The rendered element never depends on whether anything is listening, so activation is a member you declare. It is the same member `ArenaTableRow` carries, for the same reason, so the two families have one shape. **Pass `interactive` alongside `onClick`, or the chip is inert**: a `<div>` with no role, nothing to activate and nothing to disable, which is exactly what a read-only schedule wants and what makes it announce events rather than a screenful of buttons that do nothing.

**The panel's content is in the tree only while the panel is open.** That is what keeps the grid at one tab stop: your buttons are yours, Arena cannot silence them, and a permanently rendered row of them would be a permanent set of tab stops inside a grid that is supposed to have one. It also means the panel is not a place to keep state: it is unmounted and remounted with every open.

**Do**
- Give the same entity the same `colorId` everywhere it appears. That is what makes the ramp identity rather than decoration.
- Preformat the `title`. Arena does no locale formatting and no truncation of your text beyond the chip's own ellipsis.
- Let the chip be inert when nothing happens on activation. An interactive-looking chip that does nothing is worse than a plain one.
- Keep the panel to a couple of controls. It opens over the schedule at the chip's own width, and a panel wider than the day column it hangs from covers the events beside it.
- Pass `actions` whenever you pass `actionsEnabled`. The two travel together; the boolean alone draws a button onto an empty panel.
- Reach for `disabled` when the event is drawn but must not be opened, whether one already past or one owned by someone else. It reflects through `aria-disabled`, so the chip keeps its place in the grid's roving Tab sequence and is announced as unavailable instead of disappearing from it, and `onClick` is never called while it is set.

**Don't**
- Don't put children inside it. It takes none: the title and the time line are the chip body, and Arena draws both.
- Don't render one outside an `ArenaCalendar`. It has no position of its own and no useful meaning without the grid around it.
- Don't use `disabled` to make a chip inert. Omit `onClick` for that: an inert chip is a `<div>` with nothing to press, where a disabled one is a button that announces it cannot be pressed right now. They read differently to a screen reader on purpose.
- Don't reach past `colorId: 8`. There are eight ramp slots and they never cycle; a ninth entity wrapping to slot 1 claims two different things are the same thing.
- Don't reach for `style` or `className`. It takes neither, the same as every other Arena component under the API contract.
- Don't write `defaultPanelOpen`. It is reachable and it is not API: it exists so a static render can assert the open branch, since `renderToStaticMarkup` cannot click. It is in no contract and in no exported interface, and it can be removed without a major.

## Verifying the panel by hand

`ArenaCalendar` has a render suite that walks its grid, and everything below is what
that suite cannot reach: layout, motion and focus rings, which happy-dom does not
implement. Serve the tree with `bun run demos`, open
`frameworks/react/components/display/arena-calendar/ArenaCalendar.demo.generated.html`, and check all of:

1. Tab reaches the schedule ONCE, and one more Tab leaves it. No chip and no
   kebab is a stop of its own. An OPEN panel is the exception and is meant to
   be: the controls in it are yours, Arena cannot silence markup it does not
   own, and they exist in the tree only while the panel is open.
2. From an hour cell, Enter steps into an event chip; Escape steps back out.
   Walk a chip with a panel as well as one without: they are different elements
   and only the browser tells them apart.
3. On a chip with a panel, clicking the kebab opens the panel below the chip,
   and every control in it is clickable. Check a SHORT event, 30 minutes or
   less, not only a long one. The geometry is what this step is for; the
   keyboard route beside it is pinned by a render suite instead, because
   `ArenaCalendarEvent` binds `button` rather than `grid` and a chip mounted alone
   costs none of the RAM the grid rule exists to avoid.
4. Escape with the panel open CLOSES the panel and puts focus back on the
   kebab, not on the document, which is what would happen if nothing caught
   the control being unmounted under it. A second Escape returns focus to the
   hour cell.
5. Arrow keys still move by day and hour from an hour cell, and clamp at all
   four edges: the first day, the last day, the first hour and the last.
6. Every chip sits inside its own day column, with an even gutter each side, and
   the full-width ones especially, since a chip whose event overlaps nothing is
   the case that overruns. The chip is `box-sizing: border-box`, so the width
   `ArenaCalendar` injects is its outer edge; if you ever see a chip cross a column
   border, that property is the first thing to check.
7. On a chip carrying a kebab, the title stops before the button and ellipsises
   there rather than running underneath it. Check a full-width chip and a
   half-width one: the half-width case has very little title left once the
   kebab's band is reserved, and it is the one worth an opinion.
8. A short event, 30 minutes or less, still shows its whole title. Its chip is
   at the height floor, and under `border-box` that floor is the chip's outer
   height, so a floor set too low clips the title with nothing failing.
9. A chip sharing its slot with an overlap draws no time label, and a chip that
   has the column to itself does. The label is redundant with the chip's own
   position on an hour grid, so it is the first thing to go when the chip is too
   small for it, which is the same call the component already makes on height.
10. On a chip that shares its column and is tall enough, a 90-minute event beside
    an overlap, the kebab sits at the BOTTOM-right and the title runs the full
    width above it. On a short one it stays top-right with the title stopping
    before it. Open the panel in the stacked case too: it hangs below the chip
    rather than over its own body, and every control in it is clickable.

**One accepted limit, measured.** A **short, narrow** chip with actions has almost no title left.
Reserving the kebab's 34px band is what stops the title being drawn underneath it, and on a
full-width chip it costs nothing; on a chip sharing its slot (`cols: 2`, about 78px outer) it
leaves a **36.58px** content box, which renders a title like `Client review, Northwind` as `Clien…`. **A tall
one does not meet it**: at 56px or more the kebab moves to the chip's bottom-right, the
reserve is dropped, and the title gets the whole **64.6px**, with truncation measured falling from 74%
to 54% rather than to the 18% its kebab-less neighbours show, because that figure belongs to their
shorter titles. 56px is the sum that makes title and kebab fit without overlap, so it reaches
events of roughly 75 minutes or more. What remains is a 30- or 60-minute event sharing its column,
and both remaining options cost more than the gap: showing the kebab only on hover or focus fails
a touch reader, and the chip is a `grid` cell whose hover is not a given; not rendering it below
some width makes `actionsEnabled` a request rather than a guarantee and silently removes the only
route to the consumer's actions. **A member that sometimes does nothing is worse than a truncated
title.**

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
