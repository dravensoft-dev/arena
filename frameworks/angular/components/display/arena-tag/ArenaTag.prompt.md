Arena status/emphasis tag, a pill whose `tone` follows the ArenaBadge/ArenaTag taxonomy.
Standalone, `OnPush`, signal I/O. `removable` shows an
Arena-drawn dismiss `×` that emits `remove` on click.

`colorId` is the other colour a tag can take, and it answers a different question: `tone` says
what state a thing is in, `colorId` says which thing it is. A database label, a workflow status
and a project name are identities, so they take a ramp slot and keep it everywhere.

```html
<arena-tag>Neutral</arena-tag>
<arena-tag tone="primary">Active</arena-tag>
<arena-tag tone="danger">Blocked</arena-tag>
<arena-tag [colorId]="3">Backend</arena-tag>
<arena-tag removable (remove)="drop('staging')">Staging</arena-tag>
```

<!-- @api GENERATED from contracts/api/components/ArenaTag.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `content` | slot |  |  | The tag's label. |
| `tone` | enum | `ArenaTagTone` | `"neutral"` | The tag's emphasis colour. Ignored while `colorId` names a ramp slot, because a tag draws one colour and the two mean different things. |
| `colorId` | enum | `ArenaCatSlot` |  | An identity colour from the categorical ramp, the ramp the charts and the calendar read, so one entity keeps its colour across a chart, a schedule and a label. Colour here means which thing and never what state, which is why it replaces `tone` rather than joining it: a label reading "Backend" is not a warning, and a tag that could say both at once would say neither. Optional, and its absence is the tone tag. The slot's colour also reaches the tag as a custom property, `--arena-tag-cat`, so an appearance that fills the pill rather than outlining it is a style plugin's to write and needs no member here. |
| `removable` | primitive | `boolean` | `false` | Whether the dismiss × is shown. Every layer gates the × on this member and never on whether anything listens for `remove`, because Arena never derives what it draws from what a consumer listens for. Removability is a declared input, not something inferred from the event. |
| `disabled` | primitive | `boolean` | `false` | Whether removal is unavailable while the tag stays visible: a filter a consumer's permissions lock, not a tag that is merely inert. It reflects through `aria-disabled` rather than the native `disabled` attribute, so the × keeps its place in the tab order and a screen-reader user is told the action is unavailable instead of never finding it. With `removable` false there is no × and nothing to disable. |
| `remove` | event |  |  | The dismiss × was activated. Never emitted while `disabled`. |

<!-- @api end -->

**Do / Don't**
- Use `tone="danger"` for a blocked/destructive status: the pill's border and
  text render in `--error`, never a fill. That is the danger convention; the
  only filled danger surface in Arena is `ArenaConfirmDialog`'s final confirmation.
- The leading dot is filled (`bg-current`, coloured by `tone`) even for
  `tone="danger"`, though the pill itself is outline, a tone dot is an
  identity mark, the same family as `ArenaActivityFeed`'s own dot and `ArenaAvatar`'s
  presence dot, not a danger surface. convention section.
- Use `removable` only when removing the tag is a real user action (applied
  filters), not on informational tags, and handle `(remove)`, or the × has
  nothing wired to it.
- Reach for `disabled` when removal is temporarily unavailable and the tag must
  stay on screen, a filter the user's permissions lock. The × keeps its place
  in the Tab sequence and announces itself as unavailable, which is why this is
  `aria-disabled` and not the native `disabled` attribute, and `remove` is never
  emitted while it is set. Without `removable` there is no × and it does nothing.
- Don't use `disabled` to mean "this tag is greyed out". A tag with no `×` is
  already inert; the state is about the remove action alone.
- Don't use a tag as a button. It is a status/emphasis label; an action belongs
  on an `arena-button`, not on the pill itself, the dismiss `×` is the one
  exception, and it is a real `<button>` gated on `removable`.
- Don't add a `tone` outside the taxonomy: the five tones are the whole set.
- Reach for `colorId` when the colour identifies rather than warns, and give the same entity the
  same slot on every screen: the ramp is the one the charts and `arena-calendar-event` read, so a
  label, a series and a schedule chip agree. Derive the slot from a stable key with
  `arenaCatSlotFor` rather than from the position of a row, which moves when the list is sorted.
- Bind it, `[colorId]="3"`, rather than writing `colorId="3"`: the input takes a number and an
  unbound attribute hands it the string.
- Don't pass `tone` and `colorId` together expecting both: `colorId` wins, and a pill that
  carried a state colour and an identity colour at once would read as neither.
- The identity pill outlines, like every other tone. A filled one is an appearance decision: the
  ramp colour reaches the host as `--arena-tag-cat`, so a style plugin fills `tag` with it and no
  member is needed here.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
