Arena accordion, a stack of sections under headings. Standalone, `OnPush`, signal I/O. A header is a button inside a heading, and the accordion owns which panels are shown.

```html
<arena-accordion [(value)]="open">
  <arena-accordion-item value="shipping" label="Shipping address"><app-address-form /></arena-accordion-item>
  <arena-accordion-item value="payment" label="Payment"><app-payment-form /></arena-accordion-item>
</arena-accordion>

<arena-accordion multiple [(values)]="openFaqs" headingLevel="h2">
  <arena-accordion-item value="refunds" label="How do refunds work?">{{ refunds }}</arena-accordion-item>
  <arena-accordion-item value="limits" label="What are the rate limits?">{{ limits }}</arena-accordion-item>
</arena-accordion>
```

<!-- @api GENERATED from contracts/api/components/ArenaAccordion.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `content` | slot |  |  | The items. Which ones are open, the ids wiring each header to its panel and how a press is reported are the accordion's to settle. None of it is a member of an item. EVERY panel mounts: a closed one is hidden and keeps its content, so a panel's side effects run at first render. |
| `multiple` | primitive | `boolean` | `false` | Whether several panels may be open at once. False reads `value`, `defaultValue` and `valueChange`; true reads `values`, `defaultValues` and `valuesChange`. The pair of the other mode is ignored, and a set one is warned about once. |
| `collapsible` | primitive | `boolean` | `true` | Without `multiple`, whether the open panel may be closed again. False keeps it open once one is open, and its header writes aria-disabled. Nothing opens by itself: seed `defaultValue` to start with one open. Ignored with `multiple`, where every press toggles. |
| `headingLevel` | enum | `ArenaHeadingLevel` | `"h3"` | The rung each header's heading takes. The rung defaults to `h3`, the card's rung under a section's `h2`. `none` is refused at runtime, because each label names its panel and a header is a heading. |
| `value` | primitive | `string` |  | Without `multiple`, the open item's value, controlled. The empty string, or a value no item has, opens nothing. Omit it and pass `defaultValue` to let the accordion govern itself. |
| `defaultValue` | primitive | `string` |  | Without `multiple`, the item open at first render when uncontrolled. Absent, every panel starts closed. |
| `valueChange` | event | `string` |  | Without `multiple`, a header was pressed; carries the value of the item now open, or the empty string when the open one closed. Fired on a press only, never when a controlled `value` merely changes. |
| `values` | array | `readonly string[]` |  | With `multiple`, the open items' values, controlled. A value no item has opens nothing. Omit it and pass `defaultValues` to let the accordion govern itself. |
| `defaultValues` | array | `readonly string[]` |  | With `multiple`, the items open at first render when uncontrolled. Absent, every panel starts closed. |
| `valuesChange` | event | `ArenaValueSet` |  | With `multiple`, a header was pressed; carries the whole set of open values that results, never a delta. Fired on a press only, never when controlled `values` merely change. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys**, from [`accordion`](../../../../../contracts/behaviour/accordion.json):
- `Enter`: activates the button and toggles its panel.
- `Space`: activates the button and toggles its panel.
<!-- @keys end -->

**Two modes, two pairs of members.** Single mode reads `value` or `defaultValue` and emits `valueChange` with the open value, so `[(value)]` binds both ways. With `multiple`, the accordion reads `values` or `defaultValues` and emits `valuesChange` with the whole open set, so `[(values)]` binds both ways. A member of the other pair is ignored with one console warning.

**The empty string means no section is open.** Pressing the open header of a single accordion emits it. Set `[collapsible]="false"` to keep the open section open, and its header then carries `aria-disabled`.

**Arrow keys are an Arena addition.** Down and Up step between the headers and wrap; Home and End jump to the ends. Focus moves and nothing toggles, while a field inside a panel and a nested accordion keep their own keys. No header leaves the Tab order.

**Do / Don't**
- Do set `headingLevel` to the rung the outline needs. The value `none` throws, since each header names a section.
- Do put each `arena-accordion-item` straight inside the accordion. An item anywhere else fails to find its accordion and throws.
- Don't put heavy work inside a panel. Each panel renders at once, and a closed panel is only hidden.
- Don't reach for an accordion to switch views. A strip of names over one shown view is `arena-tabs`.
- Don't build a tree from it, and don't animate how tall a panel grows.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/angular/components/layout/arena-accordion/ArenaAccordion.demo.generated.html`:
- Tab visits each header in turn, and Enter or Space opens and closes the focused section.
- The arrows, Home and End only move focus, and an input in an open panel keeps its own arrows.
- A screen reader announces the heading level, whether the section is expanded, and the name of the panel.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
