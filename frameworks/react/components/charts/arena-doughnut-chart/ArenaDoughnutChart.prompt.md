Parts of one whole, a share breakdown across a handful of categories. Always draws a legend with the label and value beside each swatch: the slices are the series, and identity is never carried by color alone. Hovering a slice or a legend row highlights both and shows the share in the hole, and so does focusing a legend row, because every row is a real button.

```tsx
<ArenaChartCard title="Traffic by service">
  <ArenaDoughnutChart label="Traffic by service" labels={['Web','API','Worker','Static']}
    series={[{ label: 'Traffic', values: [420,310,140,90] }]} valueSuffix=" rps" />
</ArenaChartCard>
```

<!-- @api GENERATED from contracts/api/components/ArenaDoughnutChart.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `labels*` | array | `readonly string[]` |  | One label per slice, in the same order as the series' `values`. A label with no value at its index is dropped. |
| `series*` | array | `readonly ArenaSeries[]` |  | The parts, as one series whose values are read as shares of their own total. Exactly one series: a ring of two series is a sunburst, which is a different chart and not this one, so a second warns in development and is ignored. Per-slice identity goes in that series' `slots`. |
| `label*` | primitive | `string` |  | Names the chart for its accessible name and for the caption of its data table. Required and guarded rather than defaulted, because a fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing, so two charts on one page announce identically. |
| `valueSuffix` | primitive | `string` |  | Appended verbatim to every number the chart draws: the legend value and the accessible table. Not the centre label, which is a percentage rather than a value. |
| `valuePrefix` | primitive | `string` |  | Drawn verbatim before every number the chart writes, as valueSuffix is drawn after it. A currency that precedes its amount is the majority case worldwide and had no expression: with suffix alone, "1234.5 Bs." is what a chart drew where the table beside it read "Bs. 1.234,50", and the accessible table inherited the disagreement. |
| `shape` | enum | `ArenaChartShape` | `"doughnut"` | Whether the ring keeps its hole or fills to the centre. 'pie' is the same chart with the same slices, the same legend and the same table, drawn solid. It costs the centre percentage, which has nowhere to go once the hole is gone: over a wedge it would put --bone on a --color-cat slot, a pair nothing checks for contrast because nothing had drawn it. The figure is not lost, it is in the legend row and in the accessible table, which is where every other number the chart writes already is. |
| `legendLayout` | enum | `ArenaChartLegendLayout` | `"auto"` | How each legend row arranges its label and its figure. 'inline' puts them on one line, which is what fits a wide tile; 'stacked' puts the label above the figure; 'auto' measures the legend column and stacks when the row does not give. It exists because the two do not degrade equally: on one line the figure does not yield, so the label is what gets truncated, and a legend of numbers with nothing saying what they count is the opposite of a legend. The threshold is already declared, as the chart-legend-min and chart-legend-max tokens the ring width is clamped between; what was missing was the behaviour. |
| `onSliceActivate` | event | `number` |  | A slice was activated, by pointer on the arc or on its legend row, or by keyboard on that row, which is a real button and answers Enter and Space without the component binding either. It carries the slice's index in the series' `values`. **In `values`, never in the drawn paths**, and that is the whole member: a slice worth zero paints nothing, so the shapes on screen and the entries in the array are two different lists, and a consumer indexing the SVG has to reproduce that omission from outside to translate one into the other. It is reverse engineering of a component's own DOM, which the next release breaks in silence. |
| `valueFormat` | object | `ArenaNumberFormat` |  | How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number, which is what this chart drew before the member existed. |

<!-- @api end -->

**Do**
- Keep it to a handful of slices. Past five or six, the small ones are unreadable; fold the tail into "Other", or use bars.
- Let the series' `slots` default. Ramp slots 1..N in order is the rule, not a starting point to tweak.
- Use it only when the parts genuinely sum to one whole. If they don't, it is a bar chart.
- Pass `label`, because it names the chart for a screen reader and captions the numbers table. Without it the chart throws: a fallback of "Doughnut chart" identifies the chart *type* and not the chart, so two rings on one page would announce identically.
- Pass exactly one series. The slices are that series' values read as shares of their own total, and the slice identities are its `slots`.
- Pass `valueSuffix` for units. It reaches the legend and the accessible table, and never the centre percentage.

**Don't**
- Don't reach for `tone` on the series. A slice is a category by definition and a ring has no state to report, so a tone here paints every slice one colour and destroys the only thing the chart encodes.
- Don't pass a second series. A ring of two series is a sunburst, which is a different chart and not this one: the second warns in development and is ignored.
- Use `valuePrefix` for a currency that goes in front, and `valueFormat` for the number itself: locale, fraction digits, grouping, compaction. Formatting before you pass them is not an option, because what you pass is `ArenaSeries[]` and the writing happens on labels Arena generates afterwards. With no `valueFormat` the raw JavaScript number is drawn, which is what a chart always did.
- Don't go past eight categories. The ramp is eight slots and is never cycled: a ninth slice would repeat the last slot and claim two categories are one.
- Don't compare two doughnuts side by side. Reading angle differences across charts is the thing people are worst at; use grouped bars.
- Don't omit `labels`, `series` or `label`. All three are required props, and `ArenaDoughnutChart` throws from its render rather than drawing an empty ring. A required member absent is a caller bug that fails hard in every layer, not a state to render.
- Don't pass more `labels` than the series has values. A slice is drawn per value and takes the label at its own index, so a surplus label is silently dropped rather than given a legend row with no slice behind it.

### Reading a slice back, and reading a legend on a phone

`onSliceActivate` carries the index **in `values`**, and that is the whole member. A slice worth
zero paints no path, so the shapes on screen and the entries in the array are two different
lists; a consumer indexing `querySelectorAll('path')` has to reproduce that omission from
outside to translate one into the other, and the next release breaks it in silence. Both the arc
and its legend row report, so the zero-valued entry, which has no arc, is still reachable.

Every legend row is a real `<button type="button">`, so `onSliceActivate` is reachable by
keyboard and the row answers Enter and Space without the component binding either. Focus on a
row moves the same emphasis the pointer does, so the dimmed slices and the centre percentage
follow the keyboard. The ring itself takes no data cursor and needs none: a ring has no
ordered sequence to arrow along, and its rows are already one tab stop each, so a keyboard
user reaches a slice directly instead of walking to it.

`legendLayout` decides how each legend row arranges its label and its figure: `inline` on one
line, `stacked` with the label above, `auto` measuring the legend column and stacking when the
row does not give. The default is `auto`, and it matters because the two do not degrade equally:
on one line the figure does not yield, so at 390px the label is what gets cut, and a column of
numbers with nothing saying what they count is the opposite of a legend.

### Ring or solid

`shape` decides whether the hole stays. `pie` is this same chart, the same slices in the same
order with the same legend and the same table, filled to the centre. There is no ratio member:
the hole is 62% of the outer radius and that number is deliberately not a token, on the recorded
ground that a multiplier deriving one dimension from another stays inline, so handing it to a
caller one value at a time would move a design decision out of the chart.

A pie draws no centre percentage, and that is the trade rather than an oversight. There is
nowhere to put it once the hole is gone, and printing it over a wedge would put `--bone` on a
`--color-cat` slot, a pair nothing checks for contrast because nothing had ever drawn it. The
figure is still in the legend row and in the accessible table, which is where every other number
this chart writes already lives.

The accessible name follows the shape, so a pie announces as one.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
