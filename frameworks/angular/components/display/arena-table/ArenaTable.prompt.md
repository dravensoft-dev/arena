Arena data table for dense surfaces: headers in mono/uppercase, rows separated by a
hairline. Standalone, `OnPush`, signal inputs.

It is a **compound** primitive: `columns` says how each column is headed and set, and you
write one `<arena-table-row>` per row with one `<arena-table-cell>` per cell inside it.
Cells are **positional**: the nth cell takes the nth column.

```html
<arena-table [label]="'Recent deployments'" [columns]="columns">
  @for (d of deploys(); track d.build) {
    <arena-table-row interactive (click)="openDeploy(d)">
      <arena-table-cell>{{ d.build }}</arena-table-cell>
      <arena-table-cell>{{ d.project }}</arena-table-cell>
      <arena-table-cell><arena-badge [tone]="d.tone" dot>{{ d.status }}</arena-badge></arena-table-cell>
    </arena-table-row>
  }
  <span empty>No deployments in this range.</span>
</arena-table>
```

<!-- @api GENERATED from contracts/api/components/ArenaTable.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | Names the grid for assistive technology. Required, and guarded at runtime: nothing can derive it; ArenaCalendar names its grid from the range it is showing, and a data table's subject is editorial. Say what the rows are, never "ArenaTable". |
| `columns*` | array | `readonly ArenaTableColumn[]` |  | The columns, in order. A column heads and sets its cells; it never says what goes in them. |
| `content` | slot |  |  | The rows. One ArenaTableRow per row. Where a row sits, the columns its cells are set against and how the keyboard reaches them are ArenaTable's to decide and no row's to declare; how that reaches a row is each layer's own idiom. |
| `empty` | slot |  |  | What shows when no row is written. In that state NO grid is drawn at all, header row included: a column head over a "no results" sentence describes a table that is not there, and a role="grid" holding neither a header nor a row is a degenerate render, the same judgement ArenaTabs makes when it draws no panel for a tab that does not exist. Every layer falls back to the string 'No data.' when nothing is given, each in its own idiom for a default. Unlike ArenaTable.label this one IS derivable: 'No data.' states what happened rather than what the component is, which is the distinction that makes a fallback useful here and useless there. A consumer with a better sentence, what to do next or why the list is empty, projects it. |
| `sort` | object | `ArenaTableSort` |  | Which column the rows are ordered by and which way. Controlled: ArenaTable draws the caret and the aria-sort, and the consumer does the ordering, because ArenaTable does not hold the rows. Absent, no header is a sort target. |
| `sortChange` | event | `ArenaTableSort` |  | A sortable header was activated, carrying the column and the direction it should become: the same column flips, a different one starts ascending. ArenaTable never reorders anything itself, so a consumer who ignores this event gets a caret that moves and rows that do not, which is why the member is controlled rather than a starting value. |
| `page` | object | `ArenaTablePage` |  | Which page of a longer list is on screen. Present, ArenaTable draws its own ArenaPagination below the grid and names it from `label`, which is what gives that required name its uniqueness on a page with two paged tables. Absent, no pager is drawn and the projected rows are the whole list. |
| `pageChange` | event | `number` |  | A page was chosen, carrying the new 1-based page. It also fires with 1 when the current page has gone PAST THE END, which is the only reset ArenaTable performs; a filter that leaves the page in range is silent, so returning the reader to page one on a change of criterion stays the consumer's, beside the criterion they hold. |
| `pageControl` | enum | `ArenaTablePageControl` | `"auto"` | Whether ArenaTable draws the pager below the grid. 'auto' draws it whenever `page` is bound, which is what a table showing one list of its own wants; 'none' draws nothing and leaves the consumer to place an ArenaPagination themselves, over this table or over two of them at once. It is a separate member from `page` because the two are separate facts: `page` is what the table KNOWS about a longer list, and this is what it DRAWS about it. Bound together, a consumer who wanted the control elsewhere had to withhold `page` and leave the table knowing nothing about paging at all, which is a member deliberately unbound and a comment explaining why. The same split, and the same reasoning, as `sort` and `sortControl`. |
| `sortControl` | enum | `ArenaTableSortControl` | `"auto"` | How the sort affordance is reached in CARD MODE, where there is no header row to activate and a `sortable` column therefore has no control under it at all. 'auto' draws one compact select above the cards, listing every sortable column in each direction, which is the shape a phone has room for; 'none' leaves card mode unsorted by hand, for a table whose order is the document's rather than the reader's. Above --bp-md the header row is the control and this member draws nothing. The header row does NOT come back below the breakpoint, because card mode exists for the one reason a grid does not fit. It is a member rather than something a consumer draws for themselves because the state it edits, ArenaTableSort, is Arena's: left to each consumer, the label, the option order and the way a direction is worded are invented once per project over a model they did not define. |
| `responsive` | primitive | `boolean` | `true` | ArenaCard mode below --bp-md. Set false only when the columns are meaningless apart. |

