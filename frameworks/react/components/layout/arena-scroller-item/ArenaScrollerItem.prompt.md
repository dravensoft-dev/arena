One cell of an `ArenaScroller`: the box that carries the width the row decided and the point the
row settles on.

```tsx
<ArenaScroller label="Recently landed lots" className="arena-scroller-item-lg">
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

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`scroller-item`](../../../../VOCABULARY.md#scroller-item): `arena-scroller-item-lg`, `arena-scroller-item-md` (default), `arena-scroller-item-sm`. Write one as `className="arena-scroller-item-lg"` on the component, or on a container whose components should all take it. Property: `--arena-scroller-item`, set on a container of yours for a value no option names.

<!-- @answers end -->

**Why the cell is a component rather than a rule on the row's children.** A row cannot reach inside its children to size them. The width has to land on the child itself. A child that is an Arena component may render no box of its own. A `> *` rule then lands on the card in one layer and on nothing in the other. The two layers lay the same markup out differently, with every gate green. The item is the box both layers agree about.

**The item draws nothing.** No surface, no line and no padding: a width and a snap point. Whatever is
visible in the cell came from what you put in it.

**Do / Don't**
- **Do** put one per item, and let the card, the tile or the figure sit inside it.
- **Don't** set the width here. The row owns it, through the `arena-scroller-item` class on the `ArenaScroller` or `--arena-scroller-item` on a container, so a rail of cells is one
  decision rather than one per cell. A bare child of the row, with no item around it, keeps its own width.
- **Don't** reach for it outside an `ArenaScroller`. Outside a row it is a box that reads a
  property nothing set.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena-to-prod --audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
