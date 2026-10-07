Several measures on one shape: an axis per label around a polar grid, one closed polygon per series. A radar reads a profile rather than a magnitude, which is what makes it a different chart from bars over the same numbers.

```ts
readonly profile = computed<ArenaSeries[]>(() => [
  { label: 'Current', values: this.current() },
  { label: 'Target', values: this.target() },
]);
```

<!-- @api GENERATED from contracts/api/components/ArenaRadarChart.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `labels*` | array | `readonly string[]` |  | One label per axis, in the same order as every series' `values`, running clockwise from 12 o'clock. Keep the count small: past eight or so the labels collide and the shape stops being readable, which is a limit of the form rather than of the drawing. |
| `series*` | array | `readonly ArenaSeries[]` |  | The plotted series, drawn as one closed polygon each over the same axes. The shape is the reading, so two or three series is the useful case and more is a tangle. The ramp clamps at its last slot rather than cycling. |
| `label*` | primitive | `string` |  | Names the chart for its accessible name and for the caption of its data table. This is the CHART's name, not a series': a series names itself. Required and guarded rather than defaulted, because a fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing. |
| `fill` | primitive | `boolean` | `false` | Fill each polygon at 18% of its series colour: a tint, never a gradient. Useful for one series, where the filled area reads as a footprint. Past one the fills overlap and the reader cannot tell which polygon an overlap belongs to, so leave it off and let the outlines carry the shape. |
| `valueSuffix` | primitive | `string` |  | Appended verbatim to every number the chart draws: the tooltip and the accessible table. Carries its own leading space if one is wanted. |
| `valuePrefix` | primitive | `string` |  | Drawn verbatim before every number the chart writes, as valueSuffix is drawn after it. |
| `valueFormat` | object | `ArenaNumberFormat` |  | How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number. |
| `height` | primitive | `number` | `280` | The plot's height in px, the --chart-height token by default. The grid is a circle inscribed in the smaller of the plot's two axes, so this also caps how wide the shape gets. A number rather than a dimension string, because the chart does arithmetic with it to place every mark. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys**, from [`figure-with-data-table`](../../../../../contracts/behaviour/figure-with-data-table.json):
- `ArrowLeft`: moves the data cursor to the previous point, clamping at the first.
- `ArrowRight`: moves the data cursor to the next point, clamping at the last.
- `Home`: moves the data cursor to the first point.
- `End`: moves the data cursor to the last point.
- `Escape`: clears the data cursor.
- `data-cursor`: an addition of this component, see its binding.
<!-- @keys end -->

```html
<arena-radar-chart label="Service profile" [labels]="axes()" [series]="profile()" />
```

### What the grid is, and what it is not

The axes start at 12 o'clock and run clockwise, the same way the doughnut's slices do, so two
radial charts on one page never begin in different places. Every axis shares one radial scale
that starts at the centre, so the rings are readable across all of them.

A radius cannot be negative, so a value below zero is drawn at the centre rather than on the
opposite axis, where it would land as a different datum entirely. That floor is this chart's own, the way the doughnut keeps one. `arenaScaleValue` maps and does not clamp, and where a value may not go is the chart's rule rather than the scale's. The accessible table still reads the number that
was passed.

Keep the axis count small. Past eight or so the labels collide, which is a limit of the form and
not of the drawing. And keep the series count to two or three: the shape is the reading, and four
outlines over one grid is a tangle.

`fill` is for one series, where the area reads as a footprint. Past one the fills overlap and a
reader cannot tell which polygon an overlap belongs to.

### Reading it without a pointer

The cursor walks the AXES, so one press reads every series on that axis at once. ArrowLeft and
ArrowRight move it, Home and End jump to the ends, Escape clears it. Going around is a sequence, which is why this chart takes a cursor where the doughnut refuses one. A ring of slices has no order to walk, and a ring of axes does.

ArrowUp and ArrowDown do nothing and are not consumed, so the page keeps its own scroll.

**Words.** The chart's accessible name is `radarChartName`, with its `label` in `{label}`, and its data table's first heading is `chartTableAxis`.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
