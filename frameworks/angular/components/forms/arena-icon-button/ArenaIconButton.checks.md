# ArenaIconButton by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/forms/arena-icon-button/ArenaIconButton.demo.generated.html`, and check in a real browser.

None of these is provable in happy-dom:
- The focus ring is visible on keyboard focus for both emphases, including `arena-emphasis-ghost`, whose background is transparent.
- Without `showLabel` the control is square at every size, and the glyph is optically centred rather than merely boxed in the middle.
- Hovering shows the `title`, and setting `showLabel` stops it appearing at all.
- `disabled` fades by `fade-disabled` and the cursor turns to not-allowed; both come from `:disabled` pseudo-class variants, so they prove the native attribute is really set.
