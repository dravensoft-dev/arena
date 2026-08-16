The frame of a board: columns side by side, sharing the room equally and never narrower than
`minColumn`, scrolling sideways once they no longer fit. It is one tab stop with a group role and
a name, which is what makes a scrolling region reachable by keyboard at all.

```tsx
<ArenaBoard label="Sprint 32 tasks by status">
  {STATUSES.map((status) => (
    <ArenaBoardColumn key={status} title={status} count={byStatus[status].length}
      colorId={SLOT[status]}
      action={<ArenaIconButton icon="ph-bold ph-plus" label={`Add to ${status}`} size="sm" />}
      footer={<ArenaButton variant="ghost" size="sm" icon="ph-bold ph-plus">New</ArenaButton>}>
      {byStatus[status].map((task) => <TaskCard key={task.id} task={task} />)}
    </ArenaBoardColumn>
  ))}
</ArenaBoard>
```

**The cards are yours.** A board's card carries the product's own fields, so Arena draws the
frame, the column and its head, and stops. `ArenaCard` is a good card; so is your own.

**Nothing moves.** There is no drag and drop here, and reordering is the consumer's: what a card
does when it is picked up is a question about their data, not about this frame.

<!-- @api GENERATED from contracts/api/components/ArenaBoard.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | Names the board to assistive technology: what the columns are columns OF. "Sprint 32 tasks by status", never "Board". Required and guarded at runtime after trimming, the shape ArenaScroller.label carries for the same reason, since a group announced as a group tells a reader that focus moved and nothing about where it landed. |
| `children*` | slot |  |  | The columns, one ArenaBoardColumn each. Required and guarded at runtime: a board with no columns is a tab stop over nothing, which is the dead stop a component with a group role must not ship. |
| `minColumn` | primitive | `string` | `"var(--grid-min)"` | The narrowest a column may be before the board scrolls rather than squeezing. Columns share the room equally above it, so a board of four fills the width it is given and a board of twelve scrolls. It is a length rather than a step on the spacing scale, for the reason ArenaGrid.min is one: this is page geometry and the spacing scale models rhythm. The default is the same role a grid's cell reads, so a card is one width across a wall, a rail and a board. |

<!-- @api end -->

**Do / Don't**
- Say what the columns are columns OF in `label`: "Sprint 32 tasks by status", "Candidates by
  stage". It is the name a keyboard user lands on, and "Board" tells them nothing.
- Raise `minColumn` when a card needs more room than a grid cell, and leave it alone otherwise:
  the default is the same width a card takes in a grid or a rail.
- Don't wrap it in your own scroll container. The board is the scrolling region, and a second one
  around it takes the keyboard's scroll away from the one that announces itself.
- Don't use it for a fixed set of panels that always fit. That is `ArenaGrid`, which wraps rather
  than scrolling.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
