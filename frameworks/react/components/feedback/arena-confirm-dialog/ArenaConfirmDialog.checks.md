# ArenaConfirmDialog by hand (React)

Serve the tree with `bun run demos`, open `/frameworks/react/components/feedback/arena-confirm-dialog/ArenaConfirmDialog.demo.generated.html`, and check in a real browser.

A suite proves the boundary wrap: Arena's own `.focus()` call, which happy-dom
honours. A suite cannot prove the **interior**, meaning that Tab from a middle control reaches the next one. The interior is the browser's native sequential focus navigation. A
browser-driven gate stays refused, so the interior is a person's job.

**Start by pressing Escape.** That card renders with `open` already `true`, because a
specimen has to show something. Pressing the trigger while the dialog is already open is correctly a no-op, because the hook keys its effect on `open` changing. The key is precisely so a re-render never steals focus back from a field the user is typing in. A check that skips this step measures nothing and looks like a defect.

Then, with the dialog closed:

1. **Tab to "Delete project…" and press Enter.** Focus must land on the require-text
   **input**, the first focusable in the panel.
2. **Tab once.** Focus moves to **Cancel**. Native navigation, not Arena's.
3. **Tab again.** Focus wraps back to the input. Note that Cancel is the *last* focusable rather than "Delete permanently". The confirm button is `disabled` until the word is typed, and the trap recomputes what is focusable on every key rather than caching it. Type `DELETE` and repeat: the wrap must now pass through the confirm
   button.
4. **Shift+Tab from the input.** Focus wraps to the last focusable.
5. **Escape.** The dialog closes and focus returns to the trigger. The scrim stays
   inert on purpose: clicking outside must NOT close a destructive confirmation.

Driving this through CDP: Enter must be `keyDown` with `text: '\r'`; a `rawKeyDown`
does not activate a button.
