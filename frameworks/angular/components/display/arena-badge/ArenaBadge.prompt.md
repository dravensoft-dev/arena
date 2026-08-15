Arena status label, mono, uppercase, short. Standalone, `OnPush`, signal input.
The host **is** the chip: it binds the root slot, so an attribute you write on
`<arena-badge>` lands on the chip itself.

```html
<arena-badge tone="success" dot>Deployed</arena-badge>
<arena-badge tone="warning">In review</arena-badge>
<arena-badge>Draft</arena-badge>
```

<!-- @api GENERATED from contracts/api/components/ArenaBadge.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `content` | slot |  |  | The label text. Short: a badge is a chip, not a sentence. |
| `tone` | enum | `ArenaTone` | `"neutral"` | System status (success/warning/danger/info) reflects an object's actual state; emphasis (accent, gold) is editorial; neutral carries no semantic weight. |
| `dot` | primitive | `boolean` | `false` | Draws a filled dot in the tone colour before the label. |

<!-- @api end -->

**Tone taxonomy.** Two families, and they are not mixed:
- **Status**: `success` `warning` `danger` `info`: the actual state of the system
  (a deploy, a service, a version). `dot` reinforces "live status".
- **Emphasis**: `accent` (new/featured), `gold` (priority/distinction): editorial,
  and never a state. `neutral` carries no semantic weight.

**Do / Don't**
- Keep the label to one or two words. A badge is a chip, not a sentence, if it
  runs longer, it is not a badge.
- Don't use `accent` to communicate a status; reserve its crimson for
  "new/featured", and reach for a status tone when the badge reports state.
- Don't put `dot` on an emphasis tone. The dot means "this is live status", so on
  `accent` or `gold` it claims something the tone does not.
- Don't reach for a badge when the label can be dismissed or acted on: that is
  `arena-tag`, which owns `removable` and a real `<button>`. A badge has no
  interactive affordance at all, and its behaviour binding says so.
- Don't write a `class` or an ARIA attribute on `<arena-badge>` expecting it to
  reach the chip: the root slot is host-bound, so the host **is** the chip and a
  static `class` on it is overwritten by Arena's own styling. Wrap it in your own element
  when you need to position it.

**By hand, in a real browser** (`bun run demos`, then this component's own
playground or any page composing it):
- Each of the seven tones reads as its own colour against `--surface-card`, and
  the mono uppercase treatment survives at the smallest text size.
- With `dot`, the dot takes the tone's own ink (`bg-current`) rather than a
  second colour.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
