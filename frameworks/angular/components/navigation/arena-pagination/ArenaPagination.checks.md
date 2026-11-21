# ArenaPagination by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/navigation/arena-pagination/ArenaPagination.demo.generated.html`, and check in a real browser:

- Walk the 20-page strip to the middle and watch the window elide on both sides. Then walk to each end and watch it elide on one side only.
- Tab through the strip. Every page and both arrows take focus in reading order, and each shows the `edge-focus` role at `bw-focus`, drawn inside an arrow and outside a page.
- At page 1 and at page 20 the outward arrow is dimmed and does not respond to a click, and the strip does not change width.
- The current page is tellable from the others with the page desaturated, not by colour alone: it is the only filled surface in the row.
- With a screen reader, move by landmark: the two strips on the card announce as Environments and Deployments, never as two identical ones.
