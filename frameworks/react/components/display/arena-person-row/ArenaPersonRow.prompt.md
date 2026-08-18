One person inside an `ArenaPeopleList`: a face, a name, an optional line under it, an optional
position in front and an optional figure behind. Its size comes from the list rather than from
here, so a row is written the same way whatever list it lands in.

```tsx
<ArenaPersonRow rank={4} name="Priya Raman" src="/img/priya.jpg" figure="1815 XP" current />

<ArenaPersonRow name="Tomas Klein" secondary="Platform, on call"
  action={<ArenaIconButton icon="ph-bold ph-x" label="Remove Tomas Klein" size="sm" />} />
```

`name` is the row's text, the initials the face falls back to and the image's alt text at once,
because a name spelt differently in any of those is the same person announced as two.

<!-- @api GENERATED from contracts/api/components/ArenaPersonRow.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `name*` | primitive | `string` |  | The person or entity. It is the row's own text, the face's initials when there is no image, and that image's alt text, which is why one member carries all three: a name spelt differently in any of them is the same person announced as two. Required and guarded at runtime rather than defaulted, because nothing can derive who a row is about and a blank one draws a face, a rank and a figure around nobody. |
| `src` | primitive | `string` |  | The face's image. Absent, the row draws the initials `name` gives it, which is the same fallback ArenaAvatar states and the reason a row needs no second member for the picture. |
| `secondary` | primitive | `string` |  | One line under the name: a handle, a role, a team, why this person is being suggested. Prose rather than a value, so it is set in the body register and never in the numeric one. |
| `rank` | primitive | `number` |  | The position this row holds, drawn in front of the face in a column wide enough for the list's longest. It is the number a standings list is read by, so it is set in the numeric register, and it says nothing about the order the rows are in: that is `ArenaPeopleList.ordered`. |
| `figure` | primitive | `string` |  | The quantity this row is about, drawn at the end: a score, a count, a share. A string rather than a number because the unit travels with it and a row reading "1815 XP" is one value and not two, which also keeps the formatting where the data is. |
| `current` | primitive | `boolean` | `false` | Whether this row is the reader's own. It fills the row so it can be found without reading it, and it says so rather than only showing it, because a highlight nothing announces is a highlight half the readers do not get. |
| `action` | slot |  |  | One control at the end of the row: follow, invite, remove. It sits after the figure, and the row draws nothing for it beyond the space it takes. |

<!-- @api end -->

**Do / Don't**
- Put the unit in `figure`: "1815 XP", "12 open", "38%". It is one value a reader says out loud,
  and formatting it where the data is beats formatting it here.
- Use `current` for the reader's own row. It fills the row and announces itself, which is what a
  highlight has to do to be worth drawing.
- Use `secondary` for a handle, a role or a reason, and keep it to a line: it truncates rather
  than wrapping, because a list of people reads down the names.
- Don't wrap the row in a link. A row is not an activation target; put the control in `action`,
  where it keeps its own name and its own keyboard.
- Don't pass `rank` to say the list is ordered. The number is drawn where you put it, and whether
  the order is the meaning is `ArenaPeopleList.ordered`.
- Don't write a second `<li>` around it. The row IS the list item.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
