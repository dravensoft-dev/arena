Arena timeline, the stages one thing passes through, in order and joined by a line. Standalone, `OnPush`, signal inputs. The host stays out of layout, and a real `<ol>` inside it carries the list. A milestone has a title, an optional time and a meaning.

```html
<arena-timeline label="Order 4821" [items]="milestones" />
<arena-timeline label="Release 12.2" [items]="trains" [index]="2" class="arena-orientation-horizontal" />
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

**Answers** [`orientation`](../../../../VOCABULARY.md#orientation): `arena-orientation-horizontal`, `arena-orientation-vertical` (default). Write one as `class="arena-orientation-horizontal"` on the component, or on a container whose components should all take it.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none.
<!-- @keys end -->

**Pick it by the shape of a row.** A row saying who did what to which thing belongs in `arena-activity-feed`. A row naming the stage one subject reached belongs here. A log of deployments is a feed, while one parcel's journey is a timeline.

**Without `index` the timeline is a history.** Every milestone then counts as complete, and no state word is spoken. Pass an `index` and the timeline is in motion. Milestones before it read as complete, the one at it as current, and later ones as upcoming, each announced as Current or Upcoming.

**A tone says what a milestone meant, not how far along it is.** Each toned dot shows the tone's glyph, so colour never works alone, and `icon` puts your own glyph there instead. Danger is drawn as an outline. No tone is announced, since the title already names the outcome.

**Do / Don't**
- Do set `label` to the subject, such as Release 12.2. A blank value throws, and Timeline names nothing.
- Do give `time` for people and `dateTime` for machines. Given both, the time renders as a real `<time>` element.
- Don't add a button or a link to a row. A row a person acts on is an `arena-table` row.
- Don't tone a dot for its position or for looks. The tone records what happened at that stage.
- Don't fill the line to show progress. The connector is a plain separator in no accent.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/angular/components/display/arena-timeline/ArenaTimeline.demo.generated.html`:
- A title long enough to wrap keeps its dot level with the first line.
- The connector joins each dot to the next, edge to edge, at the base density and under `arena-comfortable`, in both orientations.
- Each toned dot stays readable in both themes by its glyph, without its colour.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
