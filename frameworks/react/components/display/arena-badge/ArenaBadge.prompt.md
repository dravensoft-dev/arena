Status label in mono uppercase. Short text (1–2 words); if it's longer, it's not an ArenaBadge.

```tsx
<ArenaBadge tone="success" dot>Deployed</ArenaBadge>
<ArenaBadge tone="warning">In review</ArenaBadge>
```

<!-- @api GENERATED from contracts/api/components/ArenaBadge.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `children` | slot |  |  | The label text. Short: a badge is a chip, not a sentence. |
| `tone` | enum | `ArenaTone` | `"neutral"` | System status (success/warning/danger/info) reflects an object's actual state; neutral carries no semantic weight. |
| `dot` | primitive | `boolean` | `false` | Draws a filled dot in the tone colour before the label. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`accent`](../../../../VOCABULARY.md#accent): `arena-accent-gold`, `arena-accent-plain` (default), `arena-accent-primary`. Write one as `className="arena-accent-gold"` on the component, or on a container whose components should all take it.

<!-- @answers end -->

<!-- @keys GENERATED from the behaviour binding and its pattern. Edit the binding or the pattern, not this list. -->

**Keys.** This component binds [`none`](../../../../../contracts/behaviour/none.json), which names no key.

<!-- @keys end -->

**Tone taxonomy (H4).** Two families, don't mix them:
- **Status**: `success` `warning` `danger` `info`: reflect the actual state of the system (deploy, service, version). The `dot` reinforces "live status".
- **Emphasis**: `arena-accent-primary` (new/featured) and `arena-accent-gold` (priority/distinction) colour the badge as editorial emphasis, never a status. `neutral` = no semantic weight.

**Don't**
- Don't use `arena-accent-primary` to communicate a status (use a status tone); reserve its crimson for "new/featured".
- Don't put full sentences inside an ArenaBadge, and don't use `dot` with an accent class.
- Don't pass `style` or stray DOM attributes. ArenaBadge declares three members (its label content, `tone` and `dot`) and renders nothing else; wrap it in your own element if you need to position it.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
