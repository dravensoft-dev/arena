# ArenaCard by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/display/arena-card/ArenaCard.demo.generated.html`, and check in a real browser:

- An interactive card takes the hover surface, and one Tab reaches it and shows the focus ring. Enter and Space both open it, and Space does not scroll the page underneath.
- The disabled card is still reached by Tab and still announces itself, and neither key nor pointer activates it.
- On the card holding a field, typing Enter in the field does not open the card, and the badge and the field keep their own presses.
- `arena-elevation-floating` casts the floating shadow and the default flat card does not, with no gradient on either.
- A long body wraps inside the padding rather than escaping the radius: the root clips with `overflow-hidden`, so a wide child is cropped rather than overflowing.
- With only an `action` and no title or eyebrow, the header still renders and the action sits right-aligned against an empty title block.
