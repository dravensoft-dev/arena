# ArenaScroller by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/layout/arena-scroller/ArenaScroller.demo.generated.html`, and check in a real browser:

- Tab into the row. The row takes focus as one stop and shows the focus ring, and the arrow keys scroll it.
- Under `snap`, releasing a drag mid-item settles on an item edge, and under `flow` it stays put.
- Every `arena-scroller-item` is the same width whatever it contains, and a bare child keeps its own.
- With a screen reader running, focus on the row announces the label rather than the word group alone.
