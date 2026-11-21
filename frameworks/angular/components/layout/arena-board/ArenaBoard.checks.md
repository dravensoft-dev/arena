# ArenaBoard by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/layout/arena-board/ArenaBoard.demo.generated.html`, and check in a real browser:

- Tab reaches the board itself, the ring lands on the whole frame, and the arrow keys scroll it.
- Columns share the width while they fit and stop at the `arena-board-column` width, after which the board scrolls.
- A column is as tall as its own stack: they do not stretch to match the tallest.
