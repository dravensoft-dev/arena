# ArenaCalendar by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/display/arena-calendar/ArenaCalendar.demo.generated.html`, and check in a real browser. happy-dom does no layout, so the geometry below is checked there and nowhere else.

1. Tab reaches the schedule once, and one more Tab leaves it. No chip and no kebab is a stop of its own. An open panel is the exception and is meant to be.
2. From an hour cell, Enter steps into an event chip and Escape steps back out. Walk a chip with a panel as well as one without, since they are different elements.
3. Arrow keys move by day and hour, and clamp at all four edges.
4. Every chip sits inside its own day column, with an even gutter each side. No suite can make that claim. Read a day column's track boundaries and the chip's own `getBoundingClientRect().left`, and confirm. A chip crossing a column border means the tracks are no longer equal.
5. On a chip carrying a kebab, the title stops before the button and ellipsises there. Check a full-width chip and a half-width one.
6. A short event, 30 minutes or less, still shows its whole title. That event's chip is at the height floor, and the floor is an outer height under `border-box`.
7. A chip sharing its slot with an overlap draws no time label, and one that has the column to itself does.
8. On a chip that shares its column and is at least 56px tall, the kebab sits at the bottom right with the title running the full width above it. Open the panel in that case too: it hangs below the chip and every control is clickable.
9. The now line is drawn over the chips rather than under them, because it is the last child of the grid and carries no z-index of its own.
10. Enter and Space on a focused day header fire `dateClick`. The browser's own activation of a `<button>` does that, so no suite can claim it: happy-dom has no such behaviour, and a test for it would pass against a `<div>` too. Tab through the headers, fire both keys, and confirm one more Tab past the last one lands on the grid's single roving cell.
