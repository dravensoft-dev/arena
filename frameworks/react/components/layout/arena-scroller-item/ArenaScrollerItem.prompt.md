One cell of an `ArenaScroller`: the box that carries the width the row decided and the point the
row settles on.

```tsx
<ArenaScroller label="Recently landed lots" itemWidth="calc(var(--sp-1) * 62)">
  {arrivals.map((lot) => (
    <ArenaScrollerItem key={lot.id}><LotCard lot={lot} /></ArenaScrollerItem>
  ))}
</ArenaScroller>
```

<!-- @api GENERATED from contracts/api/components/ArenaScrollerItem.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `children` | slot |  |  | What the cell holds, exactly as it was written. The item draws no surface, no line and no padding: it is a width and a snap point, and everything visible inside it is the consumer's or another component's. |

<!-- @api end -->

**Why the cell is a component rather than a rule on the row's children.** A row cannot reach
inside its children to size them, so the width has to land on the child itself. A child that is an
Arena component may render no box of its own, which makes a `> *` rule land on the card in one
layer and on nothing in the other, and the two layers then lay the same markup out differently
with every gate green. The item is the box both layers agree about.

**It draws nothing.** No surface, no line, no padding: a width and a snap point. Whatever is
visible in the cell came from what you put in it.

**Do / Don't**
- **Do** put one per item, and let the card, the tile or the figure sit inside it.
- **Don't** set the width here. The row owns it, through `itemWidth`, so a rail of cells is one
  decision rather than one per cell.
- **Don't** reach for it outside an `ArenaScroller`. Outside a row it is a box that reads a
  property nothing set.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
