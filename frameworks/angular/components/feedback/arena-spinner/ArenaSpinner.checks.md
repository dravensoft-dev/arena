# ArenaSpinner by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/feedback/arena-spinner/ArenaSpinner.demo.generated.html`, and check in a real browser.

The rotation is an animation and happy-dom has none, so a person checks:
- The ring rotates continuously on `--loop-spin`, and slows to `--loop-reduced` under `prefers-reduced-motion` rather than stopping, because motion reporting work in progress keeps reporting it.
- The gap in the ring is the transparent top border, so the rotation is legible at every size. At `sm` it still reads as a ring rather than a dot.
- `arena-accent-ink` is the only accent that stays legible on a surface filled with the primary; the card puts all four on one to show it.
