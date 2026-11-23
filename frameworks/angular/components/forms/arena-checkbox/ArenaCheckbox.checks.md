# ArenaCheckbox by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/forms/arena-checkbox/ArenaCheckbox.demo.generated.html`, and check in a real browser.

None of these is provable in happy-dom:
- The tick's stroke reads cleanly on the primary fill at 100% zoom. The tick's box is `--sp-3` inside an `--sp-5` square rather than filling it.
- Clicking the label text toggles the box, and so does Space with the control focused.
- `disabled` fades the whole control by `fade-disabled` and the cursor turns to not-allowed over the label as well as the box.
- Tab to the control and the box takes the focus ring, even though the element the browser focused is the `opacity-0 size-0` native input. The `box` part carries `[&:has(~input:focus-visible)]:shadow-[...]`, which reaches the input as a later sibling inside the same `<label>`. The input must stay after the box in the template, and moving it removes the ring with nothing failing.
