A rule between two regions. Without a label it is one `<hr>`, which a reader meets as a separator. With a label it draws two rules and the word between them, and the word stays ordinary text.

```tsx
<ArenaDivider />
<ArenaDivider label="or" />
<div className="arena-row">
  <span>Draft</span>
  <ArenaDivider className="arena-orientation-vertical" />
  <span>12 changes</span>
</div>
```

<!-- @api GENERATED from contracts/api/components/ArenaDivider.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label` | primitive | `string` |  | The word drawn between two rules, plain text and never markup. Absent or blank, the divider is one <hr>. Arena draws it in the label register, so it is data rather than a slot. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`orientation`](../../../../VOCABULARY.md#orientation): `arena-orientation-horizontal` (default), `arena-orientation-vertical`. Write one as `className="arena-orientation-vertical"` on the component, or on a container whose components should all take it.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none.
<!-- @keys end -->

**The divider owns no spacing.** The rule carries no margin, so the stack or the row it sits in decides the air on either side. Put it in an `arena-stack` or an `arena-row` and let the gap do the work.

**A vertical rule is a class, and it needs a row to stand in.** Write `arena-orientation-vertical` on the divider or on a container above it. The rule then stretches to the height of the flex row it sits in, such as an `arena-row`. Inside a block it has no height to take. A screen reader still announces a vertical rule as a separator, with no orientation: the class draws the line and changes nothing a reader hears.

**The hairline is a plugin's decision.** The rule is drawn with the separator's edge and width roles. A style plugin that answers the width with nothing removes every rule, which is the intended reading.

**Do**
- Separate two groups that sit in one surface, where a stack's gap alone does not read as a break.
- Keep a label to one or two words: "or", "Archived".

**Don't**
- Don't give it a margin or a spacing class. The stack or the row decides spacing.
- Don't ask for a thickness, a colour, a dash, an inset or a fade. Each is a drawing that asks roles, and the hairline is one decision a plugin makes.
- Don't pass an orientation member. The vertical rule is the family class.
- Don't use it as a section heading with a rule. A heading over a group is `ArenaSection`.
- Don't rotate a label inside a vertical rule.
- Don't put an accent, a gradient or an icon in the rule.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/react/components/layout/arena-divider/ArenaDivider.demo.generated.html`:
- At 390px a vertical rule in an `arena-row` stretches to the row's height.
- A long label does not overflow the row; the two rules shrink around it.
- A plugin answering the separator width with nothing draws no rule.
- Both layers' pages side by side draw the same rule and the same labelled rule.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
