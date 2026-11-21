# ArenaSkipLink by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/layout/arena-skip-link/ArenaSkipLink.demo.generated.html`, and check in a real browser:

- With the page freshly loaded, the first Tab reveals it and nothing else has focus before it.
- The link draws over whatever is beneath it rather than pushing the page down.
- Enter moves focus into the main region, and the Tab after that continues from inside it.
- A second Tab away from it makes it invisible again with no layout moving.
