# ArenaSwitch by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/forms/arena-switch/ArenaSwitch.demo.generated.html`, and check in a real browser.

None of these is provable in happy-dom:
- The knob slides across the track over `--dur-state` and `--ease-state` rather than jumping, and the track's colour crossfades with it.
- Under `prefers-reduced-motion: reduce`, forced in DevTools' Rendering pane, the knob stops travelling and the track colour still crossfades. The colour is the intended answer for a state change. The travel is decorative and the colour is the report. `motion-reduce:transition-none` on the `knob` part is what does it.
- At every size the knob clears the track's padding on both ends, and the vertical transpose travels down rather than across.
- The glyph is legible inside the knob at `sm`, which is the size that decides whether per-state icons are usable at all.
- Clicking the label toggles; clicking the label of a disabled switch does not.
