Arena metric tile. A mono micro-label, the number in display weight, and an optional
delta pill. `label` and `value` are required. Two tone dimensions answer two different
questions about the same number, and neither implies the other:

- `tone` says what state the number **IS in right now**: colors the value itself.
  A service at 99.98% uptime is healthy whether or not it improved this week, and
  two open incidents are two open incidents even when that is down from five.
- `delta.tone` says whether the number's last change was **good**; `delta.direction`
  says which way it pointed, colors the delta pill. Revenue down is bad, latency
  down is good, and the tile cannot know which metric it is showing.

`delta` is one object (`ArenaStatDelta`), not three flat inputs, per the API capability contract
(`contracts/api/components/ArenaStatCard.json`). The pill renders only when `delta.value` is
truthy; a `delta` carrying a `tone`/`direction` but an empty `value` renders no pill at all.

A tile can legitimately show `tone="danger"` with `delta.tone="positive"` in the
same breath, a bad state that is improving is still a bad state.

`delta` is bound from a property and never written as an object literal in the template, for
the reason the Don't list below gives:

```ts
protected readonly revenue: ArenaStatDelta = { value: '12%', direction: 'up', tone: 'positive' };
protected readonly latency: ArenaStatDelta = { value: '9%', direction: 'down', tone: 'positive' };
protected readonly incidents: ArenaStatDelta = { value: '2', direction: 'up', tone: 'positive' };
```

```html
<arena-stat-card label="Revenue" value="$48.2k" [delta]="revenue" />
<arena-stat-card label="p95 latency" value="184ms" [delta]="latency" />
<arena-stat-card label="Open incidents" value="3" tone="danger" [delta]="incidents" sub="2 acknowledged" />
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

`icon` is a Phosphor class name, not a slot, Arena draws the `<i>` and its
aria-hidden wrapper, and an unfilled `icon` renders no wrapper at all:

```html
<arena-stat-card label="Build time" value="4m 12s" [delta]="buildTime" icon="ph-bold ph-timer" />
```

**Do / Don't**
- Set `delta.tone` deliberately for every delta. It defaults to neutral, and a neutral
  delta on a metric where the direction matters is a missed signal, not a safe one.
- Set `tone` for what the number currently IS, not for how it moved, reach for
  `delta.tone`/`delta.direction` for that instead. Conflating the two loses the
  distinction that "Open incidents" above depends on: the value stays `danger`
  red while the pill still reads a positive green improvement.
- Don't hand `delta` a fresh object identity to change one field without meaning to,
  it is a single input, so `[delta]="{ value: v, direction: 'up' }"` in a template
  expression rebuilds the whole object every change-detection pass. Bind from a
  component property computed once instead.
- Don't fill the negative delta or the danger value. Both are text/outline in
  `--error`, the value slot carries no background at all, and the delta pill is
  `bg-transparent`, like every other danger surface in Arena except
  `ArenaConfirmDialog`'s final confirmation.
- Don't put a chart in a stat card, `arena-chart-card` is the tile that holds one.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
