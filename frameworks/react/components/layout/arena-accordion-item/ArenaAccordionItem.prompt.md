One section of an `ArenaAccordion`: a heading holding the button, and the panel the button shows and hides. The accordion around the item decides whether the panel is open.

```tsx
<ArenaAccordion defaultValue="limits">
  <ArenaAccordionItem value="limits" label="What are the rate limits?"><LimitsTable /></ArenaAccordionItem>
  <ArenaAccordionItem value="keys" label="How do I rotate a key?"><RotateSteps /></ArenaAccordionItem>
</ArenaAccordion>
```

<!-- @api GENERATED from contracts/api/components/ArenaAccordionItem.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `value*` | primitive | `string` |  | The item's identity, and what the accordion's `value`, `values` and their events carry. Required, and guarded at runtime after trimming: two blank values cannot be told apart, and the two items would open together. |
| `label*` | primitive | `string` |  | What the header reads, and the accessible name of the panel. Required, and guarded at runtime after trimming: a header with no words names nothing for the panel to borrow. |
| `children` | slot |  |  | The panel's content. It mounts whether the panel is open or not, so put no costly work in it. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none.
<!-- @keys end -->

**Do / Don't**
- Do give every item a `value` unique within its accordion and a `label` that names its panel. A blank one of either throws.
- Do place the item directly inside `ArenaAccordion`. Outside one, the header toggles nothing.
- Don't put markup in the label. The label is a string, and the header is a button inside a heading.
- Don't look for a `disabled` item. A section a reader cannot open hides the reason it exists.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
