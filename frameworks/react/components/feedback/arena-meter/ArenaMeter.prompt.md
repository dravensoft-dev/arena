A measurement inside a known range: disk used, a quota, a score against a target. The bar does not move as a task proceeds, so it announces nothing. For work under way, reach for `ArenaProgressBar`.

```tsx
<ArenaMeter label="Storage used" value={72} valueText="72 of 100 GB" low={50} high={80} optimum={0} />
<ArenaMeter label="Seats taken" value={seats} max={capacity} valueText={`${seats} of ${capacity}`} />
<ArenaMeter label="Test coverage" value={coverage} low={60} high={85} optimum={100} className="arena-size-sm" />
```

<!-- @api GENERATED from contracts/api/components/ArenaMeter.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | Names what is measured. Drawn above the track and the meter's accessible name. Required, and guarded at runtime after trimming: nothing can derive what is measured, and a fallback of Meter tells a reader only what the component is. |
| `value*` | primitive | `number` |  | The measurement, in the range's own unit. The drawing and aria-valuenow clamp it into the range, and a value that is not a finite number reads as min. The readout shows the number as passed. |
| `min` | primitive | `number` | `0` | The lower bound of the range. |
| `max` | primitive | `number` | `100` | The upper bound of the range. A max below min reads as min, so the range is never inverted. |
| `low` | primitive | `number` |  | The top of the low region, clamped into the range. Absent, it is min. A value equal to it is in the region above it. |
| `high` | primitive | `number` |  | The bottom of the high region, clamped into the range and never below low. Absent, it is max. A value equal to it is in the high region, except at max, where no high region opens and the value stays in the middle. |
| `optimum` | primitive | `number` |  | Where the best reading sits, which decides which region is good. Absent, it is the midpoint. With none of low, high and optimum given, no standing is derived and the fill paints the accent. |
| `showLabel` | primitive | `boolean` | `true` | Draws the label above the track. False keeps the accessible name on the meter and hides the drawn label, for a cell whose row already says what is measured. |
| `valueText` | primitive | `string` |  | The reading as a person says it, such as 62 of 100 GB. The drawn readout shows this text, and aria-valuetext starts with it. Absent, the readout is the value written as a plain number. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`size`](../../../../VOCABULARY.md#size): `arena-size-lg`, `arena-size-md` (default), `arena-size-sm`. Write one as `className="arena-size-lg"` on the component, or on a container whose components should all take it.

**Answers** [`accent`](../../../../VOCABULARY.md#accent): `arena-accent-gold`, `arena-accent-primary` (default). Write one as `className="arena-accent-gold"` on the component, or on a container whose components should all take it.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none (`meter`).
<!-- @keys end -->

**The thresholds decide the standing, and you never pick a colour.** `low` and `high` cut the range into three regions, and `optimum` says which region is good. A value in that region reads Good, a value next to it reads Fair, and a value at the far end reads Poor. With none of the three given, no word is drawn and the fill takes the accent.

**The members are the HTML `<meter>` attributes.** A region holds its lower edge, so a value equal to `low` sits in the middle and a value equal to `high` sits in the high region. A `high` on `max` opens no region of its own, so a full meter stays in the middle. An optimum on an edge belongs to the region above it, so a value at the optimum reads Good.

**The word travels with the hue.** The standing is drawn beside the reading in the locale's `meterOptimum`, `meterFair` or `meterPoor`, and the same word follows the reading in `aria-valuetext`. Colour is never the only carrier of the standing.

**Out of range is drawn clamped and written as passed.** A value past `max` fills the track and reports `max` as `aria-valuenow`, while the readout shows the number you gave. Format units and grouping yourself in `valueText`, such as "62 of 100 GB".

**Do**
- Name what is measured in `label`. The label is drawn and is the meter's accessible name.
- Give all three thresholds when the good end matters. A meter with only `optimum` treats the whole range as one region.

**Don't**
- Don't use it for a task that ends. An upload or a deploy is `ArenaProgressBar`, which announces as work under way.
- Don't look for a `tone`. The standing comes from the thresholds, so a number and its colour cannot disagree.
- Don't ask it for a ring. A radial reading is a chart of its own, and this bar stays linear.
- Don't animate the fill or announce a change. A meter is a static reading.
- Don't make it focusable. A value a reader drags is a slider, and this one is only read.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/react/components/feedback/arena-meter/ArenaMeter.demo.generated.html`:
- The fill length matches the reading against the track at `arena-size-sm`, `md` and `lg`.
- Good, Fair and Poor read in light and in dark, and the word sits beside the reading.
- A screen reader says the name, the reading and the standing once, and says nothing when the page loads.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
