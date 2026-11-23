# ArenaSheet by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/feedback/arena-sheet/ArenaSheet.demo.generated.html`, and check in a real browser:

- The page behind the panel still scrolls and its buttons still take a click, at every placement.
- Folding leaves the header and the footer in place and moves nothing else; the caret turns with it.
- An `ArenaMenu` opened from inside the panel paints over the panel, and the panel paints over a fixed bottom bar.
- Tab from the last control in the panel leaves it and lands on the page; nothing is trapped.
- At 390px the bottom panel clears the home indicator when the browser emulates a device inset.
