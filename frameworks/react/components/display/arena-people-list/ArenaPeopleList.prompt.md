A list of people. Standings, assignees, members, suggestions, a comment thread's authors: the
shape is a face, a name and, where the list is about a quantity, a figure at the end. The list
carries the semantics and the size; each `ArenaPersonRow` says who and how much.

```tsx
<ArenaPeopleList label="Ruby league standings" ordered className="arena-size-sm">
  {league.map((player) => (
    <ArenaPersonRow key={player.id} rank={player.rank} name={player.name}
      src={player.avatar} figure={`${player.xp} XP`} current={player.isMe} />
  ))}
</ArenaPeopleList>

<ArenaPeopleList label="Suggested accounts">
  {suggestions.map((account) => (
    <ArenaPersonRow key={account.handle} name={account.name} src={account.avatar}
      secondary="Followed by marisol.b"
      action={<ArenaButton className="arena-emphasis-ghost arena-size-sm">Follow</ArenaButton>} />
  ))}
</ArenaPeopleList>
```

The `arena-size-*` class belongs on the list, not the row: a row reads it from the list it sits in, and the face, the
name and the figure move together. Rows in one list that disagreed about their size would be a
defect rather than a design, so there is nowhere to write that.

<!-- @api GENERATED from contracts/api/components/ArenaPeopleList.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | Names the list for assistive technology: what these people are a list OF, never that they are people. "Ruby league standings", "Suggested accounts", never "People". Required and guarded at runtime rather than defaulted, because nothing can derive it and a name that only says what the component is satisfies the requirement mechanically while telling a screen-reader user nothing: two lists on one page announce identically. |
| `ordered` | primitive | `boolean` | `false` | Whether the order is part of the meaning. A standings table read in any other order is a different claim, and its rows are numbered; a set of suggestions is a set. It is a declared input rather than something inferred from the rows carrying a `rank`, because Arena never derives what it draws from what a consumer happened to pass, and a numbered list whose numbers are decoration is a lie told to a screen reader. |
| `children` | slot |  |  | The rows. One ArenaPersonRow per person; a row is what says who and how much, and the list decides only where each one goes. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`size`](../../../../VOCABULARY.md#size): `arena-size-lg`, `arena-size-md` (default), `arena-size-sm`. Write one as `className="arena-size-lg"` on the component, or on a container whose components should all take it.

<!-- @answers end -->

**Do / Don't**
- Say what the list is OF in `label`: "Ruby league standings", "Reviewers on this pull request".
  The label is the name a screen-reader user navigates by, and "People" tells them nothing.
- Set `ordered` when the order is the meaning and the rows are numbered. A standings list read
  in any other order is a different claim; a set of suggestions is a set.
- Don't reach for this to show one person. A single face beside a name is `ArenaAvatar` and your
  own markup; this draws a list, and a list of one is a list.
- Don't use it for a feed of events. `ArenaActivityFeed` is somebody did something to something,
  and its rows are about the event rather than about the person.
- Don't put a table in it. Two figures per person, or a column a reader sorts by, is
  `ArenaTable`: this row has one figure and no columns.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
