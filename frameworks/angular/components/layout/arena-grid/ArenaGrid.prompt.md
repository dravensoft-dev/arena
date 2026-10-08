Arena grid, the one that picks its own column count from the room it is in so nobody has to pick a
breakpoint. Standalone, `OnPush`, signal I/O. The host **is** the grid, so `<arena-grid>` is the
element you place. A row the items do not fill keeps its empty tracks, so a card on a short last
page is as wide as one on a full page.

```html
<arena-grid class="arena-grid-min-lg arena-grid-gap-group">
  <arena-stat-card label="Open orders" [value]="open()" />
  <arena-stat-card label="Overdue" [value]="overdue()" tone="danger" />
  <arena-stat-card label="Collected today" [value]="collected()" />
</arena-grid>
```

<!-- @api GENERATED from contracts/api/components/ArenaGrid.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `content` | slot |  |  | The cells, one per child. Nothing is wrapped and nothing is measured: a child is a grid item exactly as it was written, so a card, a chart or a definition list all lay out the same way. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`grid-min`](../../../../VOCABULARY.md#grid-min): `arena-grid-min-lg`, `arena-grid-min-md` (default), `arena-grid-min-sm`. Write one as `class="arena-grid-min-lg"` on the component, or on a container whose components should all take it. Property: `--arena-grid-min`, set on a container of yours for a value no option names.

**Answers** [`grid-max`](../../../../VOCABULARY.md#grid-max): `arena-grid-max-lg`, `arena-grid-max-md`, `arena-grid-max-none` (default), `arena-grid-max-sm`. Write one as `class="arena-grid-max-lg"` on the component, or on a container whose components should all take it. Property: `--arena-grid-max`, set on a container of yours for a value no option names.

**Answers** [`grid-gap`](../../../../VOCABULARY.md#grid-gap): `arena-grid-gap-component` (default), `arena-grid-gap-group`, `arena-grid-gap-none`, `arena-grid-gap-section`. Write one as `class="arena-grid-gap-group"` on the component, or on a container whose components should all take it. Property: `--arena-grid-gap`, set on a container of yours for a value no option names.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none.
<!-- @keys end -->

**The component replaces a hand-written column list, not a `minmax(0, 1fr)` in one.** A fixed column count needs a threshold, and a threshold is a number somebody invented. Six filter bars written by hand end up with three different ones, and none of them matches `--bp-*`. Here the floor is the `arena-grid-min` class, `sm`, `md` or `lg`. `--arena-grid-min` on a container takes a width no step names. The floor
is clamped to the container's own width, so a minimum wider than the container gives one full-width
column rather than an overflow. **The component is also the answer to a media query in a `styles:` block.** Such a query cannot read a `var()`. The query has to restate a threshold Arena already holds.

The gap is the named steps of `arena-grid-gap`, `none`, `group`, `component` and `section`, and not a length. `--arena-grid-gap` on a container takes a length or a token derivation for a gap no step names. Rhythm is what the spacing scale is for, and a grid is where a hand-picked gap shows worst. Two grids on one page with gaps a step apart read as a mistake.

`arena-grid-max-sm`, `arena-grid-max-md` or `arena-grid-max-lg` caps the grid and centres it, and `--arena-grid-max` on a container takes a ceiling no step names. The default, `arena-grid-max-none`, sets no ceiling: leave it off inside a page and write a cap on the one grid that
is the page's own reading width. A class on the grid wins over a property on its container.

**Do / Don't**
- **Do** give it real children. Every child is one cell exactly as written; nothing is wrapped, so
  an `arena-card`, a chart and a definition list all land the same way.
- **Do** reach for it for a page's own layout. A component that has to fit the room it was given
  measures its container with `arenaContainerWidth`, which is a different question.
- **Don't** use it for a row of two or three controls. A toolbar is a flex row, and a grid there gives every control the same width whether or not that helps.
- **Don't** give it an `arena-grid-min` width that no card ever reaches. The count only drops when the room runs
  out, so a minimum nobody meets pins the grid at one column forever.
- **Don't** nest one to make a two-level layout. Two grids nested pick their counts independently
  and the cells stop lining up; give the outer one the cells it actually has.
- **Don't** wait for a fixed column count. A photo wall three across and a pair of lesson choices are both `grid-template-columns: repeat(N, 1fr)` on an element of your own, one line each. A count Arena took would contradict what this component is: the number comes from the room rather than from a breakpoint somebody picked. Two products measured wanting one, and neither would
  have written less than the line they wrote.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/angular/components/layout/arena-grid/ArenaGrid.demo.generated.html`:
- Narrow the window from wide to 390px: the count falls one step at a time and never overflows.
- At the narrowest, one column fills the width; the minimum is clamped rather than honoured.
- Each gap is a visibly different step, and both axes get the same one.
- With an `arena-grid-max` class written, the grid centres and stops growing; without one, it fills.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
