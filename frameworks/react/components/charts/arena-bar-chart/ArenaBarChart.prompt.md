Bars for comparing a value across categories. Dependency-free SVG: it reads `var(--color-cat-N)` directly, so it re-themes with the page for free. Hover gives a per-bar tooltip; the numbers are also exposed as a table for screen readers.

```tsx
{/* identity: the default, one color for the whole series */}
<ArenaBarChart label="Deploys per day" labels={['Mon','Tue','Wed','Thu','Fri']}
  series={[{ label: 'Deploys', values: [12,19,9,22,17] }]} />

{/* identity: per-bar, when the bars are different things */}
<ArenaBarChart label="Load by service" labels={['Web','API','Worker']}
  series={[{ label: 'Requests', values: [24,18,7], slots: [1,2,3] }]} />

{/* two series: one group of bars per category, each series its own ramp slot */}
<ArenaBarChart label="Latency by region" labels={['EU','US','APAC']}
  series={[{ label: 'p50', values: [120,138,131] }, { label: 'p95', values: [240,262,255] }]}
  valueSuffix=" ms" />

{/* meaning: the series IS a state */}
<ArenaBarChart label="Build health" labels={['Mon','Tue','Wed']}
  series={[{ label: 'Failed builds', values: [2,5,1], tone: 'danger' }]}
  valueSuffix=" builds" />
```

<!-- @api GENERATED from contracts/api/components/ArenaBarChart.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `labels*` | array | `readonly string[]` |  | One label per category, in the same order as every series' `values`. A category with no value in a series is drawn for the series that do have one. |
| `series*` | array | `readonly ArenaSeries[]` |  | The plotted series, drawn as one group of bars per category. One series is the common case and draws exactly what it drew before; two or more share each category's band, so the bars of one category stand side by side and the reader compares within a category before comparing across. The ramp clamps at its last slot rather than cycling, so a ninth series folds into "Other" upstream, never into a colour already spent. |
| `label*` | primitive | `string` |  | Names the chart for its accessible name and for the caption of its data table. This is the CHART's name, not a series': a series names itself. Required and guarded rather than defaulted, because a fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing, so two charts on one page announce identically. |
| `stack` | primitive | `boolean` | `false` | Sit each series on the one below it inside a single band per category, rather than standing them side by side. Stack when the series are parts of one total and that total is the thing being read; leave it off when the comparison is between the series, because a segment that does not start at zero is one a reader cannot measure against its neighbours. Positive and negative values stack on their own runs, so a category holding both grows in both directions from the zero line and the axis is sized from the two sums rather than from the largest single value. A series with no value at a category contributes no segment, and the segment above it sits on the one below rather than floating over a gap: a missing number is not a zero here either. Only the outermost segment of each direction is rounded, so the joints inside a bar stay square and read as joints. |
| `valueSuffix` | primitive | `string` |  | Appended verbatim to every number the chart draws: the axis ticks, the tooltip and the accessible table. Carries its own leading space if one is wanted. |
| `valuePrefix` | primitive | `string` |  | Drawn verbatim before every number the chart writes, as valueSuffix is drawn after it. A currency that precedes its amount is the majority case worldwide and had no expression: with suffix alone, "1234.5 Bs." is what a chart drew where the table beside it read "Bs. 1.234,50", and the accessible table inherited the disagreement. |
| `valueFormat` | object | `ArenaNumberFormat` |  | How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number, which is what this chart drew before the member existed. |
| `height` | primitive | `number` | `280` | The plot's height in px, the --chart-height token by default. A number rather than a dimension string, because the chart does arithmetic with it to place every mark, and a caller-supplied "20rem" is neither a token nor a derivation of one. |
| `minPointSpacing` | primitive | `number` |  | The narrowest gap, in px, the chart draws between two adjacent points. Below it the chart stops compressing and overflows its container horizontally instead, scrolled and anchored to the most recent point: marker spacing is a legibility constant, not something that yields to the viewport, and thirty days in 390px is unreadable at any font size. Absent, the chart fits whatever width it is given. The rail it scrolls in is the same region the data cursor lives in, and it is keyboard-reachable whether it overflows or not. |

<!-- @api end -->

**Do**
- Give `label` and give every series its own `label`. They are two different names: `label` is the chart's, and it becomes the accessible name and the table caption; a series' `label` heads that series' column in the same table.
- Default to one identity color for the series. Per-bar `slots` is for when each bar is genuinely a different thing, not for decoration.
- Assign slots in order (1, 2, 3) and let a ninth category fold into "Other". The ramp is eight slots and is never cycled.
- Reach for `tone` only when the series *is* a state: failed builds, error rate. That is what makes red mean red. It goes on the series, because it is that series that is a state.
- Pass `valueSuffix` for units: the axis, the tooltip and the accessible table all carry it. It is appended verbatim, so write the space yourself: `" ms"`, but `"%"`.

