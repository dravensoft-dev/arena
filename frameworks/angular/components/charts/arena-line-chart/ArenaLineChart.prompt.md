Arena line chart, a value over an ordered sequence, hand-written SVG, every colour a token.
It takes series, one polyline each over the same sequence, and a series names itself. An
optional 18% area tint sits under the line, for one series only. The crosshair snaps to the
nearest point rather than drifting between them, and the numbers are also a real table for
anyone who cannot see the line. Identity comes from a series' `slot`, meaning from its
`tone`; passing both warns and `tone` wins, because a chart carries identity or meaning,
never both.

```ts
readonly p95 = computed<ArenaSeries[]>(() => [{ label: 'p95 latency', values: this.latency(), slot: 3 }]);
readonly percentiles = computed<ArenaSeries[]>(() => [
  { label: 'p50', values: this.median() },
  { label: 'p95', values: this.latency() },
]);
readonly errors = computed<ArenaSeries[]>(() => [{ label: 'Error rate', values: this.errorRate(), tone: 'danger' }]);
```

```html
<arena-line-chart label="Request latency" [labels]="days()" [series]="p95()" [area]="true" valueSuffix=" ms" />
<arena-line-chart label="Request latency" [labels]="days()" [series]="percentiles()" valueSuffix=" ms" />
<arena-line-chart label="Error budget" [labels]="days()" [series]="errors()" valueSuffix="%" />
```

<!-- @api GENERATED from contracts/api/components/ArenaLineChart.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `labels*` | array | `readonly string[]` |  | One label per point, in the same order as every series' `values`. A label with no value in a series ends that series' line there rather than dropping to zero. |
| `series*` | array | `readonly ArenaSeries[]` |  | The plotted series, drawn as one polyline each over the same ordered sequence. One series is the common case and draws exactly what it drew before. The area fill is refused past one series, because two fills occlude each other and the reader cannot tell which value either edge belongs to. |
| `label*` | primitive | `string` |  | Names the chart for its accessible name and for the caption of its data table. This is the CHART's name, not a series': a series names itself. Required and guarded rather than defaulted, because a fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing, so two charts on one page announce identically. |
| `area` | primitive | `boolean` | `false` | Fill under the line at 18% of the series colour: a tint, never a gradient. For a single series; two fills occlude each other. |
| `curve` | primitive | `boolean` | `false` | Draw the series as a smooth curve rather than straight segments between points. The interpolation is monotone cubic, not Catmull-Rom, and that is the whole of the decision: a Catmull-Rom curve overshoots, so between two measured points it draws a peak or a trough nobody measured, and a chart that draws data which does not exist is the one thing a chart may not do. A monotone curve stays inside the band its own two points define, keeps a flat tangent at a turning point, and never crosses zero unless the values do. It changes the path string and nothing else: the points, the crosshair, the tooltip and the data cursor read the same numbers at the same places. |
| `valueSuffix` | primitive | `string` |  | Appended verbatim to every number the chart draws: the axis ticks, the tooltip and the accessible table. Carries its own leading space if one is wanted. |
| `valuePrefix` | primitive | `string` |  | Drawn verbatim before every number the chart writes, as valueSuffix is drawn after it. A currency that precedes its amount is the majority case worldwide and had no expression: with suffix alone, "1234.5 Bs." is what a chart drew where the table beside it read "Bs. 1.234,50", and the accessible table inherited the disagreement. |
| `valueFormat` | object | `ArenaNumberFormat` |  | How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number, which is what this chart drew before the member existed. |
| `height` | primitive | `number` | `280` | The plot's height in px, the --chart-height token by default. A number rather than a dimension string, because the chart does arithmetic with it to place every mark, and a caller-supplied "20rem" is neither a token nor a derivation of one. |
| `minPointSpacing` | primitive | `number` |  | The narrowest gap, in px, the chart draws between two adjacent points. Below it the chart stops compressing and overflows its container horizontally instead, scrolled and anchored to the most recent point: marker spacing is a legibility constant, not something that yields to the viewport, and thirty days in 390px is unreadable at any font size. Absent, the chart fits whatever width it is given. The rail it scrolls in is the same region the data cursor lives in, and it is keyboard-reachable whether it overflows or not. |

<!-- @api end -->

`valueSuffix` is appended to the tick labels, the tooltip and the numbers table together,
so a unit written once appears everywhere. It is appended verbatim, write the space
yourself:

```html
<arena-line-chart label="Request latency" [labels]="days()" [series]="p95()" valueSuffix=" ms" />
```

`valuePrefix` is drawn before the number the same way, for a currency that precedes its
amount. Between them, `valueFormat` says how the number itself is written: the locale, the
fraction digits, whether thousands are grouped, whether large numbers compact to `48,2K`.
Every field is data rather than a function, which is what keeps it a member at all, and
`Intl.NumberFormat` does the work. Formatting the values before binding them is not an option
and never was: what you bind is `ArenaSeries[]`, and the writing happens on labels Arena
generates afterwards. With no `valueFormat` the raw JavaScript number is drawn, which is the
old behaviour.

