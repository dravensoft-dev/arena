# ArenaRadioGroup by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/forms/arena-radio-group/ArenaRadioGroup.demo.generated.html`, and check in a real browser.

The native radios sharing one `name` carry the behaviour, and that is exactly what happy-dom cannot show, so this is the only place it is checked at all:
- Tab into the group once: focus lands on the checked option, and Tab again leaves the group entirely rather than walking the other options.
- Arrow Down and Right and Up and Left move the selection and wrap at both ends.
- The disabled option is skipped while arrowing, and cannot be reached by Tab.
- Tab in and the focused option's ring takes the focus ring, though the focused element is the `opacity-0 size-0` native input. The `ring` part carries `[&:has(~input:focus-visible)]:shadow-[...]`, which reaches the input as a later sibling. The input must stay after the ring in the template, and moving it removes the ring silently. `arena-checkbox` draws the identical ring the identical way.
