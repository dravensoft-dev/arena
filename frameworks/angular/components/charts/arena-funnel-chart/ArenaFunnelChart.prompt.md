One ordered series narrowing stage by stage. Each stage is a centred bar as wide as its count, and the share of the stage before it is written beside the loss between the two.

```ts
readonly stages = ['Visits', 'Sign-ups', 'Activated', 'Subscribed', 'Retained'];
readonly trial: ArenaSeries[] = [{ label: 'Accounts', values: [12480, 3120, 1904, 702, 518] }];
```

<!-- @api GENERATED from contracts/api/components/ArenaFunnelChart.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `labels*` | array | `readonly string[]` |  | One label per stage, in the same order as the series' `values`, running down the left edge. The chart does not reorder them: a funnel's order is a sequence in time or in a process, and sorting would invent one. A stage with no label has an empty name. |
| `series*` | array | `readonly ArenaSeries[]` |  | Exactly one series, the count at each stage in order. A second series warns and is ignored, because two funnels are two charts. `colorIds` is per-stage identity. `tone`, when given, colours the whole series and never a position, because a later stage is not worse for being later. |
| `colorStart` | enum | `ArenaCatSlot` | `1` | The ramp slot the stages take when the series names no colour of its own. A stage past the end of `colorIds` takes the slot its position gives, counted from this one, and after the last slot the count starts again at the first. Absent, 1. |
| `label*` | primitive | `string` |  | Names the chart for its accessible name and for the caption of its data table. The label is the CHART's name, not a series': a series names itself. A fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing, so two charts on one page announce identically. Required and guarded rather than defaulted for that reason. |
| `showConversion` | primitive | `boolean` | `true` | Whether the conversion is drawn and tabled. On, each stage's share of the stage before it is written beside the loss between the two, the table gains the two conversion columns, and the tooltip reads both ratios. Off, the funnel is its marks and their counts. |
| `valueSuffix` | primitive | `string` |  | Appended verbatim to every count the chart writes: the numbers beside the stages, the tooltip and the accessible table. The conversion is a percentage and takes no suffix. |
| `valuePrefix` | primitive | `string` |  | Drawn verbatim before every count the chart writes, as valueSuffix is drawn after it. A currency that precedes its amount is the majority case worldwide, and a suffix alone cannot say it: "1234.5 Bs." would disagree with the table beside it reading "Bs. 1.234,50", and the accessible table would inherit the disagreement. |
| `valueFormat` | object | `ArenaNumberFormat` |  | How each count is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number. The conversion takes only the locale and keeps at most one fraction digit, so 62.4% is never written 62%. |
| `height` | primitive | `number` | `280` | The plot's height in px, the --chart-height token by default. The height is the axis the stages run down, so a funnel of many stages wants more of it. Pass the room the data needs rather than letting the stages thin out. A number rather than a dimension string, because the chart does arithmetic with it to place every mark. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys**, from [`figure-with-data-table`](../../../../../contracts/behaviour/figure-with-data-table.json):
- `ArrowUp`: moves the data cursor to the previous point, clamping at the first, on a chart whose categories run down the plot rather than across it.
- `ArrowDown`: moves the data cursor to the next point, clamping at the last, on a chart whose categories run down the plot rather than across it.
- `Home`: moves the data cursor to the first point.
- `End`: moves the data cursor to the last point.
- `Escape`: clears the data cursor.
- `data-cursor`: an addition of this component, see its binding.
<!-- @keys end -->

```html
<arena-funnel-chart label="Trial conversion" [labels]="stages" [series]="trial" [valueFormat]="{ grouping: true }" />

<!-- the counts alone, without the conversion -->
<arena-funnel-chart label="Trial conversion" [labels]="stages" [series]="trial" [showConversion]="false" />
```

### What the drawing says

A stage is a centred bar whose width is its count measured from zero.
A stage with half the count is half as wide.
The loss is the tinted shape between two bars, lighter than a stage and without an edge, so no reader takes it for one.
A stage larger than the one before it is drawn as it is: the shape widens, the conversion reads above 100%, and nothing is corrected.
A negative count draws no width and is written as passed, and a missing count draws no bar and leaves its cell empty.
No text lies over a bar. Counts and conversions sit in the gutter on the right, where the ink never has to contrast with a colour.

### The conversion is written by the chart

Each stage gets two ratios: its share of the stage before it, and its share of the first stage.
The share of the stage before it is written beside the loss.
Both ratios are in the tooltip and the table, so the drawing and the table never disagree on rounding.
A ratio whose denominator is zero, negative or missing is an empty cell and never `0%`.
`valueFormat` gives the percentage its locale.
The percentage keeps at most one fraction digit, whatever fraction digits the counts keep.
62.4% is never written 62%.

### Colour

Every stage takes one hue, because the stages are the same kind of thing at different points.
Leave it alone. `colorIds` gives each stage an identity of its own, and `tone` colours the whole series when the series is a state, such as a funnel of failures.
Never colour a stage by its position or by a judgement of it.
A later stage is not worse for being later.

### Reading it without a pointer

The plot is one tab stop. ArrowUp and ArrowDown move a cursor through the stages, Home and End jump to the ends, Escape clears it.
One press reads a stage's count and both of its conversions.
ArrowLeft and ArrowRight do nothing and are not consumed: this chart has no sequence along that axis.

### Size

The chart is `--chart-height` tall, and the stages share that height equally. Pass `height` for a funnel of many stages instead of letting them thin out.
The names run down the left edge and the counts down the right, and the right gutter widens with the longest text written there.

### Do and don't

- Do name the chart, and keep the stages in the order of the process.
- Don't reorder the stages: their order is the process, and sorting invents one.
- Don't pass a second series: two funnels are two charts.
- Don't ask for a bar per stage that slopes to the next, a formatter or a conversion function, or a rail that scrolls.
- Don't use a funnel for the parts of a whole: that is `arena-doughnut-chart`.

A single series that narrows through the steps of a process is a funnel; a ranking or a comparison is a horizontal bar chart, and should be one.

**Words.** The chart's accessible name is `funnelChartName`, with its `label` in `{label}`, its data table's first heading is `chartTableCategory`, and the conversion columns are `funnelConversionStep` and `funnelConversionTotal`.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
