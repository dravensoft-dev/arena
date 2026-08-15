One cell of an `ArenaTableRow`. It draws the cell box, the padding, the alignment and the mono/gold treatment its column asks for, and in card mode either a label/value pair or a full-width block, and shows whatever you put in it.

```tsx
<ArenaTableCell>{d.p95}</ArenaTableCell>
<ArenaTableCell><ArenaBadge tone="danger" dot>Failed</ArenaBadge></ArenaTableCell>
<ArenaTableCell><ArenaButton variant="ghost" size="sm">Details</ArenaButton></ArenaTableCell>
```

<!-- @api GENERATED from contracts/api/components/ArenaTableCell.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `children` | slot |  |  | What the cell shows: a value, or one of Arena's own components, such as an ArenaBadge for a status or an ArenaButton for an action. This is what the compound shape exists for. The consumer instantiates one element per cell, so nothing here is per-item projection. |

<!-- @api end -->

**Do / Don't**
- Put a value in it, or one of Arena's own components: an `ArenaBadge` for a status, an `ArenaButton` for an action. This member is why `ArenaTable` is a compound component at all: a column-level `render` function would be per-item projection, which the library does not do, where a cell **you** instantiate is just an element you wrote.
- Don't set alignment, width or the mono face here. Those are the column's, so a column stays consistent down its whole length; a cell that styled itself would drift from its header.
- Don't add a `role` or a `tabIndex`. `role="gridcell"` and the roving tab stop belong to the enclosing `ArenaTable`'s grid and are injected; adding your own would put a second tab stop inside a composite that must have one.
- A control you put in a cell **is** a page-level tab stop, and that is deliberate. Arena cannot silence markup it does not own, and silencing it would take away a route a keyboard user has. Reaching it must cost exactly one Tab; step 2 of "Verifying the grid by hand" in `ArenaTable.prompt.md` is the standing check.
- Don't use it outside an `ArenaTableRow`. It renders, but with no column it has no alignment, no header to pair with in card mode, and no place in the keyboard order.

### What is injected, and therefore not yours

`column`, `layout`, `tabIndex`, `focused` and `onCellFocus` arrive from `ArenaTableRow` (fed by `ArenaTable`) through `cloneElement`. They are not part of this component's API, are not in `contracts/api/components/ArenaTableCell.json`, and a consumer never writes one, in the same shape as `ArenaRadioGroup` injecting `name`/`checked`/`onSelect` into each `ArenaRadio`.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
