# ArenaMultiSelect by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/forms/arena-multi-select/ArenaMultiSelect.demo.generated.html`, and check in a real browser.

Check that the field wraps its chips without covering the caret or the clear control. Tab lands on the field and never on a chip. A screen reader reads "Remove Berlin" on a chip. The list stays open across presses on rows and does not jump. At phone width, `max` and `maxVisible` still hold.
