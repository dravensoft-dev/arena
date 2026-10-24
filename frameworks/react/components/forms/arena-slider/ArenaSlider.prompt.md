A number chosen inside a range by moving a thumb, or a span chosen with two thumbs. Each thumb answers the pointer, touch and the keyboard. A readout beside the label writes the number. Controlled, the field draws `value` as given, so a host that leaves `value` as it was refuses the edit.

```tsx
<ArenaSlider label="Volume" value={volume} onChange={setVolume} valueSuffix="%" />
<ArenaSlider label="Price" range value={low} valueEnd={high} onChange={setLow} onChangeEnd={setHigh}
  valuePrefix="$" step={5} onCommit={refetch} onCommitEnd={refetch} />
<ArenaSlider label="Gain" orientation="vertical" value={gain} onChange={setGain} />
```

<!-- @api GENERATED from contracts/api/components/ArenaSlider.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | Names what is being set, such as "Volume", and names each thumb. Required, and guarded at runtime: a blank one throws, because nothing can derive what a range measures. |
| `showLabel` | primitive | `boolean` | `true` | Draws the label above the track. False drops the drawn text and keeps the accessible name. |
| `hint` | primitive | `string` |  | A line of help under the track, and each thumb's description. |
| `range` | primitive | `boolean` | `false` | Draws two thumbs that choose a span: `value` is its start and `valueEnd` its end. Each thumb stops against the other, and each is named by the label and its own word. Without it, `valueEnd` and its two events are ignored, and a bound `valueEnd` is warned once. |
| `value` | primitive | `number` |  | The number the thumb stands at, or the start of the span in range mode. Snapped to `step` and held inside the bounds. Absent, the slider holds its own number, starting at `min`; present, it controls the slider. |
| `valueEnd` | primitive | `number` |  | The end of the span in range mode. Absent, the slider holds its own end, starting at the highest step inside `max`. A `value` above it is drawn at it, and nothing is reported. |
| `min` | primitive | `number` | `0` | The lower bound. |
| `max` | primitive | `number` | `100` | The upper bound. A range whose `max` is not above `min` reads as 0 to 100. |
| `step` | primitive | `number` | `1` | The increment every value snaps to, counted from `min`; Page Up and Page Down move ten of it. When it does not divide the range, the highest step inside `max` is the top. A step that is not a positive number reads as 1. |
| `orientation` | enum | `ArenaSliderOrientation` | `"horizontal"` | Which way the track runs. A vertical slider fills the height its container gives it, at least four control heights, and announces that it stands vertically. |
| `valueFormat` | object | `ArenaNumberFormat` |  | How the readout and each thumb's reading write the number. With no `locale` it follows `ArenaLocale.locale`; absent, the number is written as it is. |
| `valuePrefix` | primitive | `string` |  | Static text drawn and spoken before the number, such as `$`. |
| `valueSuffix` | primitive | `string` |  | Static text drawn and spoken after the number, such as `%`. |
| `showValue` | primitive | `boolean` | `true` | Whether the readout is drawn beside the label. |
| `disabled` | primitive | `boolean` | `false` | Takes each thumb out of the Tab sequence, ignores the pointer and dims the slider. |
| `name` | primitive | `string` |  | Submitted with the form through a hidden input carrying the number. In range mode two hidden inputs share it, the start first, so a form posts a repeated field. |
| `onChange` | event | `number` |  | The thumb moved, or the start thumb in range mode; carries its number on every step of a drag and every key. Never fires for a move that leaves the number where it was. |
| `onCommit` | event | `number` |  | The move settled: the pointer was released, or a key stepped the thumb. Carries the number, and fires only when it differs from where the move began. For an effect too costly to run on every step of a drag. |
| `onChangeEnd` | event | `number` |  | The end thumb moved, in range mode; carries its number as `onChange` does. |
| `onCommitEnd` | event | `number` |  | The end thumb's move settled, in range mode; carries its number as `onCommit` does. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`size`](../../../../VOCABULARY.md#size): `arena-size-lg`, `arena-size-md` (default), `arena-size-sm`. Write one as `className="arena-size-lg"` on the component, or on a container whose components should all take it.

**Answers** [`accent`](../../../../VOCABULARY.md#accent): `arena-accent-plain`, `arena-accent-primary` (default). Write one as `className="arena-accent-plain"` on the component, or on a container whose components should all take it.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys**, from [`slider`](../../../../../contracts/behaviour/slider.json):
- `ArrowRight`: increases the value by one step, and decreases it where the slider is drawn right to left.
- `ArrowUp`: increases the value by one step.
- `ArrowLeft`: decreases the value by one step, and increases it where the slider is drawn right to left.
- `ArrowDown`: decreases the value by one step.
- `Home`: sets the thumb to its minimum, which for the upper of two thumbs is the lower thumb's value.
- `End`: sets the thumb to its maximum, which for the lower of two thumbs is the upper thumb's value.
<!-- @keys end -->

**`onChange` follows every step and `onCommit` the settle.** A drag reports each step it crosses through `onChange`. Releasing the pointer fires `onCommit` once, and only when the number moved. Each key does both. Run a costly effect, such as a fetch, from `onCommit`.

**The pointer.** A press on the track moves the thumb there and keeps dragging it. A press on a thumb takes the thumb where it stands. Touch drags the thumb and leaves the page's scroll alone along the other axis.

**Keys.** Up and Right step up, Down and Left step down, Page Up and Page Down move ten steps, and Home and End reach the bounds. Right to left, Left and Right swap on a slider that lies across. A vertical slider keeps them.

**Two thumbs with `range`.** `value` is the start and `valueEnd` the end, with `onChange` and `onCommit` for the start and `onChangeEnd` and `onCommitEnd` for the end. A thumb stops against the other, so the two never cross. Each thumb is named by the label and a word, such as "Price Minimum". Without `range`, `valueEnd` is ignored with one warning.

**Down with `orientation="vertical"`.** The track fills the height its container gives it, at least four control heights. The minimum sits at the bottom. Each thumb announces that it stands vertically.

**Snapping.** Every number snaps to `step`, counted from `min`. When `step` does not divide the range, the top is the highest step under `max`.

**`value` absent means the slider holds its own number**, starting at `min`. In range mode the end starts at the top. Bind `value` and `onChange` to control it. A `value` above `valueEnd` is drawn at the end, and nothing is reported.

**The readout.** `valueFormat`, `valuePrefix` and `valueSuffix` write the readout and what each thumb reads aloud. A format with no `locale` follows the provider's locale. A range reads as one span through the locale's own pattern.

**`name` submits the number through a hidden input.** A range posts two values under one name, the start first.

**One primary accent per view.** The fill is the primary accent by default, a state colour like a ticked box. Set `arena-accent-plain` on the container of a settings panel holding several sliders.

`ArenaInput` has no `range` type. A native range cannot paint its filled part without a gradient, so the slider is this component.

**Do**
- Name what is set, such as "Volume", never "Slider".
- Keep a readout, or a `hint`, wherever the number matters.

**Don't**
- Don't run a costly effect from `onChange`; use `onCommit`.
- Don't use gold for the fill. The focus ring is gold, and the two would meet on the thumb.
- Don't add tick marks. The readout and the hint carry the scale.

**By hand.** The arrows, Home, End and the page keys. A drag and a press on the rail, with a mouse and with a finger. The gold ring on a focused thumb. The thumb target at `arena-comfortable` and at 390px. A vertical slider in a column of fixed height. A range whose thumbs meet.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
