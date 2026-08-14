One row of an `ArenaTable`. Write one per row, with one `ArenaTableCell` inside it per cell. It only makes sense as a child of `ArenaTable`, which injects where the row sits, which columns its cells are set against, and how the keyboard reaches them.

```tsx
<ArenaTableRow key={d.build} interactive onClick={() => openDeploy(d)}>
  <ArenaTableCell>{d.build}</ArenaTableCell>
  <ArenaTableCell>{d.project}</ArenaTableCell>
  <ArenaTableCell><ArenaBadge tone="success" dot>Deployed</ArenaBadge></ArenaTableCell>
</ArenaTableRow>
```

<!-- @api GENERATED from contracts/api/components/ArenaTableRow.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `children` | slot |  |  | The row's cells. One ArenaTableCell per cell; a row may carry fewer or more than there are columns, and the grid's cursor is clamped against what is really there. |
| `interactive` | primitive | `boolean` | `false` | Whether the row can be activated. A boolean rather than "is `click` bound?": Arena never derives what it draws from what a consumer listens for, because an outbound member's subscriber list is private in at least one platform and a consumer's binding leaves nothing in the DOM to detect, so deriving the interactive shape from it is a divergence waiting to happen, and it was one. Below --bp-md the row is a card, and an interactive card is a role="button" tab stop with an Enter/Space handler; a non-interactive one is inert, because a dead tab stop on every row of every table is worse than the gap it would close. |
| `disabled` | primitive | `boolean` | `false` | Whether the row is drawn but cannot be activated: a record the consumer's rules lock. It reflects through `aria-disabled` rather than the native attribute, and the card shape stays a role="button" in the tab order rather than leaving it, because a disabled control nobody can reach is a control nobody knows exists. With no `click` there is nothing to disable and the row is inert already. |
| `onClick` | event |  |  | The row was activated, by pointer or by Enter on one of its cells. No payload, because the consumer wrote this element and already holds the row this is about. |

<!-- @api end -->

**Do / Don't**
- Put `key` on the row. It is React's own reconciliation, not an Arena member; `ArenaTable` has no `getRowKey`.
- `onClick` takes no argument. You wrote this element inside your own `.map()`, so you already hold the row it is about; a payload would hand you back what you just had.
- Cells are **positional**: the nth `ArenaTableCell` reads the nth entry of `ArenaTable`'s `columns`. Keep them in the same order.
- Don't write a bare `<td>` or a `<div>` as a child. `ArenaTableRow` injects a cell's column, layout and keyboard props into each child, and only `ArenaTableCell` knows what to do with them.
- Don't reach for the row to style a cell: alignment, width and the mono/gold treatment are the **column's**, so they stay the same all the way down.
- **Pass `interactive` alongside `onClick`, or the row is inert.** The flag is what makes the card shape a `role="button"` tab stop with an Enter/Space handler; without it the row draws and activates nothing. It is a member rather than "is `onClick` bound?" because no render follows from whether a listener is bound: derived that way, a clickable card row renders pointer-only in a layer that cannot ask the question, and nothing says so.
- Wire it only when the whole row means something to activate. A row with one actionable thing in it wants an `ArenaButton` in a cell instead, and a table whose rows are all `interactive` puts a tab stop on every one of them.
- **A control inside a cell keeps its own activation.** A selection checkbox in the first column and a row action in the last are the canonical table, so an activation that starts on a link, a button, a field or anything carrying an interactive role does not reach the row: the checkbox ticks and the reader stays where they are, and the action fires once rather than twice. Only a press that lands on the row itself activates it.

### What is injected, and therefore not yours

`rowIndex`, `columns`, `layout`, `cursorCol`, `gridFocused` and `onCellFocus` arrive from `ArenaTable` through `cloneElement`. They are not part of this component's API, are not in `contracts/api/components/ArenaTableRow.json`, and a consumer never writes one, in the same shape as `ArenaRadioGroup` injecting `name`/`checked`/`onSelect` into each `ArenaRadio`.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
