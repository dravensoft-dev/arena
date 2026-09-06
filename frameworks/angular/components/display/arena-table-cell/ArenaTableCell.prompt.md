One cell of an `arena-table-row`. The cell is an **attribute on a real `<td>`**, not an element of its own. The cell draws the cell box: the padding, the alignment and the mono or gold treatment its column asks for. In card mode it draws either a label and value pair or a full-width block. The cell shows whatever you put in it.

```html
<td arena-table-cell>{{ d.p95 }}</td>
<td arena-table-cell><arena-badge tone="danger" dot>Failed</arena-badge></td>
<td arena-table-cell><arena-button variant="ghost" size="sm">Details</arena-button></td>
```

<!-- @api GENERATED from contracts/api/components/ArenaTableCell.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `content` | slot |  |  | What the cell shows: a value, or one of Arena's own components, such as an ArenaBadge for a status or an ArenaButton for an action. This is what the compound shape exists for. The consumer instantiates one element per cell, so nothing here is per-item projection. |
| `href` | primitive | `string` |  | Present => the cell draws an <a> around its content, inside its own box, which is where HTML admits one and why this member is the cell's rather than the row's: an anchor wrapping a row would break the row/cell structure the grid is made of, and may not contain the button a cell's own contract invites. It carries the settled anchor convention rather than restating it, the fifth member to do so after ArenaCard.href, ArenaCommand.route, ArenaCrumb.href and ArenaSideNavItem.href: a primary click with no modifier is cancelled and reported through `navigate`, so a router owns it, and ctrl, meta, shift, alt, a middle click and a context menu stay the browser's and report nothing. The anchor is a tab stop of its own, which is the answer this table already gives for a control a consumer puts in a cell, so it is one Tab from the cell rather than a step-in the grid does not have. Inside a row carrying `interactive` the anchor wins and the row does not fire, because a press that lands on a control inside the row was never the row's. It survives both shapes: below --bp-md the anchor is still an anchor and does not compete with the row's role="button", by the same predicate. |
| `navigate` | event |  |  | The cell's anchor was activated by the one activation a router owns, a primary click with no modifier, and Arena has already cancelled the anchor's own navigation by the time it fires; a modified click, a middle click and a context menu are the browser's and do not fire it at all. No payload, because the consumer wrote this element and already holds what it is about, the same shape as ArenaTableRow.click. It is `navigate` rather than a `click` because the cell has no other activation to report: with no `href` there is no anchor, and an event that only ever fires for one member is named after what that member does. |

<!-- @api end -->

**Do / Don't**
- Put a value in it, or one of Arena's own components: an `arena-badge` for a status, an
  `arena-button` for an action. The cell is why the table is a compound primitive at all. A column's render function would be per-item projection, which this library does not do. A cell **you** instantiate is just an element you wrote.
- Don't set alignment, width or the mono face here. Those belong to the column, so a column stays consistent down its whole length. A cell that styled itself would drift from its header.
- Don't add a `role` or a `tabindex`. A `<td>` inside the grid already maps to a gridcell. The roving tab stop belongs to the enclosing grid and is read from the shared state. Adding your own would put a second tab stop inside a composite that must have exactly one.
- A control you put in a cell **is** a page-level tab stop, and that is deliberate. Arena
  cannot silence markup it does not own, and silencing it would take away a route a keyboard
  user has. Reaching it must cost exactly one Tab; step 2 of the by-hand checklist in
  `ArenaTable.prompt.md` is the standing check.
- Don't use it outside an `arena-table-row`. The cell injects that row's state. Outside one it is a DI error, rather than a cell that quietly renders wrong.

### `href` makes the cell a real destination, and the row keeps its own

`href` draws an `<a>` around the cell's content, inside the cell box. The cell is the one place HTML admits it. An anchor around the whole row would break the row and cell structure the grid is made of. An anchor may not contain the `arena-button` a cell's own contract invites into it.

```html
<td arena-table-cell [href]="'/ventas/' + v.id" (navigate)="router.navigate(['/ventas', v.id])">
  {{ v.number }}
</td>
```

The member carries the anchor convention the four members before it carry, without restating it. A **primary click with no modifier** is cancelled and reported through `(navigate)`, so your router owns it. Ctrl, meta, shift, alt, a middle click and a context menu stay the browser's and report nothing at all. The reader asked for a new tab or for the address.

**Inside a row carrying `interactive`, the anchor wins and the row does not fire.** That is not a special case written for this member. The behaviour is the rule the row already applies to a checkbox or a button you put in a cell. A press landing on a control inside the row was never the row's. So a
table can have a link in its first column and a clickable row under it, and one press runs one
destination. A cell with no `href` in the same row still activates it.

**The anchor is a tab stop of its own**, one Tab from the cell rather than a step-in the grid does not have. A tab stop of its own is the answer this table already gives for any control you draw in a cell. The
grid's `Enter` is the cell's and still activates the row; the anchor's `Enter` is the anchor's.

### What is shared, and therefore not yours

The cell's column, its layout and its place in the grid's keyboard order come from `ArenaTableState` and `ArenaTableRowState`. The table and the row provide those, and this component injects them. None of it
is a member of `contracts/api/components/ArenaTableCell.json`, and a consumer never writes one.
The cell's whole API is what you project into it.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component is not a styling surface, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena-to-prod --audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
