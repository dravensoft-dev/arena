# ArenaFileInput by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/forms/arena-file-input/ArenaFileInput.demo.generated.html`, and check in a real browser.

happy-dom opens no picker and drops no real file, so a browser checks six things. The picker opens from Enter and from Space on the trigger. A real drop on the zone holds the file. A drop on a field without `droppable` does what the browser does. A native submission carries the shown files and no others. An empty `required` field refused by the browser shows its message at the trigger. A long file name in a chip at 390px wraps inside the chip without overflowing the field.
