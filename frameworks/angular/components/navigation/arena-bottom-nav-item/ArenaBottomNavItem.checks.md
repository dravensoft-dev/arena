# ArenaBottomNavItem by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/navigation/arena-bottom-nav/ArenaBottomNav.demo.generated.html`, and check in a real browser at 390px:

- A destination with a badge of 0 shows none, and one of 4821 shows `99+`. Neither widens its column.
- Tab reaches every destination once, in source order, and the disabled one announces itself as disabled rather than being skipped.
- A five-word label truncates with an ellipsis instead of pushing its neighbours out of line.
