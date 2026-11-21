# ArenaCalendarEvent by hand (React)

Serve the tree with `bun run demos`, open `/frameworks/react/components/display/arena-calendar/ArenaCalendar.demo.generated.html`, and check in a real browser.

`ArenaCalendar` has a render suite that walks its grid, and everything below is what that suite cannot reach: layout, motion and focus rings, which happy-dom does not implement. Check all of:

1. Tab reaches the schedule ONCE, and one more Tab leaves it. No chip and no
   kebab is a stop of its own. An OPEN panel is the exception and is meant to be. The controls in it are yours and Arena cannot silence markup it does not own, and they exist in the tree only while the panel is open.
2. From an hour cell, Enter steps into an event chip; Escape steps back out.
   Walk a chip with a panel as well as one without: they are different elements
   and only the browser tells them apart.
3. On a chip with a panel, clicking the kebab opens the panel below the chip,
   and every control in it is clickable. Check a SHORT event, 30 minutes or
   less, not only a long one. The geometry is what this step is for. The keyboard route beside it is pinned by a render suite instead, because `ArenaCalendarEvent` binds `button` rather than `grid`. A chip mounted alone costs none of the RAM the grid rule exists to avoid.
4. Escape with the panel open CLOSES the panel and puts focus back on the kebab rather than on the document. Focus would fall to the document if nothing caught the control being unmounted under it. A second Escape returns focus to the
   hour cell.
5. Arrow keys still move by day and hour from an hour cell, and clamp at all
   four edges: the first day, the last day, the first hour and the last.
6. Every chip sits inside its own day column, with an even gutter each side. Check the full-width ones especially, since a chip whose event overlaps nothing is the case that overruns. The chip is `box-sizing: border-box`, so the width `ArenaCalendar` injects is its outer edge. If you ever see a chip cross a column border, that property is the first thing to check.
7. On a chip carrying a kebab, the title stops before the button and ellipsises
   there rather than running underneath it. Check a full-width chip and a
   half-width one: the half-width case has very little title left once the
   kebab's band is reserved, and it is the one worth an opinion.
8. A short event, 30 minutes or less, still shows its whole title. That event's chip is at the height floor, and under `border-box` the floor is the chip's outer height. A floor set too low clips the title with nothing failing.
9. A chip sharing its slot with an overlap draws no time label, and a chip that
   has the column to itself does. The label is redundant with the chip's own position on an hour grid, so it is the first thing to go when the chip is too small for it. The component already makes the same call on height.
10. Take a chip that shares its column and is tall enough, such as a 90-minute event beside an overlap. The kebab sits at the BOTTOM-right, and the title runs the full width above it. On a short one it stays top-right with the title stopping
    before it. Open the panel in the stacked case too: it hangs below the chip
    rather than over its own body, and every control in it is clickable.
