# ArenaDivider by hand (React)

Serve the tree with `bun run demos`, open `/frameworks/react/components/layout/arena-divider/ArenaDivider.demo.generated.html`, and check in a real browser:

- At 390px a vertical rule in an `arena-row` stretches to the row's height.
- A long label does not overflow the row; the two rules shrink around it.
- A plugin answering the separator width with nothing draws no rule.
- Both layers' pages side by side draw the same rule and the same labelled rule.