**Don't**
- Don't pass `tone` together with `slot`/`slots` on one series. A chart carries identity or meaning, never both; it warns in development and `tone` wins.
- Don't use status colors as series colors by hand. A series painted `--danger` reads as an error, and that is exactly the bug this API exists to prevent.
- Don't reach past eight categories, or past eight series. Nine bars in eight slots means two of them lie about being the same.
- Don't add a second axis. Arena charts have one; a dual axis invents a correlation the data never claimed.
- Use `valuePrefix` for a currency that goes in front, and `valueFormat` for the number itself: locale, fraction digits, grouping, compaction. Formatting before you pass them is not an option, because what you pass is `ArenaSeries[]` and the writing happens on labels Arena generates afterwards. With no `valueFormat` the raw JavaScript number is drawn, which is what a chart always did.
- Don't omit `labels`, `series` or `label`. All three are required props, and `ArenaBarChart` throws from its render rather than drawing an empty box. A required member absent is a caller bug that fails hard in every layer, not a state to render.
- Don't pass more `labels` than a series has values. A bar is drawn per value and takes the label at its own index, so a surplus label is silently dropped rather than drawn without a bar to sit under. A series shorter than its neighbours simply stops: a missing number is not a zero, so it draws no bar and leaves an empty cell in the table.


### When the points stop fitting

`minPointSpacing` is the narrowest gap, in px, the chart will draw between two adjacent
points. Below it the chart stops compressing and overflows sideways instead, in a rail that
scrolls and starts anchored to the most recent point. Marker spacing is a legibility constant
rather than something that yields to the viewport: thirty days in 390px is unreadable at any
font size.

Arena computes the minimum width from its own axis padding, so nothing outside needs to know
what that padding is, and the rail is the chart's own box rather than the card's: a
`ArenaChartCard` around it needs no change. The rail takes `tabIndex={0}` and a `role="group"`
named after the chart whether it overflows or not.

`height` is the plot's height in px, the `--chart-height` token by default. A number rather
than a length string, because the chart does arithmetic with it to place every mark.

### Reading the bars without a pointer

The rail is one keyboard region and it is the plot's only tab stop. Inside it, Arrow Left and
Arrow Right move a data cursor from bar to bar, clamping at the ends rather than wrapping,
Home and End jump to the first and the last, and Escape clears it. The cursor drives exactly
what hover drives: the emphasised bar and its tooltip.

Nothing inside the graphic is focusable, and that is deliberate rather than an omission. A
`role="img"` subtree is presentational, so no ARIA on a mark inside it reaches a screen
reader however correct it is. A screen reader gets the visually hidden table of the same
numbers, which is already there; a sighted keyboard user gets the cursor. There is no third
copy of the numbers for either of them to disagree with.

### The legend, and when there is one

A chart of two or more series draws a row of keys below the plot, one swatch and one series name
each, in the order the series were given. A chart of one series draws none: `label` already names
the chart, the table's single value column is already headed by that series' own name, and a
one-row legend would restate both while spending plot height to do it. There is no member for
this; the number of series is the whole rule.

The strip comes out of the plot rather than being added to the box, so `height` stays the height
of the whole component whether a legend is drawn or not. That is what keeps a grid of tiles
aligned when one of them gains a second series.

It is `aria-hidden`, deliberately. It is a key for a reader who can see the colours, and those
same names are already the column headers of the numbers table, so a focusable copy of them would
be a second source for one fact. Its rows take no focus, and the plot still has exactly one tab
stop.

### Grouped or stacked

`stack` puts the series inside one band per category, each sitting on the one below it, instead of
standing them side by side. Reach for it when the series are parts of one total and the total is
what the reader is there for. Leave it off when the comparison is between the series: only the
first segment starts at the zero line, so every one above it is a length a reader has to measure
against a moving base, which is the thing bar charts are good at and stacks are not.

Positive and negative values stack on their own runs, so a category holding both grows in both
directions from the zero line and the axis is sized from the two sums rather than from the largest
single value. That is the same divergent axis a grouped chart already had; a stack just gives it
more to hold.

A series with no value at a category contributes no segment, and the segment above it sits on the
one below rather than floating over a gap. A missing number is not a zero here either, so a hole
shortens the total instead of pretending the category was measured.

Only the outermost segment of each direction is rounded. The joints inside a bar stay square,
because a rounded joint reads as the end of something.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
