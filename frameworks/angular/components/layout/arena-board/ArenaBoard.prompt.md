The frame of a board: columns side by side, sharing the room equally and never narrower than
the `arena-board-column` width, scrolling sideways once they no longer fit. Standalone, `OnPush`, signal inputs. The
host IS the board, so it carries the group role, the name and the tab stop that make a scrolling
region reachable by keyboard at all.

```html
<arena-board label="Sprint 32 tasks by status">
  @for (status of statuses(); track status) {
    <arena-board-column [title]="status" [count]="byStatus()[status].length" [colorId]="slot(status)">
      <arena-icon-button action icon="ph-bold ph-plus" [label]="'Add to ' + status" class="arena-size-sm" />
      @for (task of byStatus()[status]; track task.id) {
        <app-task-card [task]="task" />
      }
      <arena-button footer icon="ph-bold ph-plus" class="arena-emphasis-ghost arena-size-sm">New</arena-button>
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

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`board-column`](../../../../VOCABULARY.md#board-column): `arena-board-column-lg`, `arena-board-column-md` (default), `arena-board-column-sm`. Write one as `class="arena-board-column-lg"` on the component, or on a container whose components should all take it. Property: `--arena-board-column`, set on a container of yours for a value no option names.

<!-- @answers end -->

**Do / Don't**
- **Do** say what the columns are columns OF in `label`. The label is the name a keyboard user lands on, and "Board" tells them nothing.
- **Do** leave the board's column width alone unless a card needs more room than a grid cell: write `class="arena-board-column-lg"` for that and `arena-board-column-sm` for many slim lanes. The default, `arena-board-column-md`, is
  the same width a card takes in a grid or a rail. `--arena-board-column` on a container takes a width no step names, and a class on the board wins over it.
- **Don't** wrap it in a scroll container of your own. The board is the scrolling region, and a
  second one around it takes the keyboard's scroll away from the one that announces itself.
- **Don't** use it for a fixed set of panels that always fit. The component for that is `arena-grid`, which wraps rather than scrolling.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/angular/components/layout/arena-board/ArenaBoard.demo.generated.html`:
- Tab reaches the board itself, the ring lands on the whole frame, and the arrow keys scroll it.
- Columns share the width while they fit and stop at the `arena-board-column` width, after which the board scrolls.
- A column is as tall as its own stack: they do not stretch to match the tallest.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
