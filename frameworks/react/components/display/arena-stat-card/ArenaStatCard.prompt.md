Single metric on the card surface: uppercase label, one big tabular-nums value, an optional delta pill and a context line. Use it in a row of 2–4 for a dashboard's top band; it is not a chart and holds one number.

`label` and `value` are required. `delta` is optional, and the pill renders only when
`delta.value` is truthy, a `delta` object carrying a `tone`/`direction` but an empty
`value` renders nothing at all, per `contracts/api/components/ArenaStatCard.json`.

`value` and `delta.value` are **preformatted strings**: ArenaStatCard does no rounding, no locale, no unit. Format upstream where the units are known.

```tsx
<ArenaStatCard label="Deploys" value="128" delta={{ value: '+12%', direction: 'up', tone: 'positive' }} sub="vs last week" />
<ArenaStatCard label="p95 latency" value="340 ms" delta={{ value: '-18%', direction: 'down', tone: 'positive' }} sub="vs last week" />
<ArenaStatCard label="Open incidents" value="3" delta={{ value: '+2', direction: 'up', tone: 'negative' }} />
<ArenaStatCard label="Build time" value="4m 12s" delta={{ value: '+3s', direction: 'up' }} icon="ph-bold ph-timer" />
```

<!-- @api GENERATED from contracts/api/components/ArenaStatCard.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | Short uppercase microlabel, two words at most. |
| `value*` | primitive | `string` |  | Preformatted, e.g. "1,284" or "99.9%". ArenaStatCard never formats. |
| `tone` | enum | `ArenaTone` | `"neutral"` | What state the number IS in right now, as against how it moved. ArenaBadge's vocabulary. |
| `delta` | object | `ArenaStatDelta` |  | How the number moved. Absent renders no pill. |
| `sub` | primitive | `string` |  | Small muted line under the value: context, e.g. "vs last week". |
| `icon` | primitive | `string` |  | A Phosphor class name for a small glyph beside the label, drawn muted. Arena renders the aria-hidden wrapper and the `<i>`. |

<!-- @api end -->

`tone` on the card colors the **value**; `delta.tone` colors the **pill**. They answer different questions: what the number *is* versus how it *moved*, and either can be set without the other:

```tsx
<ArenaStatCard label="Average uptime" value="99.98%" tone="success" />
<ArenaStatCard label="Incidents" value="2" tone="danger" />
<ArenaStatCard label="Error rate" value="0.02%" tone="gold" sub="within budget" />
```

**Do**
- Set `tone` from what the metric *means*: latency dropping is `positive`, revenue dropping is `negative`. `direction` only draws the arrow.
- Reach for the card's `tone` only when the value's current state is the point. A row where every number is colored says nothing; the color has to be scarce to read as a signal, and a band of four black numbers with one red one is the whole design.
- Leave `tone` off (it defaults to `neutral`) when the movement is not good or bad. A gray pill claiming nothing beats a green one claiming wrongly.
- Keep `label` to a short uppercase microlabel; it follows the same ≤2-word rule as table headers and eyebrows (H2/H6/H8).

**Don't**
- Don't assume up is good. That is the whole reason `direction` and `tone` are separate props; passing `tone: 'positive'` for every `up` re-creates the bug.
- Don't fill the delta pill. Both signs are outline: filled red is reserved for `ArenaConfirmDialog`'s final irreversible confirmation, and a data pill has no business spending that signal.
- Don't put a sentence in `sub`: it is a short context fragment ("vs last week"), not a paragraph.
- Don't use the card's `tone` to restate the delta. If the pill already says the movement was bad, coloring the value red says it twice and leaves you nothing to say when the *state* turns bad too.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
