One row of an `arena-table`. Write one per row, with one `arena-table-cell` inside it per
cell. It only makes sense inside a table: it injects the shared `ArenaTableState`, and outside one
that is a DI error rather than a silently inert row.

```html
<arena-table-row interactive (click)="openDeploy(d)">
  <arena-table-cell>{{ d.build }}</arena-table-cell>
  <arena-table-cell>{{ d.project }}</arena-table-cell>
  <arena-table-cell><arena-badge tone="success" dot>Deployed</arena-badge></arena-table-cell>
</arena-table-row>
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
- Don't write a bare element as a child. A row's cells are read as `arena-table-cell`
  components, and anything else renders but takes no column, no alignment and no place in
  the keyboard order.
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

### Why this one is not host-bound

Every other primitive in this family binds its root slot onto the host. This one renders a
real element inside a bare host, for the same reason `arena-button` does: an Angular output
named after a native DOM event is delivered **twice**: once as the output and once as the
bubbled DOM event Angular also listens for. Measured on this component rather than inherited:
with the inner element's `stopPropagation()` removed, one pointer click reaches the consumer
**2** times, and a `disabled` row activates, because the native path never passes the guard.
The inner element is where that event is stopped, which is what makes both routes single and
both refusable, and the count is asserted so it cannot drift back.

### Card mode is pointer-only here, and that is a divergence

Below `--bp-md` the row renders as a card with **no role and no tab stop**, so a row carrying
`(click)` is reachable by pointer and not by keyboard. The row cannot decide the shape from
whether anything is listening, which no render may follow from, and
`OutputEmitterRef.listeners` is private here anyway. Making every card row a button instead would
put a dead tab stop on every row of every table that is not clickable. The binding declares
`divergesFrom: "button"`, and the bounded consequence is that a card row with `(click)` bound
is pointer-only below `--bp-md`. `arena-calendar-event` hit the same wall and resolved it the
OPPOSITE way, which is the useful contrast: a chip is `tabindex="-1"` and never a page tab stop,
so always-a-button costs no dead stop there, where always-a-div would delete Enter-into-the-chip.

### What is shared, and therefore not yours

Where the row sits, which columns its cells are set against, and where the grid's cursor is
all live on `ArenaTableState`, which the table provides and this component injects. None of it is
a member of `contracts/api/components/ArenaTableRow.json`, and a consumer never writes one, the
same shape as `arena-radio` pulling its group's state. Nothing is pushed down: the child asks.
