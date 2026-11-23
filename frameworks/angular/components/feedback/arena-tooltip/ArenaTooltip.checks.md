# ArenaTooltip by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/feedback/arena-tooltip/ArenaTooltip.demo.generated.html`, and check in a real browser.

None of these is provable in happy-dom. The page lays out one section per item:
- The bubble sits centred above the trigger with a `--sp-2` gap. The bubble flips below when the trigger is near the top of the viewport.
- The bubble escapes a scrolling `overflow: hidden` container and stays anchored while that container scrolls, which is the whole reason for the overlay.
- The reveal waits on pointer rest and is instant on Tab; travelling from the trigger onto the bubble does not dismiss it.
- Layering: a tooltip on an `arena-menu` item, and one inside an open dialog, both land above what they annotate.
