The grid that picks its own column count from the room it is in, so nobody has to pick a
breakpoint. Cells are as wide as they can be at or above `min`, and the count falls as the room
does, all the way to one.

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
| `min` | primitive | `string` | `"calc(var(--sp-1) * 50)"` | The narrowest a cell may be before the count drops. It is the one number this component takes and it is page geometry rather than a step on the spacing scale, which models rhythm and not the width of a card. It is clamped against the container, so a minimum wider than the room available yields one full-width column instead of overflowing it. |
| `gap` | enum | `ArenaGridGap` | `"md"` | The air between cells, on both axes. Named steps rather than a length, because rhythm is what the spacing scale is for and a grid is where a hand-picked one shows worst. Its steps are the page rhythm scale itself, so sm groups related cells, md sets two peers apart and lg reads as two sections, and none closes the gap entirely; a grid is that rhythm plus a grid, and nothing here is a number this component chose. |
| `maxWidth` | primitive | `string` |  | A ceiling on the grid's own width, centred in whatever contains it. Absent, it fills its container, which is what a grid nested inside a page should do; a page's own reading width is what this is for. |
| `children` | slot |  |  | The cells, one per child. Nothing is wrapped and nothing is measured: a child is a grid item exactly as it was written, so a card, a chart or a definition list all lay out the same way. |

<!-- @api end -->

**It replaces a hand-written column list, not a `minmax(0, 1fr)` in one.** A fixed column count
needs a threshold, and a threshold is a number somebody invented: six filter bars written by hand
end up with three different ones and none of them matches `--bp-*`. Here the floor is `min` and it
is clamped with `min(<min>, 100%)`, so a minimum wider than the container gives one full-width
column rather than an overflow.

`gap` is four named steps, `none`, `sm`, `md`, `lg`, and not a length. Rhythm is what the spacing
scale is for, and a grid is where a hand-picked gap shows worst: two grids on one page with gaps a
step apart read as a mistake.

`maxWidth` caps the grid and centres it. Leave it off inside a page and set it on the one grid that
is the page's own reading width.

**Do / Don't**
- **Do** give it real children. Every child is one cell exactly as written; nothing is wrapped, so
  an `ArenaCard`, a chart and a definition list all land the same way.
- **Do** reach for it for a page's own layout. A component that has to fit the room it was given
  measures its container with `useArenaContainerWidth`, which is a different question.
- **Don't** use it for a row of two or three controls. That is a flex row, and a grid there gives
  every control the same width whether or not that helps.
- **Don't** put a `min` on it that no card ever reaches. The count only drops when the room runs
  out, so a minimum nobody meets pins the grid at one column forever.
- **Don't** nest one to make a two-level layout. Two grids nested pick their counts independently
  and the cells stop lining up; give the outer one the cells it actually has.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
