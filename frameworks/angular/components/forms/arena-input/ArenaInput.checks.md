# ArenaInput by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/forms/arena-input/ArenaInput.demo.generated.html`, and check in a real browser.

None of these is provable in happy-dom:
- `type="date"`: the picker indicator is visible on the dark field and brightens on hover. Arena's own `[&::-webkit-calendar-picker-indicator]:` styling reads `--picker-invert` for that. Without it the browser draws a black glyph on a dark surface. Toggle `.arena-light` on `<html>` and it inverts with the theme.
- The focus ring appears on the field group, not on the input, and a valid field keeps its success-tone border while showing that ring.
- The error border and ring appear at rest, with no focus needed.
- Typing into the validated field and leaving it produces the message on blur, and the `validateOn="change"` one produces it while typing and clears it again.