<!-- @api end -->

**Do / Don't**
- **`page` is what the table knows and `pageControl` is what it draws.** Bind `[page]` whenever
  the list is longer than the screen, so the table sizes and resets it; pass
  `pageControl="none"` when you want the `arena-pagination` somewhere else, or want one
  control over two tables. Withholding `[page]` to move the control is the shape this member
  exists to replace: it left the table knowing nothing about paging at all.
- `label` is required and names the grid for a screen reader. Say what the rows *are*, as
  in "Recent deployments" or "Team members", and never "Table". Nothing can derive it, which is why
  it **throws** rather than falling back, and why `input.required` alone is not the guard:
  that only proves something was bound, and `[label]="row.title"` with an empty title
  satisfies it.
- Put your own components in a cell: an `arena-badge` for a status, an `arena-button` for
  an action. That is what the compound shape is for; a column carries no render function.
- Numeric data and codes in `mono` columns with `align: 'right'`. `mono` is the mono face and the gold ink together, and the ink is the half that does not travel: gold reads as an identifier, so a total in gold inside a card says the wrong thing. For a figure you draw outside a table, put `.arena-num` on it, which is the same face and the same digit alignment with no colour.
- Mark the actions column `mobileLayout: 'block'`. Its buttons name themselves, and pairing
  them with an "ACTIONS" label reads as a mistake.
- Don't set `responsive="false"` to "keep it looking like a table" on a phone. A table
  narrower than its content is unreadable; card mode is the honest fallback.
- Row activation is `(click)` on the row, and it carries no payload, because you wrote that
  element inside your own `@for`, so you already hold the row it is about.

### Responsive

Below `--bp-md` the table renders one card per row. The threshold is measured on the
table's **container**, never the viewport and never a media query, so a table inside a narrow
panel goes card-mode on a wide monitor, which is what you want. Before anything has been
measured the wide shape renders, so the card shape never flashes on first paint.

### Keyboard

The wide shape is a `role="grid"` with **one** tab stop. Tab reaches the grid, arrows move
by cell (the header row is row 0 and is navigable, as APG prescribes), `Home` and `End` go
to the first and last cell of the **current row**, and `Enter` activates the cursor's row by
emitting that row's `click`. There is no step-in: a control you drew inside a cell keeps its
own place in the page Tab sequence, so nothing you own is silenced.

The grid is **not assumed rectangular**. A row may carry fewer or more cells than there are
columns, and the cursor is clamped against the row it is actually in.

Card mode answers none of this, and it does not have to: a card is a list item, and a list is
traversed with Tab. A card row carrying `interactive` is a `role="button"` tab stop of its own
with an Enter and Space handler, which is `ArenaTableRow`'s `card-interactive` case rather than a
clause of this component's binding. A card row without it is inert, because a dead tab stop on
every row of every table is worse than the gap it would close. The shape follows the member and
never whether anything is listening, which is why `interactive` exists at all.

### Why the wide shape is not a `<table>` element

Angular indexes projection slots in template order and hands the content to the **first**
matching one, so a `wide` branch and a `card` branch cannot each carry their own
`<ng-content>`, because one of the two would always render empty. The rows are therefore projected
once, into a box whose display and role change with the shape, and the wide box is a
`display: table` with `role="grid"` rather than a `<table>`. A native `<table>` would carry
`role="table"` and have to be overridden to `grid` anyway, so nothing is lost there; what a
non-element table costs is `colspan`, so the empty state is a block **beside** the grid box
rather than a cell spanning it. That stopped being a visible cost when the empty state stopped
drawing a grid at all: with no rows there is no header row and no `role="grid"`, only the
block, which is what `contracts/api/components/ArenaTable.json` contracts for the state.
The other cost stands: the box that carries `display: table` sits inside the bordered frame, so the
measured `contentRect` excludes that border and the narrow threshold trips a couple of pixels
earlier than the declared breakpoint. The host itself is a plain block.

