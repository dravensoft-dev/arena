A list of people. Standings, assignees, members, suggestions: a face, a name and, where the list
is about a quantity, a figure at the end. Standalone, `OnPush`, signal inputs. The host takes
itself out of layout and the component renders the real `<ul>` or `<ol>`, because the semantics
of a list are the element and not a class.

```html
<arena-people-list label="Ruby league standings" ordered size="sm">
  @for (player of league(); track player.id) {
    <arena-person-row [rank]="player.rank" [name]="player.name" [src]="player.avatar"
                      [figure]="player.xp + ' XP'" [current]="player.isMe" />
  }
</arena-people-list>

<arena-people-list label="Suggested accounts">
  @for (account of suggestions(); track account.handle) {
    <arena-person-row [name]="account.name" [src]="account.avatar"
                      secondary="Followed by marisol.b">
      <arena-button action variant="ghost" size="sm">Follow</arena-button>
    </arena-person-row>
  }
</arena-people-list>
```

`size` is the list's, not the row's: the list provides it and each row pulls it, the same
direction `arena-radio` reads its group. The face, the name and the figure move together, and
rows in one list that disagreed about their size would be a defect rather than a design.

<!-- @api GENERATED from contracts/api/components/ArenaPeopleList.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | Names the list for assistive technology: what these people are a list OF, never that they are people. "Ruby league standings", "Suggested accounts", never "People". Required and guarded at runtime rather than defaulted, because nothing can derive it and a name that only says what the component is satisfies the requirement mechanically while telling a screen-reader user nothing: two lists on one page announce identically. |
| `ordered` | primitive | `boolean` | `false` | Whether the order is part of the meaning. A standings table read in any other order is a different claim, and its rows are numbered; a set of suggestions is a set. It is a declared input rather than something inferred from the rows carrying a `rank`, because Arena never derives what it draws from what a consumer happened to pass, and a numbered list whose numbers are decoration is a lie told to a screen reader. |
| `size` | enum | `ArenaControlSize` | `"md"` | How big every row in the list is: the face, the name and the figure move together. It sits on the list rather than on the row because rows in one list that disagree about their size are a defect and never a design, and how the list hands it down is each layer's business rather than this contract's. |
| `content` | slot |  |  | The rows. One ArenaPersonRow per person; a row is what says who and how much, and the list decides only where each one goes. |

<!-- @api end -->

**Do / Don't**
- **Do** say what the list is OF in `label`: "Ruby league standings", "Reviewers on this pull
  request". It is the name a screen-reader user navigates by, and "People" tells them nothing.
- **Do** set `ordered` when the order is the meaning and the rows are numbered. It picks the
  element, `<ol>` against `<ul>`, which is where that claim lives.
- **Don't** reach for this to show one person. A single face beside a name is `arena-avatar` and
  your own markup.
- **Don't** use it for a feed of events: `arena-activity-feed` is somebody did something to
  something, and its rows are about the event rather than about the person.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/angular/components/display/arena-people-list/ArenaPeopleList.demo.generated.html`:
- The three sizes move the face, the name, the figure and the row's own air together.
- `ordered` swaps the element and nothing else: no marker is drawn in either, because the rank
  is the row's own column.
- The reader's own row fills, and reads as one row rather than as a section.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
