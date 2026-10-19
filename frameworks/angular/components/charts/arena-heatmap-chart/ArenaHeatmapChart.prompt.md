Values on a grid of two categories, each cell filled by the step of five equal bins its value falls in. Hovering a cell, or moving the cursor onto it, outlines it and shows its tooltip.

```ts
readonly hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
readonly days: ArenaSeries[] = [
  { label: 'Mon', values: [4, 2, 1, 81, 176, 264] },
  { label: 'Tue', values: [3, 1, 2, 74, 190, 281] },
  { label: 'Wed', values: [5, 2, 2, 69, 183, 270] },
];
```

```html
<arena-heatmap-chart label="Sign-ups by hour" [labels]="hours" [series]="days" [valueFormat]="{ grouping: true }" />

<!-- many columns that must stay readable on a phone: the plot scrolls sideways -->
<arena-heatmap-chart label="Sign-ups by hour" [labels]="hours" [series]="days" [minCellWidth]="28" />
```

<!-- @api GENERATED from contracts/api/components/ArenaHeatmapChart.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `labels*` | array | `readonly string[]` |  | One label per column, along the bottom edge, in the same order as every series' `values`. A column with no label has an empty name in the table and the tooltip. |
| `series*` | array | `readonly ArenaSeries[]` |  | One series per row, top to bottom in the order given, its `label` the row's name and its `values` the row's cells, one per column. A short row leaves its last cells empty, and an empty or non-finite cell is drawn with an outline and no fill, because missing is not low. `colorId`, `colorIds` and `tone` are ignored with one development warning, because a cell's colour is its magnitude. |
| `label*` | primitive | `string` |  | Names the chart for its accessible name and for the caption of its data table. The name is for the CHART, and a series names itself. Required and guarded rather than defaulted: a fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing, so two charts on one page announce identically. |
| `valuePrefix` | primitive | `string` |  | Drawn verbatim before every number the chart writes: the legend, the tooltip and the accessible table, as valueSuffix is drawn after it. |
| `valueSuffix` | primitive | `string` |  | Appended verbatim to every number the chart writes: the legend, the tooltip and the accessible table. Carries its own leading space if one is wanted. |
| `valueFormat` | object | `ArenaNumberFormat` |  | How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number. |
| `minCellWidth` | primitive | `number` |  | The narrowest a column is drawn, in px. Below it the plot stops compressing and overflows its container sideways, in the region that is the plot's one tab stop. Absent, the plot fits whatever width it is given. |
| `height` | primitive | `number` |  | The plot's height in px. Absent, the height is computed from the row count, one row pitch for each row plus the pads and the legend strip. A chart with many rows therefore grows with its data. The height is the axis the rows run down, so a caller with a fixed tile passes the room it has. A number rather than a dimension string, because the chart does arithmetic with it to place every mark. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys**, from [`figure-with-data-table`](../../../../../contracts/behaviour/figure-with-data-table.json):
- `ArrowLeft`: moves the data cursor to the previous point, clamping at the first.
- `ArrowRight`: moves the data cursor to the next point, clamping at the last.
- `ArrowUp`: moves the data cursor to the previous point, clamping at the first, on a chart whose categories run down the plot rather than across it.
- `ArrowDown`: moves the data cursor to the next point, clamping at the last, on a chart whose categories run down the plot rather than across it.
- `Escape`: clears the data cursor.
- `data-cursor-2d`: an addition of this component, see its binding.
<!-- @keys end -->

### What the drawing says

Each row is one series and each column is one label. A cell sits where its row and its column cross.
A cell is filled with one of five steps, and the step is the whole of its colour.
The five bins are equal in width and run over round edges, so every edge the legend writes is a round number.
A value on an edge belongs to the higher bin, and the largest value belongs to the top one.
The bins are never quantiles. A top step that always held the same share of cells would say nothing about the size of the numbers.

### Colour is magnitude

More is more contrast with the surface, darker on a light page and lighter on a dark one.
The order therefore reads the same in grey-scale and under colour vision deficiency.
The steps are read by magnitude only. `colorId`, `colorIds` and `tone` on a series are ignored with one development warning, because a row has no identity or state of its own here.
Never ask for a hue, a ramp of your own or a colour function. A plugin that wants other steps answers the five heat roles and keeps their order.
No text lies over a cell. The legend below the plot is the key, and the table holds every number.

### Missing is not low

A cell with no value, or a value that is not finite, is drawn with an outline and no fill.
A zero is a value, so on non-negative data it takes step 1.
A short row leaves its last cells outlined and its table cells empty.

### Reading it without a pointer

The plot is one tab stop, and it is a named group whether or not it scrolls sideways.
The four arrows move a cursor across cells, and each one stops at the edge of the grid without wrapping.
Home and End go to the first and the last cell of the current row, and Escape clears the cursor.
While the plot has focus the arrows are its own and the page does not scroll. Tab leaves it in one press.
The cursor drives the outlined cell and the tooltip, as hover does. The tooltip reads the column name and the row's number.

### Columns that do not fit

With `minCellWidth` absent, the plot fits its container.
Twenty-four columns in a narrow container leave labels that would overlap. The chart then writes one column label in every few.
The rest stay in the table, the tooltip and the cursor.
Pass `minCellWidth` when every column label must stay readable on a phone. Below that width the plot scrolls sideways in its rail.

### Size

Without `height`, the chart is tall enough for its rows: one row pitch for each row, plus the pads and the legend strip.
Pass `height` for a fixed tile. The legend strip comes out of that height and the rows share the rest.
The row names run down the left edge, so a long name is clipped by the gutter rather than widening it.

### Do and don't

- Do name the chart, give every series its own `label`, and give `labels` one entry for each column.
- Do keep each row the same length as `labels`. A shorter row shows outlined cells, the way missing data reads.
- Do pass non-negative magnitudes such as counts, durations and rates.
- Don't ask for a gradient or a continuous legend. The key is five discrete steps.
- Don't ask for numbers on the cells, or for quantile bins.
- Don't use a heatmap for fewer than three rows and three columns, which is a bar chart.
- Don't use it for signed data about a centre. A diverging scale is another component.

**Words.** The chart's accessible name is `heatmapChartName`, with its `label` in `{label}`, and the first heading of its data table is `heatmapTableRow`.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