**By hand, in a real browser** (`bun run build:angular-demo && bun run demos`, then
`frameworks/angular/components/display/arena-table/ArenaTable.demo.generated.html`). Steps 1–5 were checked in real
Chromium: one Tab in, the gold inset ring on the focused cell, the arrow walk,
`Home`/`End` inside the row, `Enter` on a data row, one Tab out onto the actions button, and
zero roles and zero tab stops in the squeezed card shape. Step 6 and every judgement about how
it *looks* were not, and are why this list stays:
1. Tab reaches the grid ONCE, and one more Tab leaves it. No cell is a stop of its own.
2. From a cell, Tab reaches a control inside a cell in **one** press, not two. Two means the
   grid pulled focus back onto the cell, since `focusin` bubbles and only a real browser shows it.
3. Arrows clamp at all four edges and focus never leaves the grid. `Home`/`End` stay inside
   the current row. Walk a middle row, not only the first.
4. `Enter` activates a row with `(click)` and does nothing on the header row or on the
   disabled row; the page logs what was activated.
5. The squeezed container is already in card mode on load. Confirm nothing there took a
   role, a tabindex or a key handler by accident.
6. The measured width does not oscillate between the two shapes. Narrow the window slowly
   across the threshold and watch it settle rather than flicker.

### Sorting and paging

Both are **controlled**, and for the same reason: `arena-table` does not hold the rows, so it
cannot order them and cannot cut them. It draws the affordance and tells you what was asked.

```html
<arena-table label="Recent deployments" [columns]="columns"
             [sort]="sort()" (sortChange)="sort.set($event)"
             [page]="page()" (pageChange)="goTo($event)">
```

Mark a column `sortable: true` and pass `sort`. Without `sort` no header is a target however
many columns declare it, because a control drawing a direction it does not know is worse than
no control. Activating the sorted column flips it; activating a different one starts it
ascending. It costs **no tab stop**: the header row is already row 0 of the grid's roving
cursor, so Enter and Space act on the cell the reader is already on, and `aria-sort` says which
column and which way.

**Below `--bp-md` the header row is gone, so `sortControl` is the affordance.** With `sort`
bound and at least one `sortable` column, card mode draws one compact select above the cards,
listing every sortable column in each direction, and it reports through the same `sortChange`
the header does. Set it to `none` for a table whose order is the document's rather than the
reader's. The header row does **not** come back below the breakpoint: card mode exists for the
one reason a grid does not fit.

### `ArenaTableSort.column` is an index, and a column that moves takes the order with it

The cells are already positional, so a key would be a second identity for a thing that has one,
and that is the right trade. The price is that moving a column silently reorders the rows,
because the index now names a different column. **Keep the sort field inside the column entry it
belongs to and the two move together:**

```ts
const COLUMNS = [
  { header: 'Customer', sortable: true, field: (s: Sale) => s.customer },
  { header: 'Status' },
  { header: 'Total', sortable: true, field: (s: Sale) => s.total },
];
```

Arena cannot check that, but it does catch the loudest way to get it wrong: a `sort.column`
aimed at a column that declares no `sortable` **warns once**, naming the column it landed on,
instead of drawing no caret and saying nothing.

`page` is `{ index, size, total }`. `total` is the count across every page and is required,
because the rows you project are one page and nothing about the whole list can be read from
them. ArenaTable draws its own `arena-pagination` below the grid and names it from `label`, which is
what makes two paged tables on one dashboard tellable apart.

The one thing ArenaTable emits on its own is `pageChange` with 1, when the total drops far enough
that the current page is **past the end**. It is bounded: a filter that leaves the page valid is
silent, so nothing loops.

**That is not the reset you write beside a filter, and expecting it to be is the mistake this
paragraph exists to stop.** Filter ten pages down to five while the reader is on the third and
the page is still in range, so ArenaTable says nothing and the reader is left on page three of
results they never asked for. ArenaTable cannot tell that from removing one row from page three of
ten, which must move nobody, because a count is all it has. **Whether a change of criterion
returns the reader to page one is yours**, and it belongs beside the criterion:

```ts
setStatus(next: string): void {
  this.status.set(next);
  this.pageIndex.set(1);   // your own signal; `page` is the whole {index, size, total}
}
```

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
