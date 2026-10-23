Arena meter, a static measurement inside a known range: disk used, a quota, a score against a target. Standalone, `OnPush`, signal I/O. The host is the grid that holds a head row and the track, and nothing in it is live or focusable. Work that proceeds is `arena-progress-bar`.

```html
<arena-meter label="Storage used" [value]="used()" valueText="72 of 100 GB" [low]="50" [high]="80" [optimum]="0" />
<arena-meter label="Seats taken" [value]="seats()" [max]="capacity()" [valueText]="seatsText()" />
<arena-meter label="Test coverage" [value]="coverage()" [low]="60" [high]="85" [optimum]="100" class="arena-size-sm" />
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

**Answers** [`size`](../../../../VOCABULARY.md#size): `arena-size-lg`, `arena-size-md` (default), `arena-size-sm`. Write one as `class="arena-size-lg"` on the component, or on a container whose components should all take it.

**Answers** [`accent`](../../../../VOCABULARY.md#accent): `arena-accent-gold`, `arena-accent-primary` (default). Write one as `class="arena-accent-gold"` on the component, or on a container whose components should all take it.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none (`meter`).
<!-- @keys end -->

**The standing is derived, never set.** `low` and `high` split the range into a low, a middle and a high region, and `optimum` marks the good one. The meter reads Good in that region, Fair beside it and Poor opposite it. Give none of the three and the fill wears the accent with no word.

**Edges follow the HTML `<meter>` attributes, with one difference.** Each region keeps its lower edge, so `value` equal to `high` reads as the high region. When `high` sits on `max` no high region opens, and a full meter stays in the middle. The optimum follows the same rule, so one on an edge is in the region above it and a value there reads Good.

**The word is drawn and spoken.** The locale's `meterOptimum`, `meterFair` or `meterPoor` sits beside the reading and follows it in `aria-valuetext`, so the hue never carries the standing alone.

**The clamp is visual, and the reading is yours.** Past `max`, the fill is full and `aria-valuenow` reports `max`, while the readout keeps the number you passed. Write units and grouping into `valueText` yourself.

**Do / Don't**
- **Do** say what is measured in `label`. A blank one throws, because nothing can derive it.
- **Do** set all three thresholds when one end is better. With `optimum` alone, the whole range is a single region.
- **Don't** use it for a job that finishes. An upload is `arena-progress-bar`, announced as progress.
- **Don't** expect a `tone` input. Colour follows the thresholds, so the number and its hue always agree.
- **Don't** ask for a radial drawing. A ring is a chart of its own, and this meter is a bar.
- **Don't** use it for a scale with labelled bands in a chart tile. Reach for `arena-gauge-chart`, which writes both ends and every band on its dial.
- **Don't** animate the fill or make it focusable. A reading a person drags is a slider.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/angular/components/feedback/arena-meter/ArenaMeter.demo.generated.html`:
- Check the fill against the track at `arena-size-sm`, `md` and `lg`.
- Read Good, Fair and Poor in both themes, each word beside its reading.
- With a screen reader, the name, the reading and the standing are spoken once, and nothing is spoken on load.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
