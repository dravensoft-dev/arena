# ArenaTable by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/display/arena-table/ArenaTable.demo.generated.html`, and check in a real browser. happy-dom has no layout and no native sequential focus navigation, so a suite cannot reach these.

1. Tab reaches the grid once, and one more Tab leaves it. No cell is a stop of its own.
2. From a cell, Tab reaches a control inside a cell in one press, not two. Two means the grid pulled focus back onto the cell, since `focusin` bubbles and only a real browser shows it.
3. Arrows clamp at all four edges and focus never leaves the grid. Walk a middle row for `Home` and `End`, not only the first: they never leave the row.
4. `Enter` activates a row with `(activate)` and does nothing on the header row or on the disabled row. The page logs what was activated.
5. The squeezed container is already in card mode on load. Confirm nothing there took a role, a tabindex or a key handler by accident.
6. The measured width does not oscillate between the two shapes. Narrow the window slowly across the threshold and watch it settle rather than flicker.
