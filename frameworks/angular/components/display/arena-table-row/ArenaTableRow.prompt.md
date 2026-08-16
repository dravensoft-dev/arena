One row of an `arena-table`. It is an **attribute on a real `<tr>`**, not an element of its own,
and its cells are attributes on real `<td>`s. Write one per row. It only makes sense inside a table:
it injects the shared `ArenaTableState`, and outside one that is a DI error rather than a silently
inert row.

```html
<tr arena-table-row interactive (click)="openDeploy(d)">
  <td arena-table-cell>{{ d.build }}</td>
  <td arena-table-cell>{{ d.project }}</td>
  <td arena-table-cell><arena-badge tone="success" dot>Deployed</arena-badge></td>
</tr>
```

<!-- @api GENERATED from contracts/api/components/ArenaTableRow.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `content` | slot |  |  | The row's cells. One ArenaTableCell per cell; a row may carry fewer or more than there are columns, and the grid's cursor is clamped against what is really there. |
| `interactive` | primitive | `boolean` | `false` | Whether the row can be activated. A boolean rather than "is `click` bound?": Arena never derives what it draws from what a consumer listens for, because an outbound member's subscriber list is private in at least one platform and a consumer's binding leaves nothing in the DOM to detect, so deriving the interactive shape from it is a divergence waiting to happen, and it was one. Below --bp-md the row is a card, and an interactive card is a role="button" tab stop with an Enter/Space handler; a non-interactive one is inert, because a dead tab stop on every row of every table is worse than the gap it would close. |
| `disabled` | primitive | `boolean` | `false` | Whether the row is drawn but cannot be activated: a record the consumer's rules lock. It reflects through `aria-disabled` rather than the native attribute, and the card shape stays a role="button" in the tab order rather than leaving it, because a disabled control nobody can reach is a control nobody knows exists. With no `click` there is nothing to disable and the row is inert already. |
| `click` | event |  |  | The row was activated, by pointer or by Enter on one of its cells. No payload, because the consumer wrote this element and already holds the row this is about. |

<!-- @api end -->

**Do / Don't**
- `(click)` takes no payload. You wrote this element inside your own `@for`, so you already
  hold the row it is about; a payload would hand you back what you just had.
- Cells are **positional**: the nth `arena-table-cell` reads the nth entry of the table's
  `columns`. Keep them in the same order.
- Don't write a bare `<td>` as a child. A row's cells are read as `arena-table-cell`
  components, and a `<td>` without the attribute renders but takes no column, no alignment and no
  place in the keyboard order.
- Don't reach for the row to style a cell: alignment, width and the mono/gold treatment are
  the **column's**, so they stay the same all the way down.
- `disabled` draws the row and refuses to activate it, by either route: the pointer and the
  grid's `Enter`. It reflects through `aria-disabled` rather than the native attribute, so a
  locked row still announces itself. With no `(click)` there is nothing to disable and the
  row is inert already.
- **Pass `interactive` alongside `(click)`, or the row is inert.** The flag is what makes the card
  shape a `role="button"` tab stop with an Enter/Space handler. It exists because this layer cannot
  ask whether an output has subscribers -- `OutputEmitterRef.listeners` is private -- so the shape
  has to be declared rather than detected. Before it existed, a clickable card row here was
  reachable by pointer and not by keyboard.
- Wire `(click)` only when the whole row means something to activate. A row with one
  actionable thing in it wants an `arena-button` in a cell instead; see the keyboard note
  below.
- **A control inside a cell keeps its own activation.** A selection checkbox in the first
  column and a row action in the last are the canonical table, so an activation that starts on
  a link, a button, a field or anything carrying an interactive role does not reach the row:
  the checkbox ticks and the reader stays where they are, and the action fires once rather
  than twice. Only a press that lands on the row itself activates it.

### Why it is an attribute on a `<tr>` and not an element of its own

A `<tr>` is a row without being told so, and the shape that keeps that is the one where the element
you write IS the row. An `<arena-table-row>` wrapping a `<tr>` does not work, and the reason is worth
having before you reach for it: `display: contents` fixes the **box** tree, not the **DOM** tree, so
a `<tr>` that is not a DOM child of `<tbody>` never forms the native mapping at all -- and under
server rendering it is worse, because the markup is serialized and re-parsed and the HTML parser
foster-parents a non-table element straight out of the table.

### Why the pointer handler is not in the host block

An Angular output named after a native DOM event collides with a host listener for that event, and
the collision was measured here rather than guessed: with `'(click)'` in the `host` block, the
listener is wired to this component's own `click` **output**, so `emit()` re-enters the handler. The
listener is therefore added to the host element directly, in the constructor, which also puts it
**before** the one Angular adds for the consumer's own `(click)`. That order is what makes
`stopImmediatePropagation()` work: it is what stops a native click on a cell being delivered a second
time alongside the output, and what keeps a press that started on a control inside the row from
reaching the row at all. One is the only passing number and two is the defect, and the count is
asserted so it cannot drift back.

### Card mode is a button when the row says so, and presentational when it does not

Below `--bp-md` the row is still a `<tr>` -- one set of elements is authored and the width that
decides the shape changes at runtime, so the markup cannot change with it -- and CSS restyles it into
a card. `interactive` decides what that card is: with it, a `role="button"` tab stop with an Enter and
Space handler, which is the binding's `card-interactive` case; without it, `role="presentation"` and
no tab stop, which is `card-inert`. The presentation role is a removal rather than an affordance: it
takes back the row mapping the element carries natively, so nothing describes a stack of cards as a
table. The shape follows the member and never whether anything is listening, which no render may follow from and
which `OutputEmitterRef.listeners` could not answer here anyway. That is the whole reason
`interactive` is a member rather than an inference: making every card row a button would put a
dead tab stop on every row of every table that is not clickable, and deriving it from a bound
`(click)` would make the row's shape depend on a subscriber list the platform keeps private.
`arena-calendar-event` answers the same question the other way, which is the useful contrast: a
chip is `tabindex="-1"` and never a page tab stop, so always-a-button costs no dead stop there,
where always-a-div would delete Enter-into-the-chip.

### What is shared, and therefore not yours

Where the row sits, which columns its cells are set against, and where the grid's cursor is
all live on `ArenaTableState`, which the table provides and this component injects. None of it is
a member of `contracts/api/components/ArenaTableRow.json`, and a consumer never writes one, the
same shape as `arena-radio` pulling its group's state. Nothing is pushed down: the child asks.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
