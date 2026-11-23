# ArenaSelect by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/forms/arena-select/ArenaSelect.demo.generated.html`, and check in a real browser.

The popup is the browser's and happy-dom has none, so nothing below is provable by a suite:
- The popup opens on click and on Space, walks with the arrow keys and type-ahead, and commits on Enter. All of that is the platform's and none of it is Arena's.
- The caret sits inside the field's right padding and swallows no click: pressing it opens the control beneath it.
- The focus ring is the `edge-focus` role at `bw-focus`, and the platform outline is hidden, while a transparent one stays for forced colours.
- Disabled dims the whole column, label included, and the control refuses the pointer.
