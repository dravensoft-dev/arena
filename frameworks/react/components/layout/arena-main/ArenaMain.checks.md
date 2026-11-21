# ArenaMain by hand (React)

Serve the tree with `bun run demos`, open `/frameworks/react/components/layout/arena-main/ArenaMain.demo.generated.html`, and check in a real browser:

- The page looks the same with the component and with a plain `<div>` in its place.
- The accessibility pane shows one `main` landmark.
- Clicking a link to `#arena-main` moves focus into the region. The focus ring on the next Tab is what proves it: focus continues from inside the main rather than from the nav.
