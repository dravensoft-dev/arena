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
| `href` | primitive | `string` |  | Present => the cell draws an <a> around its content, inside its own box, which is where HTML admits one and why this member is the cell's rather than the row's: an anchor wrapping a row would break the row/cell structure the grid is made of, and may not contain the button a cell's own contract invites. It carries the settled anchor convention rather than restating it, the fifth member to do so after ArenaCard.href, ArenaCommand.route, ArenaCrumb.href and ArenaSideNavItem.href: a primary click with no modifier is cancelled and reported through `navigate`, so a router owns it, and ctrl, meta, shift, alt, a middle click and a context menu stay the browser's and report nothing. The anchor is a tab stop of its own, which is the answer this table already gives for a control a consumer puts in a cell, so it is one Tab from the cell rather than a step-in the grid does not have. Inside a row carrying `interactive` the anchor wins and the row does not fire, because a press that lands on a control inside the row was never the row's. It survives both shapes: below --bp-md the anchor is still an anchor and does not compete with the row's role="button", by the same predicate. |
| `onNavigate` | event |  |  | The cell's anchor was activated by the one activation a router owns, a primary click with no modifier, and Arena has already cancelled the anchor's own navigation by the time it fires; a modified click, a middle click and a context menu are the browser's and do not fire it at all. No payload, because the consumer wrote this element and already holds what it is about, the same shape as ArenaTableRow.click. It is `navigate` rather than a `click` because the cell has no other activation to report: with no `href` there is no anchor, and an event that only ever fires for one member is named after what that member does. |

<!-- @api end -->

**Do / Don't**
- Put a value in it, or one of Arena's own components: an `ArenaBadge` for a status, an `ArenaButton` for an action. This member is why `ArenaTable` is a compound component at all: a column-level `render` function would be per-item projection, which the library does not do, where a cell **you** instantiate is just an element you wrote.
- Don't set alignment, width or the mono face here. Those are the column's, so a column stays consistent down its whole length; a cell that styled itself would drift from its header.
- Don't add a `role` or a `tabIndex`. `role="gridcell"` and the roving tab stop belong to the enclosing `ArenaTable`'s grid and are injected; adding your own would put a second tab stop inside a composite that must have one.
- A control you put in a cell **is** a page-level tab stop, and that is deliberate. Arena cannot silence markup it does not own, and silencing it would take away a route a keyboard user has. Reaching it must cost exactly one Tab; step 2 of "Verifying the grid by hand" in `ArenaTable.prompt.md` is the standing check.
- Don't use it outside an `ArenaTableRow`. It renders, but with no column it has no alignment, no header to pair with in card mode, and no place in the keyboard order.

### `href` makes the cell a real destination, and the row keeps its own

`href` draws an `<a>` around the cell's content, inside the cell box. That is the one place HTML
admits it: an anchor around the whole row would break the row and cell structure the grid is made
of, and an anchor may not contain the `ArenaButton` a cell's own contract invites into it.

```tsx
<ArenaTableCell href={`/sales/${sale.id}`} onNavigate={() => navigate(`/sales/${sale.id}`)}>
  {sale.number}
</ArenaTableCell>
```

It carries the anchor convention the four members before it carry, and does not restate it: a
**primary click with no modifier** is cancelled and reported through `onNavigate`, so your router
owns it; ctrl, meta, shift, alt, a middle click and a context menu stay the browser's and report
nothing at all, because the reader asked for a new tab or for the address.

**Inside a row carrying `interactive`, the anchor wins and the row does not fire.** That is not a
special case written for this member: it is the same rule the row already applies to a checkbox or a
button you put in a cell, that a press landing on a control inside the row was never the row's. So a
table can have a link in its first column and a clickable row under it, and one press runs one
destination. A cell with no `href` in the same row still activates it.

**The anchor is a tab stop of its own**, one Tab from the cell rather than a step-in the grid does
not have, which is the answer this table already gives for any control you draw in a cell. The
grid's `Enter` is the cell's and still activates the row; the anchor's `Enter` is the anchor's.

### What is injected, and therefore not yours

`column`, `layout`, `tabIndex`, `focused` and `onCellFocus` arrive from `ArenaTableRow` (fed by `ArenaTable`) through `cloneElement`. They are not part of this component's API, are not in `contracts/api/components/ArenaTableCell.json`, and a consumer never writes one, in the same shape as `ArenaRadioGroup` injecting `name`/`checked`/`onSelect` into each `ArenaRadio`.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
