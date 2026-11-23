# ArenaCopyButton by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/forms/arena-copy-button/ArenaCopyButton.demo.generated.html`, and check in a real browser:

- Press it on `localhost` and paste the result. The check appears, and the copy glyph comes back unaided.
- Open the demo over plain HTTP from another host and press it. The warning glyph and the failure word appear.
- Run a screen reader and press once. "Copied" is spoken once, and the button's name is unchanged.
- Press twice within the window. The check holds for a full window after the second press.
- Place it in an `arena-fill` container. The button stays the width of its glyph.
