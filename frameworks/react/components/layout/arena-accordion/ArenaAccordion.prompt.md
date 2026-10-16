A stack of sections under headings. Each heading is a button that shows and hides the panel below it, and the accordion decides which panels are open.

```tsx
<ArenaAccordion defaultValue="shipping" onValueChange={setOpen}>
  <ArenaAccordionItem value="shipping" label="Shipping address"><AddressForm /></ArenaAccordionItem>
  <ArenaAccordionItem value="payment" label="Payment"><PaymentForm /></ArenaAccordionItem>
</ArenaAccordion>

<ArenaAccordion multiple values={open} onValuesChange={(set) => setOpen(set.values)} headingLevel="h2">
  <ArenaAccordionItem value="faq-refunds" label="How do refunds work?">{refunds}</ArenaAccordionItem>
  <ArenaAccordionItem value="faq-limits" label="What are the rate limits?">{limits}</ArenaAccordionItem>
</ArenaAccordion>
```

<!-- @api GENERATED from contracts/api/components/ArenaAccordion.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `children` | slot |  |  | The items. Which ones are open, the ids wiring each header to its panel and how a press is reported are the accordion's to settle, and none of it is a member of an item. EVERY panel mounts: a closed one is hidden and keeps its content, so a panel's side effects run at first render. |
| `multiple` | primitive | `boolean` | `false` | Whether several panels may be open at once. False reads `value`, `defaultValue` and `onValueChange`; true reads `values`, `defaultValues` and `onValuesChange`. The pair of the other mode is ignored, and a set one is warned about once. |
| `collapsible` | primitive | `boolean` | `true` | Without `multiple`, whether the open panel may be closed again. False keeps it open once one is open, and its header writes aria-disabled. Nothing opens by itself: seed `defaultValue` to start with one open. Ignored with `multiple`, where every press toggles. |
| `headingLevel` | enum | `ArenaHeadingLevel` | `"h3"` | The rung each header's heading takes. It defaults to `h3`, the card's rung under a section's `h2`. `none` is refused at runtime, because each label names its panel and a header is a heading. |
| `value` | primitive | `string` |  | Without `multiple`, the open item's value, controlled. The empty string, or a value no item has, opens nothing. Omit it and pass `defaultValue` to let the accordion govern itself. |
| `defaultValue` | primitive | `string` |  | Without `multiple`, the item open at first render when uncontrolled. Absent, every panel starts closed. |
| `onValueChange` | event | `string` |  | Without `multiple`, a header was pressed; carries the value of the item now open, or the empty string when the open one closed. Fired on a press only, never when a controlled `value` merely changes. |
| `values` | array | `readonly string[]` |  | With `multiple`, the open items' values, controlled. A value no item has opens nothing. Omit it and pass `defaultValues` to let the accordion govern itself. |
| `defaultValues` | array | `readonly string[]` |  | With `multiple`, the items open at first render when uncontrolled. Absent, every panel starts closed. |
| `onValuesChange` | event | `ArenaValueSet` |  | With `multiple`, a header was pressed; carries the whole set of open values that results, never a delta. Fired on a press only, never when controlled `values` merely change. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys**, from [`accordion`](../../../../../contracts/behaviour/accordion.json):
- `Enter`: activates the button and toggles its panel.
- `Space`: activates the button and toggles its panel.
<!-- @keys end -->

**`multiple` picks the mode and the pair of members you pass.** Without it, one section is open at a time: pass `value` or `defaultValue` and listen to `onValueChange`, which carries the open value. With it, pass `values` or `defaultValues` and listen to `onValuesChange`, which carries the whole open set. The pair of the other mode is ignored, and the console warns once.

**Closing the open section reports the empty string.** A controlled `value=""` opens nothing. With `collapsible={false}`, the open header refuses the press and says so through `aria-disabled`.

**The arrows are Arena's own.** Down and Up move focus to the next or previous header and wrap, Home and End reach the ends, and none of the four toggles a section. A field in a panel and a nested accordion keep their keys. Every header stays a tab stop.

**Do / Don't**
- Do pick `headingLevel` from the outline the accordion sits in. A level of `none` throws, because every header is a heading.
- Do write the items as siblings or in an array. Don't wrap them in a fragment or a component of your own, because `React.Children.toArray` cannot see through either and no section would open.
- Don't put costly work in a panel. Every panel mounts at first render, and a closed one is only hidden.
- Don't use it to switch between views. One view shown at a time under a strip of names is `ArenaTabs`.
- Don't nest it as a tree, and don't animate the panel's height.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/react/components/layout/arena-accordion/ArenaAccordion.demo.generated.html`:
- Tab reaches every header in order, and Enter and Space toggle the one in focus.
- Down, Up, Home and End move focus without toggling, and a field in a panel keeps its arrows.
- A screen reader reads the heading level, the expanded state and the panel's name.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
