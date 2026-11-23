# ArenaDialog by hand (React)

Serve the tree with `bun run demos`, open `/frameworks/react/components/feedback/arena-dialog/ArenaDialog.demo.generated.html`, and check in a real browser.

A suite proves the boundary wrap, because that is Arena's own `.focus()` call and
happy-dom honours it. A suite cannot prove the **interior**, meaning that Tab from a control in the middle reaches the next one. The interior is the browser's native sequential focus navigation, which Arena does not implement and happy-dom does not have. A
browser-driven gate is refused as this repo's fourth non-portable gate, so the
interior is checked by a person against this list.

Check all of:

1. **Tab to "Open dialog" and press Enter.** Focus must land on **Cancel**, the
   first focusable inside the panel, not stay on the trigger.
2. **Tab once.** Focus moves to **Deploy**. The step below is the one no suite can make. Cancel is the first focusable rather than the last, so Arena's handler does nothing and the browser moves focus on its own. If this fails, the trap is fighting
   native navigation rather than bounding it.
3. **Tab again.** Focus wraps from Deploy back to Cancel. This one is Arena's.
4. **Shift+Tab.** Focus wraps from Cancel back to Deploy.
5. **Escape.** The dialog closes and focus returns to "Open dialog".

If you drive this through CDP rather than by hand, one gotcha costs an afternoon:
a `rawKeyDown` does not activate a button. Enter must be dispatched as `keyDown`
carrying `text: '\r'`. Tab and Escape are fine as `rawKeyDown`.
