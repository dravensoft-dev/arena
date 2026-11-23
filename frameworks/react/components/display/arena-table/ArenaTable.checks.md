# ArenaTable by hand (React)

Serve the tree with `bun run demos`, open `/frameworks/react/components/display/arena-table/ArenaTable.demo.generated.html`, and check in a real browser.

`ArenaTable` has render suites. One walks the grid cell by cell and renders both declared shapes. Another covers the markup: the roles, the name, the `label` guard and the tab-stop count.
A grid component is not hand-tested instead. A grid suite asserts at every cell that focus landed where the arrow should take it, and that exactly one `tabindex="0"` exists and is that cell. Each edge clamp costs one extra press. **The bill is the press count**, since every press re-renders the grid through `act()`. The bill is why the fixture stays small and explicitly sized. What is below is what no suite can reach, since happy-dom
implements no layout and no native sequential focus navigation, and only a person checks it.

Check all of:

1. Tab reaches the table ONCE, and one more Tab leaves it. No cell is a stop of its
   own. Controls YOU drew inside a cell are the exception and are meant to be. Those controls are yours and Arena cannot silence markup it does not own. Taking them out of the Tab sequence would remove a route a keyboard user has.
2. From a cell, Tab reaches a control inside a cell in **ONE** press, not two. A second press means the grid pulled focus back onto the cell, and only a real browser shows it. `focusin` bubbles, so a control inside a `<td>` fires that cell's focus handler, moves the roving cursor, and the focus effect takes the focus back. Nothing automatic can hold this. `renderToStaticMarkup` runs
   no effects and dispatches no focus, and a component binding `grid` may not have a
   render suite, so this step IS the guard. A control in a cell is the expected way to build a status or an actions column, so the step matters. The demo page's own cells hold an `ArenaBadge`, which
   is not focusable. Check this one on any table whose cells hold a real `ArenaButton`
   rather than a badge, since a focusable control in a cell is what the second press
   is about.
3. Arrow keys move by cell and clamp at all four edges: the first column, the last
   column, the header row at the top, the last body row at the bottom. Focus never
   leaves the grid. Try it on a table whose rows carry a different number of cells
   than there are columns: the cursor must clamp against the row it is in, not
   against `columns.length`.
4. Walk a middle row for `Home` and `End`, not only the first: they never leave the row.
5. `Enter` activates the row when the `ArenaTableRow` has `onActivate`, and does nothing on
   the header row.
6. Card mode answers none of the grid keyboard, and it is not supposed to. That page
   renders the SAME table twice, the second time in a 340px container, so card mode is
   already on screen. Check that a card whose row carries `interactive` is a single tab stop that announces itself as a button and activates on Enter and Space. Check that a card whose row has none took no `role`, `tabindex` or key handler by accident. `interactive`
   is what decides that, never whether `onActivate` was passed: Arena derives no render from a bound listener.

### A windowed table, on a page of your own

A windowed table needs a page that windows 20,000 rows through `useArenaRowWindow` inside a box of fixed height, with `arena-sticky-head` on the table. The demo page is a paged table, so it cannot show these. Check all of:

1. The scrollbar thumb is the right size, and dragging it never shows blank rows.
2. Tab reaches the grid once and leaves in one press, and the box has no tab stop of its own.
3. Holding ArrowDown from the top runs to row 200 without losing focus or stalling.
4. PageDown and PageUp move by about a viewport. Control plus End lands on the last row, and a screen reader announces "row 20,001 of 20,001".
5. The sticky head never hides the focused row moving up, and it sits under an app bar correctly when the box is the page.
6. Toggling `arena-compact` on the container re-measures, and the thumb and the window stay right.
7. Rows that wrap, and cards of different heights below `--bp-md`, keep the thumb steady. The top row stays in place while the reader scrolls up through rows measured for the first time.
8. A screen reader reads `aria-rowindex` correctly at offset 12,000.
9. Below `--bp-md`, with interactive rows, Tab walks the cards past the end of the first window without leaving the table early, and Shift plus Tab walks back.
