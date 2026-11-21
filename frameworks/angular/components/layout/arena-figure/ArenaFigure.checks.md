# ArenaFigure by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/layout/arena-figure/ArenaFigure.demo.generated.html`, and check in a real browser:

- The frame keeps its shape as the column narrows, and the picture crops rather than squashing.
- With no media, the fallback sits centred and reads as a placeholder rather than as an error.
- The overlay stays legible over the wash in both themes.
- With a screen reader running, the caption is announced with the figure and not as a stray line.
