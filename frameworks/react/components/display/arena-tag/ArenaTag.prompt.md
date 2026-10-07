Filter/technology/status chip. `tone` is `neutral`, `success`, `warning` or `danger`, never
ArenaBadge's `info`, and colours the chip's border, text and leading dot together. `removable` shows a dismiss
`×`, which uses the standard Phosphor icon `ph-x` (H4), the same close as
ArenaToast.

`colorId` is the other colour a tag can take, and it answers a different question: `tone` says
what state a thing is in, `colorId` says which thing it is. A database label, a workflow status
and a project name are identities, so they take a ramp slot and keep it everywhere.

```tsx
<ArenaTag>TypeScript</ArenaTag>
<ArenaTag tone="success">Shipped</ArenaTag>
<ArenaTag tone="danger">Blocked</ArenaTag>
<ArenaTag colorId={3}>Backend</ArenaTag>
<ArenaTag removable onRemove={()=>drop('react')}>React</ArenaTag>
```

<!-- @api GENERATED from contracts/api/components/ArenaTag.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `children` | slot |  |  | The tag's label. |
| `tone` | enum | `ArenaTagTone` | `"neutral"` | What state the tag reports; neutral reports none. Ignored while `colorId` names a ramp slot, because a tag draws one colour and the two mean different things. |
| `colorId` | enum | `ArenaCatSlot` |  | An identity colour from the categorical ramp, the ramp the charts and the calendar read, so one entity keeps its colour across a chart, a schedule and a label. Colour here means which thing and never what state, which is why it replaces `tone` rather than joining it: a label reading "Backend" is not a warning, and a tag that could say both at once would say neither. Optional, and its absence is the tone tag. The slot reaches the tag as `data-arena-color-id` and its colour through the hue channels (`--arena-hue-ink`, `--arena-hue-edge`, `--arena-hue-fill-strong`, `--arena-hue-fill-soft`), so an appearance that fills the marker rather than outlining it is a style plugin's to write and needs no member here. |
| `removable` | primitive | `boolean` | `false` | Whether the dismiss × is shown. Every layer gates the × on this member and never on whether anything listens for `remove`, because Arena never derives what it draws from what a consumer listens for. Removability is a declared input, not something inferred from the event. |
| `disabled` | primitive | `boolean` | `false` | Whether removal is unavailable while the tag stays visible: a filter a consumer's permissions lock, not a tag that is merely inert. It reflects through `aria-disabled` rather than the native `disabled` attribute, so the × keeps its place in the tab order and a screen-reader user is told the action is unavailable instead of never finding it. With `removable` false there is no × and nothing to disable. |
| `onRemove` | event |  |  | The dismiss × was activated. Never emitted while `disabled`. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`accent`](../../../../VOCABULARY.md#accent): `arena-accent-plain` (default), `arena-accent-primary`. Write one as `className="arena-accent-primary"` on the component, or on a container whose components should all take it.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys**, from [`button`](../../../../../contracts/behaviour/button.json):
- `Space`: activate.
- `Enter`: activate.
<!-- @keys end -->

**Do / Don't**
- Use `tone="danger"` for a blocked/destructive status: border and text render
  in `--color-error`, never a fill. The outline is the danger convention. The only filled danger surface in Arena is `ArenaConfirmDialog`'s final confirmation.
- The leading dot is filled with `currentColor`, so it always matches the tone, even for `tone="danger"` where the chip itself is outline. A tone dot is an identity mark rather than a danger surface, in the same family as `ArenaActivityFeed`'s own dot and `ArenaAvatar`'s presence dot.
- Use `removable` only when removing the chip is a real user action, such as applied filters, rather than on informational tags. Pass `onRemove` alongside it, or the × renders with nothing to call.
- Reach for `disabled` when removal is temporarily unavailable and the chip must
  stay on screen, a filter the user's permissions lock. The × keeps its place
  in the Tab sequence and announces itself as unavailable, which is why this is
  `aria-disabled` and not the native `disabled` attribute. Without `removable`
  there is no × and `disabled` does nothing.
- Don't use `disabled` to mean "this chip is greyed out". A tag with no `×` is
  already inert; the state is about the remove action alone.
- Don't mix the ArenaTag/ArenaToast × with the modal close: dialogs close with their
  explicit button (Cancel), not with the ph-x icon.
- Don't make emphasis a `tone`: it is the `accent` family's `arena-accent-primary` class.
- Reach for `colorId` when the colour identifies rather than warns, and give the same entity the same slot on every screen. The ramp is the one the charts and `ArenaCalendarEvent` read, so a label, a series and a schedule chip agree.
  Derive the slot from a stable key with `arenaCatSlotFor` rather than from the
  position of a row, which moves when the list is sorted.
- Don't pass `tone` and `colorId` together expecting both: `colorId` wins, and a
  chip that carried a state colour and an identity colour at once would read as
  neither.
- The identity chip outlines, like every other tone. A filled one is an appearance decision. The ramp colour reaches the element as `data-arena-color-id`
  and the hue channels (`--arena-hue-ink`, `--arena-hue-edge`, `--arena-hue-fill-strong` and
  `--arena-hue-fill-soft`). A style plugin fills `tag` with it, so no member is needed here.

**Words.** `tagRemove` names the remove button.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
