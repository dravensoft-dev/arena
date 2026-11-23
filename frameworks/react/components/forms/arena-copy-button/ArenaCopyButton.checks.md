# ArenaCopyButton by hand (React)

Serve the tree with `bun run demos`, open `/frameworks/react/components/forms/arena-copy-button/ArenaCopyButton.demo.generated.html`, and check in a real browser:

- Press it on `localhost` and paste somewhere. The check shows, then the copy glyph returns on its own.
- Serve the demo over plain HTTP from another host and press it. The warning and the failure word show.
- With a screen reader, press it once. "Copied" is announced once, and the button keeps its name.
- Press it twice inside the window. The check stays the full window after the second press.
- Put it inside an `arena-fill` container. The button keeps the width of its glyph, because the wrapper does not answer that family.
