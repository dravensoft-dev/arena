# ArenaDialog by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/feedback/arena-dialog/ArenaDialog.demo.generated.html`, and check in a real browser.

A suite proves the boundary wrap, because that is Arena's own `.focus()` call and happy-dom honours it. A suite cannot prove the interior, meaning that Tab from a control in the middle reaches the next one. The interior is the browser's native sequential focus navigation, which Arena does not implement and happy-dom does not have, so a suite asserting it would pass identically against a perfect trap and against none. The interior is checked by a person against this list.

Check all of:

1. Tab to "Promote build" and press Enter. Focus lands on Cancel, the first focusable inside the panel, not on the trigger.
2. Tab once. Focus moves to Promote. This is the step no suite can make: Cancel is first rather than last, so Arena's handler does nothing and the browser moves focus on its own. If this fails, the trap is fighting native navigation rather than bounding it.
3. Tab again. Focus wraps from Promote back to Cancel. This one is Arena's.
4. Shift+Tab. Focus wraps from Cancel back to Promote.
5. Escape, then a click on the scrim, then a click inside the panel. The first two close and return focus to "Promote build"; the third does nothing.
6. The scrim blurs what is behind it, and the panel enters with `arena-pop`, which drops its travel and keeps its fade under `prefers-reduced-motion`.

If you drive this through CDP rather than by hand, one gotcha costs an afternoon: a `rawKeyDown` does not activate a button. Enter must be dispatched as `keyDown` carrying `text: '\r'`. Tab and Escape are fine as `rawKeyDown`.
