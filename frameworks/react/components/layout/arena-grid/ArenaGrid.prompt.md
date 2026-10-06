The grid that picks its own column count from the room it is in, so nobody has to pick a
breakpoint. Cells are as wide as they can be at or above `min`, and the count falls as the room
does, all the way to one. A row the items do not fill keeps its empty tracks, so a card on a
short last page is as wide as one on a full page.

```tsx
<ArenaGrid min="calc(var(--sp-1) * 50)" gap="md">
  <ArenaStatCard label="Open orders" value={open} />
  <ArenaStatCard label="Overdue" value={overdue} tone="danger" />
  <ArenaStatCard label="Collected today" value={collected} />
</ArenaGrid>
```

<!-- @api GENERATED from contracts/api/components/ArenaGrid.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `children` | slot |  |  | The cells, one per child. Nothing is wrapped and nothing is measured: a child is a grid item exactly as it was written, so a card, a chart or a definition list all lay out the same way. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`grid-min`](../../../../VOCABULARY.md#grid-min): `arena-grid-min-lg`, `arena-grid-min-md` (default), `arena-grid-min-sm`. Write one as `className="arena-grid-min-lg"` on the component, or on a container whose components should all take it. Property: `--arena-grid-min`, set on a container of yours for a value no option names.

**Answers** [`grid-max`](../../../../VOCABULARY.md#grid-max): `arena-grid-max-lg`, `arena-grid-max-md`, `arena-grid-max-none` (default), `arena-grid-max-sm`. Write one as `className="arena-grid-max-lg"` on the component, or on a container whose components should all take it. Property: `--arena-grid-max`, set on a container of yours for a value no option names.

**Answers** [`grid-gap`](../../../../VOCABULARY.md#grid-gap): `arena-grid-gap-component` (default), `arena-grid-gap-group`, `arena-grid-gap-none`, `arena-grid-gap-section`. Write one as `className="arena-grid-gap-group"` on the component, or on a container whose components should all take it. Property: `--arena-grid-gap`, set on a container of yours for a value no option names.

<!-- @answers end -->

**The component replaces a hand-written column list, not a `minmax(0, 1fr)` in one.** A fixed column count needs a threshold, and a threshold is a number somebody invented. Six filter bars written by hand end up with three different ones, and none of them matches `--bp-*`. Here the floor is `min` and it
is clamped with `min(<min>, 100%)`, so a minimum wider than the container gives one full-width
column rather than an overflow.

`gap` is four named steps, `none`, `sm`, `md`, `lg`, and not a length. Rhythm is what the spacing scale is for, and a grid is where a hand-picked gap shows worst. Two grids on one page with gaps a step apart read as a mistake.

`maxWidth` caps the grid and centres it. Leave it off inside a page and set it on the one grid that
is the page's own reading width.

**Do / Don't**
- **Do** give it real children. Every child is one cell exactly as written; nothing is wrapped, so
  an `ArenaCard`, a chart and a definition list all land the same way.
- **Do** reach for it for a page's own layout. A component that has to fit the room it was given
  measures its container with `useArenaContainerWidth`, which is a different question.
- **Don't** use it for a row of two or three controls. A toolbar is a flex row, and a grid there gives every control the same width whether or not that helps.
- **Don't** put a `min` on it that no card ever reaches. The count only drops when the room runs
  out, so a minimum nobody meets pins the grid at one column forever.
- **Don't** nest one to make a two-level layout. Two grids nested pick their counts independently
  and the cells stop lining up; give the outer one the cells it actually has.
- **Don't** wait for a fixed column count. A photo wall three across and a pair of lesson choices are both `grid-template-columns: repeat(N, 1fr)` on an element of your own, one line each. A count Arena took would contradict what this component is: the number comes from the room rather than from a breakpoint somebody picked. Two products measured wanting one, and neither would
  have written less than the line they wrote.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena-to-prod --audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
