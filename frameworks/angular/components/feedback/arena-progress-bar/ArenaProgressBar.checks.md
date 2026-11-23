# ArenaProgressBar by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/feedback/arena-progress-bar/ArenaProgressBar.demo.generated.html`, and check in a real browser.

The sweep is an animation and happy-dom has none, so a person checks:
- The indeterminate sweep travels left to right, continuously. The sweep slows rather than stops under `prefers-reduced-motion`, because motion that reports work in progress must keep reporting it.
- The determinate fill animates its width on `--dur-state` and `--ease-state` when the value changes, and does not animate on first paint.
- Each tone inks the fill only; the track behind it stays `--color-base-300` in all five.
- The three sizes differ in track height alone; the head row does not move with them.
- With `shape="radial"` the arc sweeps clockwise from twelve o'clock, and its band is the weight of the bar it replaces. An indeterminate ring turns a fixed quarter arc, slowing rather than stopping under `prefers-reduced-motion` for the reason the sweep gives.
