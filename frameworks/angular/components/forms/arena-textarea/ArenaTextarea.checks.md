# ArenaTextarea by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/forms/arena-textarea/ArenaTextarea.demo.generated.html`, and check in a real browser:

None of these is provable in happy-dom, and the first one cannot be. happy-dom has no layout, so `scrollHeight` is `0`, and a growing box and a broken one look identical to any suite.
- `autoResize`: the box grows line by line as you type and shrinks again when you delete, with no scrollbar ever appearing. The one seeded with a long value is already tall on load; that is the `afterRenderEffect` at work: the box is sized before the first paint, not on first keystroke.
- Without `autoResize` the grip in the corner resizes vertically and not horizontally.
- The focus ring lands on the textarea itself, where `arena-input`'s lands on a wrapping group.
- The counter takes the warning tone between 90% and 100% of the cap, and the field stops accepting input at the cap because `maxlength` is native.
