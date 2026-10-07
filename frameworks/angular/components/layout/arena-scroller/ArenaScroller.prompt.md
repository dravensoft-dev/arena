Arena scroller, the honest carousel: a row that scrolls, with no arrows pretending to be a
slideshow. Standalone, `OnPush`, signal I/O. The host **is** the scrolling region, so
`<arena-scroller>` is the element you place, and it is one tab stop with a group role and a name.

```html
<arena-scroller label="Recently landed lots" class="arena-scroller-item-lg">
  @for (lot of arrivals(); track lot.id) {
    <arena-scroller-item><app-lot-card [lot]="lot" /></arena-scroller-item>
  }
</arena-scroller>
```

<!-- @api GENERATED from contracts/api/components/ArenaScroller.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | Names the row to assistive technology, and nothing else supplies it: a group announced as a group tells a reader that focus moved and nothing about where it landed. Required, and guarded at runtime after trimming, the shape ArenaTable.label carries for the same reason, since the value the guard exists to catch is a present and useless one. |
| `content*` | slot |  |  | The items in the row, one per child. Nothing is wrapped: a child is laid out exactly as it was written. An ArenaScrollerItem is laid out at the width the scroller-item family names, and a bare child at its own. Required, and guarded at runtime: an empty row is a tab stop over nothing, which is the dead stop a component with a group role must not ship. |
| `behaviour` | enum | `ArenaScrollerBehaviour` | `"snap"` | Whether the row settles on an item or wherever it was left. Snap by default, because a rail of equal-width cards left halfway across one is a card the reader has to finish scrolling by hand. Nothing moves on its own under either value, so neither answers prefers-reduced-motion and no pause control is owed. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`scroller-item`](../../../../VOCABULARY.md#scroller-item): `arena-scroller-item-lg`, `arena-scroller-item-md` (default), `arena-scroller-item-sm`. Write one as `class="arena-scroller-item-lg"` on the component, or on a container whose components should all take it. Property: `--arena-scroller-item`, set on a container of yours for a value no option names.

<!-- @answers end -->

<!-- @keys GENERATED from the behaviour binding and its pattern. Edit the binding or the pattern, not this list. -->

**Keys.** This component binds [`scrollable-region`](../../../../../contracts/behaviour/scrollable-region.json), which names no key.

<!-- @keys end -->

**Nothing moves on its own.** `snap` and `flow` both describe where a scroll SETTLES, not anything
that animates: `snap` lands on an item, `flow` lands wherever the reader left it. Nothing moves on its own, so no pause control is owed under WCAG 2.2.2 and `prefers-reduced-motion` has nothing to answer here.

**The `arena-scroller-item` class on the row reaches the `arena-scroller-item` children it holds**, because the row is transparent and the item is the box that reads the width. Write `arena-scroller-item-sm`, `-md` or `-lg` on the scroller, or `--arena-scroller-item` on a container for a width no step names. Each item is laid out at that width exactly as it was written; nothing is wrapped. **A bare child keeps its own width**: wrap each card in an `arena-scroller-item` for the row to size it. A style plugin re-answers the steps for every row at once.

**`label` is required and guarded after trimming.** Focus lands on the row itself, and a group
announced as a group tells a reader that focus moved and nothing about where. The content slot is required and guarded too, because an empty row is a tab stop over nothing. The guard runs once the projected content is there rather than at construction, which is the only moment it can be counted.

**Do / Don't**
- **Do** give it a label that says what the row holds, not what it is. "Recently landed lots" is a
  name; "Scrolling row" is the role read twice.
- **Do** leave the `arena-scroller-item` class off unless the row genuinely wants a different card from the page's
  grid. The default, `md`, is the width a card takes in a grid, so the two agree.
- **Don't** reach for it when everything fits. A scroll container that never scrolls is a tab stop
  the reader gains nothing from.
- **Don't** wrap the children in cells of your own other than `ArenaScrollerItem` to set their width. The width is what the `arena-scroller-item` class is, and a wrapper puts a box between the row and the card it is laying out.

**By hand, in real Chromium.** Run `bun run demos` and open `/frameworks/angular/components/layout/arena-scroller/ArenaScroller.demo.generated.html`: - Tab into the row. The row takes focus as one stop and shows the focus ring, and the arrow keys scroll it.
- Under `snap`, releasing a drag mid-item settles on an item edge; under `flow` it stays put.
- Every `arena-scroller-item` is the same width whatever it contains, and a bare child keeps its own.
- With a screen reader running, focus on the row announces the label rather than the word group
  alone.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
