# ArenaCalendar by hand (React)

Serve the tree with `bun run demos`, open `/frameworks/react/components/display/arena-calendar/ArenaCalendar.demo.generated.html`, and check in a real browser.

The page carries the measurement of the accepted limit that `ArenaCalendar.prompt.md` states for a chip with actions in week view, in the band of 768px to 800px of container. Drive the viewport and read the container beneath it: the container is the viewport less the card's 24px body padding a side, and `--bp-md` is compared against the container. At an 812px container at the browser default the label fits on one line.
