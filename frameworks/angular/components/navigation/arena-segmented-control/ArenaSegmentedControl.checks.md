# ArenaSegmentedControl by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/navigation/arena-segmented-control/ArenaSegmentedControl.demo.generated.html`, and check in a real browser. The platform behaviour of the radios is what happy-dom cannot show:

- Tab into the track once. The ring appears around the whole track rather than around a segment, and Tab again leaves it rather than walking the segments.
- Arrow keys move the selection along the track and wrap at both ends.
- The selected segment's shadow reads as a lift against the track's own surface at `sm` as well as `md`. `sm` is the size that decides whether the lift is visible at all.
- Two tracks on the page select independently, which is the generated `name` working.
