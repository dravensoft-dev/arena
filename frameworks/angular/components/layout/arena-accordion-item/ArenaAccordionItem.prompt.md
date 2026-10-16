Arena accordion item, one section of an `arena-accordion`. Standalone, `OnPush`, signal inputs. The item draws its heading, its button and its panel, and the accordion decides whether that panel shows.

```html
<arena-accordion defaultValue="limits">
  <arena-accordion-item value="limits" label="What are the rate limits?"><app-limits-table /></arena-accordion-item>
  <arena-accordion-item value="keys" label="How do I rotate a key?"><app-rotate-steps /></arena-accordion-item>
</arena-accordion>
```

<!-- @api GENERATED from contracts/api/components/ArenaAccordionItem.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `value*` | primitive | `string` |  | The item's identity, and what the accordion's `value`, `values` and their events carry. Required, and guarded at runtime after trimming: two blank values cannot be told apart, and the two items would open together. |
| `label*` | primitive | `string` |  | What the header reads, and the accessible name of the panel. Required, and guarded at runtime after trimming: a header with no words names nothing for the panel to borrow. |
| `content` | slot |  |  | The panel's content. It mounts whether the panel is open or not, so put no costly work in it. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none.
<!-- @keys end -->

**Do / Don't**
- Do give each item a `value` no sibling shares and a `label` naming its section. Either one left blank throws.
- Do nest the item inside an `arena-accordion`. The item reads its state from the accordion and throws without one.
- Don't pass markup as the label. A label is text, drawn in a button that sits in a heading.
- Don't ask for a disabled section. A section nobody can open never explains itself.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
