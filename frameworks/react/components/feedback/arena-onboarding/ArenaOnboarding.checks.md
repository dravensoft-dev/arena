# ArenaOnboarding by hand (React)

Serve the tree with `bun run demos`, open `/frameworks/react/components/feedback/arena-onboarding/ArenaOnboarding.demo.generated.html`, and check in a real browser.

Native sequential focus navigation is the browser's, and no suite in this repo drives one. A suite proves the boundary wrap, which is Arena's own `.focus()` call, and cannot prove the **interior**, meaning that Tab from a middle control reaches the next one, because happy-dom does not implement it. A browser-driven gate stays refused, so this list is the check. With the tour open, Tab repeatedly through Back, Skip and Next, and confirm focus never leaves the coachmark. Then Shift+Tab back through it.

**Start by pressing Escape.** That card renders with the tour already open, because a specimen has to show something. Pressing "Start tour" while `open` is already `true` correctly does nothing, because the hook keys its effect on `open` changing. Skipping
this step measures the closed-to-open transition that never happened.

Then, with the tour closed:

1. **Tab to "Start tour" and press Enter.** Focus must land on **Skip**, the first
   focusable in the coachmark. On the first step there is no Back button, so Skip is
   genuinely first; on a middle step it is Back.
2. **Tab once.** Focus moves to **Next**. Native navigation, not Arena's.
3. **Tab again.** Focus wraps back to Skip.
4. **Shift+Tab.** Focus wraps from Skip to Next.
5. **Escape.** The tour closes through `onSkip`, the same channel the Skip button and the scrim click use. One channel is how `modal-focus`'s `keyboard.Escape` is met without adding a member, and focus returns to "Start tour".

Driving this through CDP: Enter must be `keyDown` with `text: '\r'`; a `rawKeyDown`
does not activate a button.
