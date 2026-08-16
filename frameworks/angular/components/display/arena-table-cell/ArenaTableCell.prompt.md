One cell of an `arena-table-row`. It draws the cell box, the padding, the alignment and the
mono/gold treatment its column asks for, and in card mode either a label/value pair or a
full-width block, and shows whatever you put in it.

```html
<arena-table-cell>{{ d.p95 }}</arena-table-cell>
<arena-table-cell><arena-badge tone="danger" dot>Failed</arena-badge></arena-table-cell>
<arena-table-cell><arena-button variant="ghost" size="sm">Details</arena-button></arena-table-cell>
```

<!-- @api GENERATED from contracts/api/components/ArenaTableCell.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `content` | slot |  |  | What the cell shows: a value, or one of Arena's own components, such as an ArenaBadge for a status or an ArenaButton for an action. This is what the compound shape exists for. The consumer instantiates one element per cell, so nothing here is per-item projection. |

<!-- @api end -->

**Do / Don't**
- Put a value in it, or one of Arena's own components: an `arena-badge` for a status, an
  `arena-button` for an action. This is why the table is a compound primitive at all: a
  column's render function would be per-item projection, which this library does not do, but
  a cell **you** instantiate is just an element you wrote.
- Don't set alignment, width or the mono face here. Those are the column's, so a column stays
  consistent down its whole length; a cell that styled itself would drift from its header.
- Don't add a `role` or a `tabindex`. `role="gridcell"` and the roving tab stop belong to the
  enclosing grid and are read from the shared state; adding your own would put a second tab
  stop inside a composite that must have exactly one.
- A control you put in a cell **is** a page-level tab stop, and that is deliberate. Arena
  cannot silence markup it does not own, and silencing it would take away a route a keyboard
  user has. Reaching it must cost exactly one Tab; step 2 of the by-hand checklist in
  `ArenaTable.prompt.md` is the standing check.
- Don't use it outside an `arena-table-row`. It injects that row's state, so outside one it
  is a DI error rather than a cell that quietly renders wrong.

### What is shared, and therefore not yours

Its column, its layout and its place in the grid's keyboard order come from `ArenaTableState` and
`ArenaTableRowState`, which the table and the row provide and this component injects. None of it
is a member of `contracts/api/components/ArenaTableCell.json`, and a consumer never writes one.
The cell's whole API is what you project into it.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
