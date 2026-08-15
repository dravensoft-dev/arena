Arena scroller, the honest carousel: a row that scrolls, with no arrows pretending to be a
slideshow. Standalone, `OnPush`, signal I/O. The host **is** the scrolling region, so
`<arena-scroller>` is the element you place, and it is one tab stop with a group role and a name.

```html
<arena-scroller label="Recently landed lots" itemWidth="calc(var(--sp-1) * 62)">
  @for (lot of arrivals(); track lot.id) { <app-lot-card [lot]="lot" /> }
</arena-scroller>
```

<!-- @api GENERATED from contracts/api/components/ArenaScroller.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | Names the row to assistive technology, and nothing else supplies it: a group announced as a group tells a reader that focus moved and nothing about where it landed. Required, and guarded at runtime after trimming, the shape ArenaTable.label carries for the same reason, since the value the guard exists to catch is a present and useless one. |
| `content*` | slot |  |  | The items in the row, one per child. Nothing is wrapped: a child is laid out exactly as it was written, at the width itemWidth names. Required, and guarded at runtime: an empty row is a tab stop over nothing, which is the dead stop a component with a group role must not ship. |
| `itemWidth` | primitive | `string` | `"var(--grid-min)"` | How wide each item is laid out, which a rail has to answer and a grid answers with the same role: the width of a card is one decision, and a wall of them and a row of them should not disagree about it. It is a length rather than a step on the spacing scale, for the reason ArenaGrid.min is one, and it reaches the children as a custom property because a row sets its items' width and cannot reach inside them. |
| `behaviour` | enum | `ArenaScrollerBehaviour` | `"snap"` | Whether the row settles on an item or wherever it was left. Snap by default, because a rail of equal-width cards left halfway across one is a card the reader has to finish scrolling by hand. Nothing moves on its own under either value, so neither answers prefers-reduced-motion and no pause control is owed. |

<!-- @api end -->

**Nothing moves on its own.** `snap` and `flow` both describe where a scroll SETTLES, not anything
that animates: `snap` lands on an item, `flow` lands wherever the reader left it. That is why no
pause control is owed under WCAG 2.2.2 and why `prefers-reduced-motion` has nothing to answer here.

**`itemWidth` reaches the children as a custom property on the host**, because a row sets its
items' width and cannot reach inside them. Every child is laid out at that width exactly as it was
written; nothing is wrapped. Its default is `--grid-min`, the same role `arena-grid` reads, so a
wall of cards and a row of the same cards agree about how wide a card is and a voice re-answers
both at once.

**`label` is required and guarded after trimming.** Focus lands on the row itself, and a group
announced as a group tells a reader that focus moved and nothing about where. The content slot is
required and guarded too: an empty row is a tab stop over nothing, and the guard runs once the
projected content is there rather than at construction, which is the only moment it can be counted.

**Do / Don't**
- **Do** give it a label that says what the row holds, not what it is. "Recently landed lots" is a
  name; "Scrolling row" is the role read twice.
- **Do** leave `itemWidth` alone unless the row genuinely wants a different card from the page's
  grid. The role is there so the two agree.
- **Don't** reach for it when everything fits. A scroll container that never scrolls is a tab stop
  the reader gains nothing from.
- **Don't** wrap the children in cells of your own to set their width. That is what `itemWidth` is,
  and a wrapper puts a box between the row and the card it is laying out.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/angular/components/layout/arena-scroller/ArenaScroller.demo.generated.html`:
- Tab into the row: it takes focus as one stop, shows the focus ring, and the arrow keys scroll it.
- Under `snap`, releasing a drag mid-item settles on an item edge; under `flow` it stays put.
- Every child is the same width whatever it contains.
- With a screen reader running, focus on the row announces the label rather than the word group
  alone.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
