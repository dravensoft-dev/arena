Arena gauge, one value against a scale, drawn as a 270 degree dial that opens at the bottom. Both ends and every band edge are written on the dial, and the band the value is in is named under the reading.

```ts
readonly bands: ArenaGaugeBand[] = [
  { from: 0, tone: 'success', label: 'Healthy' },
  { from: 60, tone: 'warning', label: 'Elevated' },
  { from: 85, tone: 'danger', label: 'Critical' },
];
```

<!-- @api GENERATED from contracts/api/components/ArenaGaugeChart.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `value*` | primitive | `number` |  | The one reading. A single number is not a series, so it is not an ArenaSeries. The drawing clamps it to the scale and the words never do. The centre reading and the table write the number passed, so 130 on a scale of 0 to 100 draws the arc at the end and still says 130. A non-finite value is not a zero: the gauge draws the empty track and leaves the reading and its table cell empty. |
| `label*` | primitive | `string` |  | Names the gauge for its accessible name and for the caption of its data table. Required and guarded rather than defaulted, because a fallback of the chart type would announce two gauges on one page identically. |
| `min` | primitive | `number` | `0` | The low end of the scale, where the arc begins. The start of the dial and the table both write it. |
| `max` | primitive | `number` | `100` | The high end of the scale, where the arc ends and where the last band stops. A `max` not greater than `min` warns once and draws the empty track, because there is no scale to place a value on. |
| `bands` | array | `readonly ArenaGaugeBand[]` |  | What the scale means. Each band runs from its `from` to the next band's `from`, and the last to `max`, and the arc takes the colour of the band the value is in. A value below the first band is in no band and takes the `colorStart` slot. Absent, the arc is one identity colour and no band is drawn. Data rather than a threshold function, so the dial and the table are cut from the same list. An unsorted list is configuration and not data, so it warns once and is read in order of `from`. A band without a `label` throws, because a status colour never ships without its word. |
| `colorId` | primitive | `number` |  | The identity slot of the arc when there are no `bands`, clamped to the ramp, `colorStart` when absent. With `bands` it is ignored with a development warning, because a chart carries identity or meaning and never both. |
| `colorStart` | enum | `ArenaCatSlot` | `1` | The ramp slot the arc takes when there are no `bands` and no `colorId`, and the slot a value below the first band takes. With `bands`, the band's tone wins. Absent, 1. |
| `valueSuffix` | primitive | `string` |  | Appended verbatim to every number the gauge writes: the centre reading, the end labels, the band edges and the accessible table. Carries its own leading space if one is wanted. |
| `valuePrefix` | primitive | `string` |  | Drawn verbatim before every number the gauge writes, as valueSuffix is drawn after it, for a currency that precedes its amount. |
| `valueFormat` | object | `ArenaNumberFormat` |  | How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number. |
| `height` | primitive | `number` | `200` | The dial's height in px, the --chart-gauge-height token by default, a size at which a 270 degree dial with its end labels and its centre reading fits a tile. The radius is derived from it, so the band ring, the track and the reading move together. A number rather than a dimension string, because the gauge does arithmetic with it to place every mark. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none (`figure-with-data-table`).
<!-- @keys end -->

```html
<arena-gauge-chart label="CPU load" [value]="72" valueSuffix=" %" [bands]="bands" />
<arena-gauge-chart label="Disk used" [value]="38" valueSuffix=" %" [colorId]="2" />
<arena-gauge-chart label="Core temperature" [value]="61" [min]="-20" [max]="120" valueSuffix=" °C" />
```

**Do**
- Give `label` a name of its own for every gauge. The name becomes the accessible name and the caption of the hidden table, so two gauges on one page need two names.
- Give every band a `label`. The word under the reading and the row in the table are what a reader who cannot tell the hues apart receives.
- Pass the number as measured. The arc clamps to the scale, and the reading and the table write what was passed. A 130 on a scale of 0 to 100 draws a full arc and says 130.
- Hold `bands` in a field or a `computed()`. A new array literal in the template is a new reference on every change detection cycle.
- Pass `bands` sorted by `from`. Each band runs to the next band's `from`, and the last runs to `max`.
- Pass `min` and `max` when the scale is not 0 to 100. A band edge outside them is not drawn.
- Pass `valueSuffix` for the unit. The suffix reaches the reading, both ends, the band edges and the table.

**Don't**
- Don't add a needle, a legend or a gradient. The bands are labelled on the dial and listed in the table, and a needle claims a precision the band does not state.
- Don't colour the arc from the number alone. Colour is a band, and a band has a word.
- Don't pass a formatter or a threshold function. `bands` is data, so the dial and the table are cut from the same list.
- Don't clamp the number before passing it. The drawing clamps and the words do not.
- Don't pass `colorId` beside `bands`. A chart carries identity or meaning and never both, so the `colorId` is ignored with a development warning.
- Don't use the gauge for a task that ends. An upload or a deploy is `arena-progress-bar`.
- Don't use the gauge as a form-register indicator in a row. A scale read inline, with a name and a standing, is `arena-meter`.
- Don't omit `value` or `label`. Both are required inputs, and Angular throws NG0950 on the first read rather than drawing an empty dial.
- Don't give `label` or a band's `label` an empty string. `arena-gauge-chart` throws from its render rather than drawing an unnamed dial or a status colour without its word.
- Don't write a number as an attribute string. A bare `value="72"` arrives as text and not as a number. The dial then draws empty. Bind `[value]`, `[min]` and `[max]` instead.

### One figure, no tab stop

The gauge is a named picture plus the visually hidden table of its numbers. The gauge takes no tab stop, no cursor and no tooltip. The value, both ends and every band edge are written on the dial as text and are in the table. The table lists the value, the minimum, the maximum and one row per band with its range.

### Where the dial starts

The sweep is 270 degrees clockwise, from the 7:30 position to the 4:30 position. A scale has two ends, so the dial does not begin at 12 o'clock as the ring charts do. A value outside the scale pins the arc at the nearer end, and a value that is not a number draws the empty track with no reading.

### Size

The gauge fills the width of its container. The host is boxless, and the frame inside it carries the box, which takes the height of `height`, the `--chart-gauge-height` token by default. The dial's radius is the largest that fits both the width and the height, so the band ring, the track and the centre reading move together.

### Checks to make by hand

The suites run without layout, so four claims are checked in a browser:
1. The centre reading does not touch the arc at the base, comfortable and compact densities, nor in a container 390px wide.
2. The band edge numbers do not collide at a narrow dial.
3. The arc and the band ring are distinguishable in the dark and in the light scope.
4. A screen reader reads the table's value row with its unit.

**Words.** A gauge is named by the locale's `gaugeChartName`, where `{label}` stands for `label`. The table is headed by `gaugeTableMeasure` and `gaugeTableValue`, its first rows are named by `gaugeTableValue`, `gaugeTableMinimum` and `gaugeTableMaximum`, and a band's range is written through `gaugeTableRange`.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
