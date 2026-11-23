# ArenaGrid by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/layout/arena-grid/ArenaGrid.demo.generated.html`, and check in a real browser:

- Narrow the window from wide to 390px: the count falls one step at a time and never overflows.
- At the narrowest, one column fills the width, because the minimum is clamped rather than honoured.
- Each gap is a visibly different step, and both axes get the same one.
- With an `arena-grid-max` class written, the grid centres and stops growing, and without one it fills.
