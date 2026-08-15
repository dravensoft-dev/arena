A population pyramid: two counts per band, mirrored about a shared centre line, with the band names down the left edge. Diverging from a centre is the point rather than an option, which is why it is its own component and not a flag on a bar chart.

```tsx
<ArenaPyramidChart label="Population by age band"
  labels={['65+', '45-64', '30-44', '18-29', '0-17']}
  series={[
    { label: 'Women', values: [312, 604, 731, 688, 542] },
    { label: 'Men', values: [268, 581, 742, 705, 561] },
  ]} />
```

<!-- @api GENERATED from contracts/api/components/ArenaPyramidChart.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `labels*` | array | `readonly string[]` |  | One label per band, in the same order as both series' `values`, running down the left edge. On a population pyramid these are the age brackets, oldest first or youngest first as the data is given: the chart does not reorder them, because which end is the top is a decision about the population and not about the drawing. |
| `series*` | array | `readonly ArenaSeries[]` |  | Exactly two series, one for each side of the centre line, in order: the first is drawn to the left and the second to the right. Both carry counts rather than signed values, and the chart negates the first when it draws it, so the accessible table reads the numbers that were passed and the picture reads the shape they make. A third series has nowhere to go and warns; a single one is a horizontal bar chart and should be one. |
| `label*` | primitive | `string` |  | Names the chart for its accessible name and for the caption of its data table. This is the CHART's name, not a series': a series names itself. Required and guarded rather than defaulted, because a fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing, so two charts on one page announce identically. |
| `valueSuffix` | primitive | `string` |  | Appended verbatim to every number the chart draws: the axis ticks, the tooltip and the accessible table. The ticks carry the magnitude, never the minus sign the left side is drawn with, because both sides count upward from the centre. |
| `valuePrefix` | primitive | `string` |  | Drawn verbatim before every number the chart writes, as valueSuffix is drawn after it. A currency that precedes its amount is the majority case worldwide and had no expression: with suffix alone, "1234.5 Bs." is what a chart drew where the table beside it read "Bs. 1.234,50", and the accessible table inherited the disagreement. |
| `valueFormat` | object | `ArenaNumberFormat` |  | How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number, which is what this chart drew before the member existed. |
| `height` | primitive | `number` | `280` | The plot's height in px, the --chart-height token by default. It is the axis the bands run down, so a pyramid of many brackets wants more of it: pass the room the data needs rather than letting the bands thin out. A number rather than a dimension string, because the chart does arithmetic with it to place every mark. |

<!-- @api end -->

### Two counts, one centre

`series` takes exactly two, in order: the first is drawn to the left of the centre line and the
second to the right. Both carry **counts**, not signed values. The chart negates the first one
when it draws it, so the accessible table reads the numbers you passed and the picture reads the
shape they make. A tick on the axis is a magnitude for the same reason: a tick reading -600 would
say the left side is a debt rather than a count.

A negative value is not corrected. It crosses the centre line and draws on the other side, which
is what the number says, and the table says the same thing. A pyramid that quietly took the
magnitude would be the only place in Arena where the picture and the table can disagree.

The axis reaches the same distance on both sides, measured from the larger one. That is the whole
point: two halves scaled to their own maxima would look balanced whatever the data said, which is
the comparison this chart exists to make.

### Reading it without a pointer

The cursor walks BANDS rather than bars, so one press reads both sides at once. ArrowUp and
ArrowDown move it, Home and End jump to the ends, Escape clears it. ArrowLeft and ArrowRight do
nothing and are not consumed: this chart has no sequence along that axis, and swallowing a key it
cannot use would strand a reader.

The legend under the plot is what names the two sides, and it appears here always, because a
pyramid is two series by definition.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
