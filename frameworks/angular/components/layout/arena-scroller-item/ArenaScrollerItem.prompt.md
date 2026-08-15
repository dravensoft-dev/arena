Arena scroller item, one cell of an `arena-scroller`: the box that carries the width the row
decided and the point the row settles on. Standalone, `OnPush`. The host **is** the cell.

```html
<arena-scroller label="Recently landed lots" itemWidth="calc(var(--sp-1) * 62)">
  @for (lot of arrivals(); track lot.id) {
    <arena-scroller-item><app-lot-card [lot]="lot" /></arena-scroller-item>
  }
</arena-scroller>
```

<!-- @api GENERATED from contracts/api/components/ArenaScrollerItem.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `content` | slot |  |  | What the cell holds, exactly as it was written. The item draws no surface, no line and no padding: it is a width and a snap point, and everything visible inside it is the consumer's or another component's. |

<!-- @api end -->

**Why the cell is a component rather than a rule on the row's children.** A row cannot reach
inside its children to size them, so the width has to land on the child itself. Several Arena
components take their host out of layout with `display: contents`, so a rule aimed at the row's
direct children lands on an element with no box, and whether it lands at all then depends on
which component the caller put in the row, with every gate green. The item is the box that is
always there, and its own host carries a real one.

**It draws nothing.** No surface, no line, no padding: a width and a snap point. Whatever is
visible in the cell came from what you projected into it.

**Do / Don't**
- **Do** put one per item, and let the card, the tile or the figure sit inside it.
- **Don't** set the width here. The row owns it, through `itemWidth`, so a rail of cells is one
  decision rather than one per cell.
- **Don't** reach for it outside an `arena-scroller`. Outside a row it is a box that reads a
  property nothing set.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/angular/components/layout/arena-scroller-item/ArenaScrollerItem.demo.generated.html`:
- The cell is exactly as wide as the row's `itemWidth`, whatever it contains.
- Every cell is the same width and the same height, whatever component sits inside it.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
