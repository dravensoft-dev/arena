Arena sparkline, a word-sized line for one series, drawn in a table cell or beside a number. No axis, no labels and no legend. The scale is the data's own range, so the line shows direction and rhythm, never magnitude.

```ts
readonly week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
readonly requests = computed<ArenaSeries[]>(() => [{ label: 'Requests per minute', values: this.perMinute() }]);
readonly errors = computed<ArenaSeries[]>(() => [{ label: 'Error rate', values: this.errorRate(), tone: 'danger' }]);
```

<!-- @api GENERATED from contracts/api/components/ArenaSparkline.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `labels*` | array | `readonly string[]` |  | One label per point, in the order of the series' `values`. A label heads its row of the hidden table and the tooltip. A label with no value ends the line there rather than dropping it to zero. |
| `series*` | array | `readonly ArenaSeries[]` |  | The series drawn, exactly one. A second warns and is ignored, because a sparkline has no legend to say which line is which. `tone` is the only trend colour; without it the line takes the identity colour of the first slot, which says nothing about whether the trend is good. |
| `colorStart` | enum | `ArenaCatSlot` | `1` | The ramp slot the line takes when its series names no colour of its own. Absent, 1. |
| `label*` | primitive | `string` |  | Names the sparkline for its accessible name and for the caption of its data table. Required and guarded rather than defaulted: a table cell holding six sparklines needs six distinct names, and a fallback of the chart type would announce all six identically. |
| `area` | primitive | `boolean` | `false` | Fill under the line at 18% of the series colour: a tint, never a gradient. The fill reaches the floor of the box, which is the lowest value and not zero. The fill therefore shades the shape and measures nothing. |
| `curve` | primitive | `boolean` | `false` | Draw the series as a smooth curve rather than straight segments between points. The interpolation is monotone cubic, not Catmull-Rom. A Catmull-Rom curve overshoots and draws a peak or a trough nobody measured. A monotone curve stays inside the band its own two points define. The curve changes the path string and nothing else. |
| `interactive` | primitive | `boolean` | `false` | Whether the plot answers the pointer and the keyboard: one tab stop whose arrow keys move a data cursor, a crosshair, an enlarged dot and a tooltip. Off by default, because the common place of a sparkline is a table cell, where every interactive one adds a tab stop to the page. A declared boolean rather than one derived from a bound listener, because a sparkline reports nothing to listen to. |
| `valueSuffix` | primitive | `string` |  | Appended verbatim to every number the sparkline writes: the tooltip and the accessible table. Carries its own leading space if one is wanted. |
| `valuePrefix` | primitive | `string` |  | Drawn verbatim before every number the sparkline writes, as valueSuffix is drawn after it, for a currency that precedes its amount. |
| `valueFormat` | object | `ArenaNumberFormat` |  | How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number. |
| `height` | primitive | `number` | `20` | The plot's height in px, the --chart-sparkline-height token by default. That token is the line box of a compact table row, so a sparkline in a cell leaves the row the height its text gives it. A number rather than a dimension string, because the sparkline does arithmetic with it to place every point. |

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
<arena-sparkline label="Requests this week" [labels]="week" [series]="requests()" />
<arena-sparkline label="Error rate this week" [labels]="week" [series]="errors()" valueSuffix="%" />
<arena-sparkline label="Latency today" [labels]="hours()" [series]="latency()" valueSuffix=" ms" interactive />
```

**Do**
- Give `label` a name of its own for every sparkline. A table column of six sparklines needs six names, because each one becomes an accessible name and a table caption.
- Put the number the reader needs beside the sparkline. The line shows the shape of the data, and the hidden table carries every value for a screen reader.
- Bind `tone` only when the trend is a state. Latency falling is good and revenue falling is bad, so the default colour says nothing about either.
- Leave `interactive` off in a table. A static sparkline adds no tab stop, so Tab leaves the grid in one press.
- Turn `interactive` on for a standalone sparkline. The plot then becomes one tab stop, and the arrow keys walk the points with a crosshair and a tooltip.
- Hold `series` in a `computed()` or a field. A new array literal in the template is a new reference on every change detection cycle.

**Don't**
- Don't read magnitude off the line. The box spans the lowest to the highest value, so a change of 120 to 180 fills the box as fully as a change of 0 to 1000.
- Don't bind a second series. A sparkline has no legend to tell two lines apart, so the second warns in development and is ignored.
- Don't colour the line by direction. A trend is meaning, and only `tone` carries meaning.
- Don't add axes, ticks, gridlines or labels around it. Reach for `arena-line-chart` when the reader needs to read values off the plot.
- Don't put a sparkline inside `arena-stat-card`. Compose one beside the card in an `arena-grid` instead.
- Don't omit `labels`, `series` or `label`. All three are required inputs, and Angular throws NG0950 on the first read rather than drawing an empty box.
- Don't make every sparkline of a table column `interactive`. Each interactive one is a control inside a cell and keeps its own place in the page's Tab sequence.
- Don't express `interactive`, `area` or `curve` as an attribute string. Only the literal string `"false"` means false, and every other string, `"0"` and `"off"` among them, means true. Bind a computed value instead, and keep the bare attribute for a constant true.

### Two cases, chosen by `interactive`

The default is the static case. The figure is a named picture plus the visually hidden table of its numbers, with no tab stop, no cursor, no tooltip and an inert pointer. The last point carries a dot at the point radius, so the reader sees where now is. No minimum or maximum markers are drawn, because the table already answers that question.

With `interactive`, the plot is one keyboard region with the sparkline's name. Arrow Left and Arrow Right move a data cursor from point to point, clamping at the ends. Home and End jump to the first and the last, and Escape clears the cursor. The cursor drives a dashed crosshair, an enlarged dot and a tooltip, exactly what hover drives. The tooltip slides with the cursor, so the readout stays inside the frame at both ends.

### Size

The sparkline fills the width of its container, so in a table cell the column decides it. The host is boxless, and the frame inside it carries the box. `height` is the plot's height in px, the `--chart-sparkline-height` token by default. The default is the line box of a compact table row, so a sparkline in a cell leaves the row the height its text gives it. With `interactive`, the keyboard region is never shorter than the density's smallest control height, and the plot sits centred in it.

### Checks to make by hand

The suites run without layout, so five claims are checked in a browser:
1. A table row at the base, comfortable and compact densities keeps its height when a sparkline is added to one of its cells.
2. A table column of static sparklines adds no tab stop, so Tab leaves the grid in one press.
3. A screen reader announces the hidden table inside a grid cell once, and row navigation in the grid still works.
4. The end dot is not clipped at either edge, at all three densities.
5. An interactive tooltip near the right edge of a card is not clipped by an ancestor with `overflow: hidden`.

**Words.** A sparkline is named by the locale's `sparklineChartName`, where `{label}` stands for `label`; `chartTablePoint` heads the first column of the table it writes for a screen reader.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
