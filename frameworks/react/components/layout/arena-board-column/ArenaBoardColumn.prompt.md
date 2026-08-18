One column of an `ArenaBoard`: a named head with a count and a control, the stack of whatever you
put in it, and a footer for the one action that adds to it.

```tsx
<ArenaBoardColumn title="In progress" count={3} summary="13 pts" colorId={1}
  action={<ArenaIconButton icon="ph-bold ph-dots-three" label="In progress options" size="sm" />}
  footer={<ArenaButton variant="ghost" size="sm" icon="ph-bold ph-plus">Add task</ArenaButton>}>
  {tasks.map((task) => <TaskCard key={task.id} task={task} />)}
</ArenaBoardColumn>
```

`count` is passed rather than counted. Arena never decides what it draws from what you projected,
because one of those children may be a placeholder and none of them is Arena's to read.

`colorId` takes the same ramp slot `ArenaTag` and the charts take, so a status keeps its colour
between a board, a table and a chart. It inks the head's mark; the colour also reaches the column
as `--arena-board-column-cat`, so a style plugin can fill the whole head with it.

<!-- @api GENERATED from contracts/api/components/ArenaBoardColumn.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `title*` | primitive | `string` |  | What this column is: a status, a stage, a person, a day. It is the head's text and the column's accessible name at once. Required and guarded at runtime rather than defaulted, because a column of a board is only ever read by what it groups, and an unnamed one is a pile. |
| `headingLevel` | enum | `ArenaHeadingLevel` | `"h3"` | Which rung of the document outline the head's text takes. Only the element changes: its class is the same at every value, so the render is identical and no appearance follows from it. It defaults to `h3`, the card rung of the title ladder, because a board sits inside the region a section names and a column sits inside the board. The column's accessible name is separate and is unaffected, since it is the group's own and is carried whatever the head is drawn as. `none` is refused at runtime, the rule every component whose `title` is required follows: a title required because it names the thing it draws cannot also be told that the name is not one. |
| `count` | primitive | `number` |  | How many things are in the column, drawn beside the title in the numeric register. It is passed rather than counted, because Arena never derives what it draws from what a consumer projected: the column holds the consumer's own elements, one of which may be a placeholder and none of which Arena can read. |
| `summary` | primitive | `string` |  | One line under the head: the total the column adds up to, an estimate, a limit. A string rather than a number because the unit travels with it, and a column reading "19 pts" is one value and not two. |
| `colorId` | enum | `ArenaCatSlot` |  | An identity colour for the column, from the same categorical ramp ArenaTag and the charts read, so a status keeps its colour between a board, a table and a chart. It inks the head's mark and reaches the column as a custom property, `--arena-board-column-cat`, so an appearance that fills the whole head with it is a style plugin's to write and needs no member here. |
| `action` | slot |  |  | One control in the head: a menu, a filter, an add. It sits after the count, and the column draws nothing for it beyond the space it takes. |
| `children` | slot |  |  | The cards, stacked in order. Arena draws none of them: a board's card carries the product's own fields, so what is left once they are removed is the stack, which is what this draws. |
| `footer` | slot |  |  | The action that adds to this column, under the stack, where a board puts it because a new card lands at the bottom. Optional, and a column with none simply ends at its last card. |

<!-- @api end -->

**Do / Don't**
- Give the same entity the same `colorId` everywhere: a status that is slot 3 on the board and
  slot 3 in the chart beside it is one thing said twice, which is what the ramp is for.
- Put the add action in `footer`, not in the head. A new card lands at the bottom, and a control
  that adds where the eye is not looking is a control nobody presses twice.
- Don't count the children yourself in the head. Pass `count` from the same data you mapped over,
  or the number and the stack drift the first time one of them is filtered.
- Don't reach for a column outside a board. It is a cell of the board's grid and takes its width
  from it; on its own it is a card with a heading, which is `ArenaCard`.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
