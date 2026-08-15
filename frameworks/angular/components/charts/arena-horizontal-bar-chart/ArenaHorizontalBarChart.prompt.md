Categorical bars running across the plot, with the category names down its left edge. Same data, same accessible table and same series as `ArenaBarChart`, with the axes transposed. Reach for it when the category names are worth reading: across the bottom of a vertical chart they get rotated or truncated, and here they have a gutter of their own.

```ts
readonly issues = computed<ArenaSeries[]>(() => [{ label: 'Open issues', values: this.counts() }]);
readonly spend = computed<ArenaSeries[]>(() => [
  { label: 'Cloud', values: this.cloud() },
  { label: 'Licences', values: this.licences() },
]);
```

<!-- @api GENERATED from contracts/api/components/ArenaHorizontalBarChart.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `labels*` | array | `readonly string[]` |  | One label per category, in the same order as every series' `values`. They run down the left edge, in the gutter chart.pad-category holds, and a name longer than that gutter is truncated rather than pushed into the plot. |
| `series*` | array | `readonly ArenaSeries[]` |  | The plotted series, drawn as one group of bars per category. One series is the common case; two or more share each category's band, so the bars of one category stand one above the other and the reader compares within a category before comparing across. The ramp clamps at its last slot rather than cycling, so a ninth series folds into "Other" upstream, never into a colour already spent. |
| `label*` | primitive | `string` |  | Names the chart for its accessible name and for the caption of its data table. This is the CHART's name, not a series': a series names itself. Required and guarded rather than defaulted, because a fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing, so two charts on one page announce identically. |
| `stack` | primitive | `boolean` | `false` | Sit each series on the one before it inside a single band per category, rather than standing them one above the other. Stack when the series are parts of one total and that total is the thing being read; leave it off when the comparison is between the series, because a segment that does not start at zero is one a reader cannot measure against its neighbours. Positive and negative values stack on their own runs, so a category holding both grows in both directions from the zero line. |
| `valueSuffix` | primitive | `string` |  | Appended verbatim to every number the chart draws: the axis ticks, the tooltip and the accessible table. Carries its own leading space if one is wanted. |
| `valuePrefix` | primitive | `string` |  | Drawn verbatim before every number the chart writes, as valueSuffix is drawn after it. A currency that precedes its amount is the majority case worldwide and had no expression: with suffix alone, "1234.5 Bs." is what a chart drew where the table beside it read "Bs. 1.234,50", and the accessible table inherited the disagreement. |
| `valueFormat` | object | `ArenaNumberFormat` |  | How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number, which is what this chart drew before the member existed. |
| `height` | primitive | `number` | `280` | The plot's height in px, the --chart-height token by default. On this chart it is the axis the categories run down, so a chart of many categories wants more of it: pass the room the data needs rather than letting the bands thin out. There is no scrolling rail here on purpose, because a vertical scroll region nested in a page takes the page's own scroll away from the reader, which is the reasoning that already keeps touch-action off the horizontal one. A number rather than a dimension string, because the chart does arithmetic with it to place every mark. |

<!-- @api end -->

```html
<arena-horizontal-bar-chart label="Open issues by area" [labels]="areas()" [series]="issues()" />

<arena-horizontal-bar-chart label="Spend by quarter" [labels]="quarters()" [series]="spend()" stack
                            valuePrefix="$" [valueFormat]="{ compact: true }" />
```

### Why this is a component and not an orientation

Transposing the axes changes what four members mean, which is why `arena-bar-chart` has no
`orientation` flag. The data cursor answers ArrowUp and ArrowDown here, and leaves the horizontal
pair to the page. The category gutter is its own token rather than the value gutter widened, so a
vertical chart does not pay 52px for names it does not draw. `height` stops being a fixed frame
and becomes the axis the categories run down. And there is no scrolling rail.

That last one is deliberate rather than missing. `arena-bar-chart` overflows sideways into a rail
when the points stop fitting, and sideways is a direction a page does not use. Down is the
direction a page already scrolls, so a rail here would take the page's own scroll away from
anyone passing through the chart, which is the reasoning that already keeps `touch-action` off
the horizontal one. A chart of many categories asks for the room instead: give `height` what the
data needs.

### Reading the bars without a pointer

The plot is one keyboard region and the only tab stop. ArrowUp and ArrowDown move a data cursor
from category to category, clamping at the ends rather than wrapping, Home and End jump to the
first and the last, and Escape clears it. ArrowLeft and ArrowRight do nothing and are not
consumed, because this chart has no sequence along that axis and swallowing a key it cannot use
would strand a reader.

Nothing inside the graphic is focusable. A `role="img"` subtree is presentational, so a screen
reader gets the visually hidden table of the same numbers and a sighted keyboard user gets the
cursor.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
