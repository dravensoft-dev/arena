# ArenaMenu by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/navigation/arena-menu/ArenaMenu.demo.generated.html`, and check in a real browser. happy-dom has no layout and no platform activation, so none of this is provable there:

- The panel escapes an `overflow: hidden` ancestor and a scroll container, and repositions while that container scrolls.
- Near the bottom of the viewport it flips above its trigger, and `align="end"` hangs it from the trigger's right edge.
- One Enter opens it once, and one Space does too. The double open is what the `preventDefault` stops, and only a browser synthesizes the click that would cause it.
- A menu opened from inside an `arena-dialog` paints above the panel, and a tooltip on a row paints above the menu.