The chart sizes itself to its container, give it a parent with a width (an
`arena-chart-card` is the usual one) rather than setting a width on the chart. The host
is a block-level, positioned box: it is what gets measured, and it is what the hover
tooltip is positioned against.

**Do / Don't**
- Give `label`, because it names the chart for a screen reader and captions the numbers
  table underneath. Give every series its own `label` too: that one heads the series' own
  column in the same table, and the two names are different things.
- Use `area` for a volume or a total, not for a rate. A filled area says "this much of
  something"; a rate has nothing to fill.
- Use `tone` only when the series genuinely *is* a state. A red line means "bad", and a
  red line that just means "the third series" makes the chart lie.
- Don't plot two series by stacking two line charts. Put both in `series` and they share
  one scale, one axis and one table. Two series that do *not* share a scale are two
  charts, and no member will make them one.
- Don't turn `area` on past one series. It is refused and warns in development, because
  two fills occlude each other and the reader cannot tell which value either edge belongs to.
- Don't omit `labels`, `series` or `label`. All three are required inputs, and Angular
  throws NG0950 on the first read rather than drawing an empty box. A chart with no data
  is a caller bug, not a state to render.
- Don't pass more `labels` than a series has values. A point is drawn per value and takes
  the label at its own index, so a surplus label is silently dropped rather than drawn with
  no point above it. A series shorter than its neighbours ends its line there rather than
  dropping to zero, because a missing number is not a zero.
- Don't build the `series` array inline in the template if the data changes. A new array
  literal on every change detection cycle is a new reference every cycle; hold it in a
  `computed()` or a field so the chart re-reads only when the numbers actually move.
- Don't express a condition as an attribute string. `area` carries the
  `booleanAttribute` transform, so a bare `area` and `[area]="true"` both mean true, and
  the one literal string `"false"` means false. Every *other* string is true, `"0"`,
  `"off"` and `"no"` all draw the fill. Bind a computed value instead:
  `[area]="isVolume"`. Keep the bare attribute for a constant true.


### When the points stop fitting

`minPointSpacing` is the narrowest gap, in px, the chart will draw between two adjacent
points. Below it the chart stops compressing and overflows its container sideways instead,
in a rail that scrolls and starts anchored to the most recent point. Marker spacing is a
legibility constant rather than something that yields to the viewport: thirty days in 390px
is unreadable at any font size.

Arena computes the minimum width from its own axis padding, so nothing outside needs to know
what that padding is, and the rail is the chart's own box rather than the card's: an
`arena-chart-card` around it needs no change. The rail carries `tabindex="0"` and a
`role="group"` named after the chart whether it overflows or not.

`height` is the plot's height in px, the `--chart-height` token by default. It is a number
rather than a length string, because the chart does arithmetic with it to place every mark.

### Reading the line without a pointer

The rail is one keyboard region and it is the plot's only tab stop. Inside it, Arrow Left and
Arrow Right move a data cursor from point to point, clamping at the ends rather than wrapping,
Home and End jump to the first and the last, and Escape clears it. The cursor drives exactly
what hover drives: the enlarged point, the crosshair and the tooltip.

Nothing inside the graphic is focusable, and that is deliberate rather than an omission. A
`role="img"` subtree is presentational, so no ARIA on a mark inside it reaches a screen reader
however correct it is. A screen reader gets the visually hidden table of the same numbers,
which is already there; a sighted keyboard user gets the cursor. There is no third copy of the
numbers for either of them to disagree with.

On a touch screen the rule is tap to read, drag to scroll: a tap reads the point nearest the
finger, a drag scrolls the rail, and a reading stays up until the next tap because a lifted
finger has no leave event to clear it. Nothing captures the pointer and nothing calls
`preventDefault`, so the page keeps scrolling over the chart the way it does over anything else.

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

### Straight or smooth

`curve` draws the series as a smooth curve instead of straight segments. It changes the path
string and nothing else: the points sit where they sat, the crosshair snaps to the same one, the
tooltip reads the same numbers and the data cursor walks the same sequence.

The interpolation is monotone cubic rather than Catmull-Rom, and that choice is the whole reason
this member is safe to use on real data. A Catmull-Rom curve overshoots, so between two measured
points it draws a peak or a trough nobody measured, and a chart that draws data which does not
exist is the one thing a chart may not do. A monotone curve stays inside the band its own two
points define, flattens at a turning point instead of sailing past it, and never crosses zero
unless the values do.

Reach for it when the underlying quantity really is continuous, a temperature or a load average
sampled at intervals. Leave it off when the points are discrete events counted per bucket: a
smooth line between two counts implies values between them that were never counted.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
