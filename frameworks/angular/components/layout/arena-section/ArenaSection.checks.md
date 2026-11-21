# ArenaSection by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/layout/arena-section/ArenaSection.demo.generated.html`, and check in a real browser:

- The eyebrow, the title and the description read as three registers and not as three sizes.
- The action sits on the title's own baseline, and drops under it rather than squeezing when the head runs out of room.
- The four rhythm steps are visibly four distances between the head and the body.
- With a screen reader running, the heading is announced as a level two, and a section set to `h3` announces as a level three. The section announces no landmark of its own at either.
