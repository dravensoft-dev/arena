# ArenaToastHost by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/feedback/arena-toast-host/ArenaToastHost.demo.generated.html`, and check in a real browser:

- Each of the four corners pins where it says, and the stack grows away from its own edge.
- The gap between two notices is the same in all four, and the standoff from the edges is too.
- With the browser emulating a device that reports a bottom inset, the bottom stack moves up by it and the top one does not move at all.
- A notice raised while a dialog is open paints over the dialog.
