The frame of a board: columns side by side, sharing the room equally and never narrower than
`minColumn`, scrolling sideways once they no longer fit. Standalone, `OnPush`, signal inputs. The
host IS the board, so it carries the group role, the name and the tab stop that make a scrolling
region reachable by keyboard at all.

```html
<arena-board label="Sprint 32 tasks by status">
  @for (status of statuses(); track status) {
    <arena-board-column [title]="status" [count]="byStatus()[status].length" [colorId]="slot(status)">
      <arena-icon-button action icon="ph-bold ph-plus" [label]="'Add to ' + status" size="sm" />
      @for (task of byStatus()[status]; track task.id) {
        <app-task-card [task]="task" />
      }
      <arena-button footer variant="ghost" size="sm" icon="ph-bold ph-plus">New</arena-button>
    </arena-board-column>
  }
</arena-board>
```

**The cards are yours.** A board's card carries the product's own fields, so Arena draws the
frame, the column and its head, and stops. **Nothing moves**: there is no drag and drop here, and
what a card does when it is picked up is a question about your data rather than about this frame.

<!-- @api GENERATED from contracts/api/components/ArenaBoard.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | Names the board to assistive technology: what the columns are columns OF. "Sprint 32 tasks by status", never "Board". Required and guarded at runtime after trimming, the shape ArenaScroller.label carries for the same reason, since a group announced as a group tells a reader that focus moved and nothing about where it landed. |
| `content*` | slot |  |  | The columns, one ArenaBoardColumn each. Required and guarded at runtime: a board with no columns is a tab stop over nothing, which is the dead stop a component with a group role must not ship. |
| `minColumn` | primitive | `string` | `"var(--grid-min)"` | The narrowest a column may be before the board scrolls rather than squeezing. Columns share the room equally above it, so a board of four fills the width it is given and a board of twelve scrolls. It is a length rather than a step on the spacing scale, for the reason ArenaGrid.min is one: this is page geometry and the spacing scale models rhythm. The default is the same role a grid's cell reads, so a card is one width across a wall, a rail and a board. |

<!-- @api end -->

**Do / Don't**
- **Do** say what the columns are columns OF in `label`. It is the name a keyboard user lands on,
  and "Board" tells them nothing.
- **Do** leave `minColumn` alone unless a card needs more room than a grid cell: the default is
  the same width a card takes in a grid or a rail.
- **Don't** wrap it in a scroll container of your own. The board is the scrolling region, and a
  second one around it takes the keyboard's scroll away from the one that announces itself.
- **Don't** use it for a fixed set of panels that always fit. That is `arena-grid`, which wraps
  rather than scrolling.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/angular/components/layout/arena-board/ArenaBoard.demo.generated.html`:
- Tab reaches the board itself, the ring lands on the whole frame, and the arrow keys scroll it.
- Columns share the width while they fit and stop at `minColumn`, after which the board scrolls.
- A column is as tall as its own stack: they do not stretch to match the tallest.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
