# ArenaButton by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/forms/arena-button/ArenaButton.demo.generated.html`, and check in a real browser.

None of these is provable in happy-dom:
- With `loading` set, the spinner turns; with `prefers-reduced-motion: reduce` forced in DevTools' Rendering pane, it keeps turning and only slows.
- `active:scale-98` gives a real press response. The focus ring is visible on keyboard focus at every emphasis, including `arena-emphasis-ghost`, whose border is transparent. The ring is an outline outside the control, so a hover shadow never hides it.
- `arena-fill` on the host spans the row. The host carries `display: contents`, so the class scopes over the button it draws. Without that the host would blockify to shrink-to-fit as a flex item, and the button would measure the host instead of the row.
