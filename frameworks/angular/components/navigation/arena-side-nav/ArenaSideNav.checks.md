# ArenaSideNav by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/navigation/arena-side-nav/ArenaSideNav.demo.generated.html`, and check in a real browser:

- Each level steps in by exactly one `pad-row-indent`. A row's icon stays aligned with its siblings' rather than with its parent's.
- Switching the active destination moves the ink and the weight, and opens the group holding it.
- The rail still reads at `.arena-compact`, where every indent shrinks with the token.
