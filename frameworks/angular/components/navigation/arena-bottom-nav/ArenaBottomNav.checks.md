# ArenaBottomNav by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/navigation/arena-bottom-nav/ArenaBottomNav.demo.generated.html`, and check in a real browser at 390px:

- Try primary click, ctrl+click, middle click and Enter on the same destination. The first and the last report once and navigate once, and the other two open a tab and report nothing.
- The active destination's glyph is filled and its label takes the primary ink, and the others do not.
- With the browser emulating a device inset, the row lifts by it and the bar grows rather than the labels moving under the home indicator.
- An `arena-menu` opened from the page paints over the bar, and an `arena-sheet` does too.
