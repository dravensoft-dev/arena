# ArenaSparkline by hand (React)

Serve the tree with `bun run demos`, open `/frameworks/react/components/charts/arena-sparkline/ArenaSparkline.demo.generated.html`, and check in a real browser.

Five claims, because a suite runs without layout:
1. A table row at the base, comfortable and compact densities keeps its height when a sparkline is added to one of its cells.
2. A table column of static sparklines adds no tab stop, so Tab leaves the grid in one press.
3. A screen reader announces the hidden table inside a grid cell once, and row navigation in the grid still works.
4. The end dot is not clipped at either edge, at all three densities.
5. An interactive tooltip near the right edge of a card is not clipped by an ancestor with `overflow: hidden`.
