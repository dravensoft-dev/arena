Arena doughnut, parts of one whole, hand-written SVG, every colour a token. It takes exactly
one series, whose values are read as shares of their own total. The legend is not optional:
slices are categories, and identity is never colour alone. Colours come from the categorical
ramp in order and are never cycled; a slice cannot be a status, so `tone` has no meaning on
this chart's series. The ring starts at 12 o'clock, the hole is 62% of the outer radius, and
hovering either a slice or its legend row dims the others and reads that slice's percentage
in the hole. Focusing a legend row does the same, because every row is a real button. The
numbers are also a real table for anyone who cannot see the ring.

```ts
readonly revenue = computed<ArenaSeries[]>(() => [{ label: 'Revenue', values: this.byRegion() }]);
```

```html
<arena-doughnut-chart label="Revenue by region" [labels]="regions()" [series]="revenue()"
                      valueSuffix=" €" (sliceActivate)="drillInto($event)" />
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
| `sliceActivate` | event | `number` |  | A slice was activated, by pointer on the arc or on its legend row, or by keyboard on that row, which is a real button and answers Enter and Space without the component binding either. It carries the slice's index in the series' `values`. **In `values`, never in the drawn paths**, and that is the whole member: a slice worth zero paints nothing, so the shapes on screen and the entries in the array are two different lists, and a consumer indexing the SVG has to reproduce that omission from outside to translate one into the other. It is reverse engineering of a component's own DOM, which the next release breaks in silence. |
| `valueFormat` | object | `ArenaNumberFormat` |  | How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number, which is what this chart drew before the member existed. |

<!-- @api end -->

`valueSuffix` is appended verbatim to the legend value and to the numbers table, write the
space yourself. `valuePrefix` is drawn before the number the same way, for a currency that precedes its
amount. Between them, `valueFormat` says how the number itself is written: the locale, the
fraction digits, whether thousands are grouped, whether large numbers compact to `48,2K`.
Every field is data rather than a function, which is what keeps it a member at all, and
`Intl.NumberFormat` does the work. Formatting the values before binding them is not an option
and never was: what you bind is `ArenaSeries[]`, and the writing happens on labels Arena
generates afterwards. With no `valueFormat` the raw JavaScript number is drawn, which is the
old behaviour.

`label` names the chart for a screen reader and captions the numbers table; it is required
and guarded, because a fallback of "Doughnut chart" identifies the chart type and not the
chart, and two rings on one page would announce identically. The series' own `label` names
its value column in that same table.

The series' `slots` overrides the ramp order, for when a category must keep the same colour
it has in a sibling chart:

```ts
readonly revenue = computed<ArenaSeries[]>(() => [
  { label: 'Revenue', values: this.byRegion(), slots: [3, 1, 5] },
]);
```

The chart sizes itself to its container, give it a parent with a width (an
`arena-chart-card` is the usual one) rather than setting a width on the chart. The host is
the flex row itself: the ring is one item, the legend the other, and the host is what gets
measured.

**Do / Don't**
- Keep it to five or six slices. Past that the arcs stop being comparable and a bar chart
  reads better. That is not a rendering limit; it is what the shape can carry.
- Make sure the values really are parts of one whole. Two doughnuts whose slices come from
  different totals are two charts that look like one.
- Don't ask for a ninth colour. The ramp has eight slots and is never cycled, so a ninth
  slice repeats slot 8 rather than silently claiming two categories are one, fold the tail
  into "Other" instead.
- Don't use it for change over time. That is `arena-line-chart`.
- Don't pass a second series. A ring of two series is a sunburst, which is a different chart
  and not this one: the second warns in development and is ignored.
- Don't reach for `tone` on the series. A slice is a category by definition, so a tone here
  paints every slice one colour and destroys the only thing the chart encodes.
- Don't omit `labels`, `series` or `label`. All three are required inputs, and Angular throws
  NG0950 on the first read rather than drawing an empty ring. A chart with no data is a
  caller bug, not a state to render.
- Don't pass more `labels` than the series has values. A slice is drawn per value and takes
  the label at its own index, so a surplus label is silently dropped rather than given a
  legend row with no slice behind it.
- Don't place it on a surface other than `--surface-card`. The gap between slices is that
  surface showing through a `--surface-card` stroke, not a border on the slice; on a
  different background the gaps read as stripes of the wrong colour.

**The legend is keyboard-reachable, one row at a time.** Every legend row is a real
`<button type="button">`, reset to look like text, so `(sliceActivate)` is reachable by
keyboard and each row answers Enter and Space without the component binding either. Focus on
a row moves the same emphasis the pointer does, so the dimmed slices and the centre
percentage follow the keyboard as well as the mouse.

The legend column keeps `role="group"` and `aria-label="Doughnut chart legend"` and carries
no tab stop of its own. Carrying one, as an `overflow: auto` scroll region with nothing
focusable inside it, lets a keyboard user scroll the legend and activate nothing: WCAG 2.1.1
with a real victim. Since the rows take focus the stop would be dead anyway, and a focusable
child scrolls its own overflow ancestor into view. `role="group"` is chosen over the WAI scrollable-region pattern's `role="region"` because a region is meant to
be a landmark a user jumps to directly, and this column is one row of a small chart rather
than a page landmark; `aria-label` names it either way.

The ring itself takes no data cursor and needs none. A ring has no ordered sequence to arrow
along, and its rows are already one tab stop each, so a keyboard user reaches a slice
directly instead of walking to it. That is the one place this chart parts company with
`arena-bar-chart` and `arena-line-chart`, which have an axis and therefore a cursor.

### Reading a slice back, and reading a legend on a phone

`(sliceActivate)` carries the index **in `values`**, and that is the whole member. A slice worth
zero paints no path, so the shapes on screen and the entries in the array are two different
lists; a consumer indexing `querySelectorAll('path')` has to reproduce that omission from
outside to translate one into the other, and the next release breaks it in silence. Both the arc
and its legend row report, so the zero-valued entry, which has no arc, is still reachable, and
reachable by keyboard because the row is a button.

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

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
