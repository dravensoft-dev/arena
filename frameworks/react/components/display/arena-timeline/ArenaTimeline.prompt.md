The stages one thing moves through, in order and joined by a line: an order from placed to delivered, a release train, a case history. Each row is a milestone with a title, an optional time and a meaning.

```tsx
<ArenaTimeline label="Order 4821" items={milestones} />
<ArenaTimeline label="Release 12.2" items={trains} index={2} className="arena-orientation-horizontal" />
```

<!-- @api GENERATED from contracts/api/components/ArenaTimeline.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | Names the list: what this is the history or the progress of, such as Order 4821, never Timeline. Required, and guarded at runtime after trimming: nothing can derive it. |
| `items*` | array | `readonly ArenaTimelineItem[]` |  | The milestones, in the order they are drawn. Arena draws each row from its fields; an empty list draws nothing. |
| `index` | primitive | `number` |  | Which milestone is current, counted from zero, for a timeline still in motion. The milestones before it are complete and the ones after it upcoming. Absent, or at or past the end, every milestone is complete, which is a history. A negative or non-finite value reads as 0. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`orientation`](../../../../VOCABULARY.md#orientation): `arena-orientation-horizontal`, `arena-orientation-vertical` (default). Write one as `className="arena-orientation-horizontal"` on the component, or on a container whose components should all take it.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none.
<!-- @keys end -->

**A feed row or a milestone?** Someone did something to something is a feed row, and that is `ArenaActivityFeed`. One thing moving through stages is a milestone, and that is this component. A deployment log is a feed; a shipped order is a timeline.

**`index` turns a history into progress.** With no `index`, every milestone is complete and nothing is spoken. With one, the milestones before it are complete, the one at it is current and the rest are upcoming. A reader hears Current or Upcoming before those titles.

**`tone` is the milestone's meaning, never its progress.** A toned dot carries the tone's glyph, so colour never stands alone, and `icon` swaps in a glyph of your own. A danger dot stays an outline. The tone is not spoken, because the title says what happened.

**Do / Don't**
- Do name the subject in `label`, such as Order 4821. A blank label throws, and Timeline tells a reader nothing.
- Do pass `time` for the reader and `dateTime` for a machine. With both, the time is a real `<time>` element.
- Don't put an action in a row. A timeline reports, and a row that needs a control belongs in `ArenaTable`.
- Don't colour a dot by position or for decoration. The tone says what the milestone meant.
- Don't draw a progress fill on the line. The connector is a separator and carries no accent.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/react/components/display/arena-timeline/ArenaTimeline.demo.generated.html`:
- A long title wraps without pulling its dot off the first line.
- The connector joins the dots' centres at the base density and under `arena-comfortable`.
- Every toned dot reads in light and dark from its glyph alone.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
