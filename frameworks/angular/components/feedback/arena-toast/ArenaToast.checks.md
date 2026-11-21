# ArenaToast by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/feedback/arena-toast/ArenaToast.demo.generated.html`, and check in a real browser.

The announcement is a screen reader's, not a browser's, so the page shows the rest:
- Each tone's left bar takes its own colour and the card surface never does; danger is outline, never a panel in the danger fill.
- A danger toast shows `Pinned` even when the host passed `persist="false"`, and the demo's clock leaves it alone while every other toast expires.
- The action and the close control are two separate controls, both reachable by Tab, and the close control sits outside the body column rather than inside it.
- Stacked against an open dialog, a toast paints above it.
