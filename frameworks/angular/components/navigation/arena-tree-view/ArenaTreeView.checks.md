# ArenaTreeView by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/navigation/arena-tree-view/ArenaTreeView.demo.generated.html`, and check in a real browser. happy-dom has no layout and no native focus navigation, so six checks stay with a person:

1. Tab reaches the tree once, and one more Tab leaves it. The focused node is the one with the ring.
2. ArrowDown, ArrowUp, ArrowRight and ArrowLeft walk as the table says. A screen reader announces level, position and state, such as "level 2, 3 of 5, collapsed".
3. Type two characters quickly, and the prefix lands on the node that starts with both. Type them slowly, and each one starts a new search.
4. Level 3 sits two `pad-row-indent` steps in from level 1, at base, under `.arena-comfortable` and under `.arena-compact`.
5. The demo page draws five rows, so it cannot show this. Bind `windowed` on a tree of a few thousand nodes inside a container of bounded height. The tree scrolls, and a node that takes focus scrolls into view.
6. In the `complete` scope, the selected row and the focus ring read as two different things.
