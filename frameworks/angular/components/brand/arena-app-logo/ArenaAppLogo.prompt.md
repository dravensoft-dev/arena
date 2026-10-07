Arena brand lock-up. Project the mark into the `mark` slot and pass the product name.
One `arena-size-*` class sizes both the mark's box and the wordmark, from the `--logo-*` scale.

```html
<arena-app-logo name="Draven" dim="soft" class="arena-size-md">
  <img mark src="/assets/your-mark.svg" alt="" />
</arena-app-logo>

<arena-app-logo name="Delivery" class="arena-size-lg arena-orientation-vertical">
  <img mark src="/assets/your-client-mark.svg" alt="" />
</arena-app-logo>
```

<!-- @api GENERATED from contracts/api/components/ArenaAppLogo.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `mark*` | slot |  |  | The mark, as an asset the consumer supplies. Required: Arena ships MIT and a default would ship Dravensoft's trademark to whoever never read the API. The slot sizes the mark; a mark that brings its own dimensions fights the lock-up. |
| `name*` | primitive | `string` |  | The product name, or its first half when `dim` carries the second. |
| `dim` | primitive | `string` |  | The wordmark's second half, drawn muted and set straight against `name` with no space between them, so `name` of Draven and `dim` of soft reads as the one word Dravensoft. It is the second half of a name and never a tagline beside it: a product called Coldwalk splits as Cold and walk, and passing the tagline here draws it butted onto the name. Present for the manual's Primary variant, absent for Monochrome, which is why there is no `variant` member: the mark's ink and this are the same two decisions. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`size`](../../../../VOCABULARY.md#size): `arena-size-lg`, `arena-size-md` (default), `arena-size-sm`, `arena-size-xl`. Write one as `class="arena-size-lg"` on the component, or on a container whose components should all take it.

**Answers** [`orientation`](../../../../VOCABULARY.md#orientation): `arena-orientation-horizontal` (default), `arena-orientation-vertical`. Write one as `class="arena-orientation-vertical"` on the component, or on a container whose components should all take it.

<!-- @answers end -->

<!-- @keys GENERATED from the behaviour binding and its pattern. Edit the binding or the pattern, not this list. -->

**Keys.** This component binds [`none`](../../../../../contracts/behaviour/none.json), which names no key.

<!-- @keys end -->

**Do / Don't**
- Give the projected mark no width or height of its own. The slot sizes it; a mark that
  brings its own dimensions breaks the ratio the lock-up exists to hold.
- Give the projected element the `mark` attribute, `<ng-content select="[mark]" />` only
  projects an element marked that way; an `<img>` with no `mark` attribute projects nowhere.
- The slot stretches the projected mark with child selectors (`*:block *:w-full *:h-full`) rather than reaching into the node. Angular has no `cloneElement`, and the CSS descendant combinator reaches the same result through the platform's own idiom.
- Use `dim` for the second ink of a two-part wordmark, and pass no space between the
  parts, `name="Draven" dim="soft"` renders Dravensoft in two inks, one word.
- Write `name` in the case your brand wears. Arena sets the face, the weight and the tracking of the wordmark, and never its case. A name is text you wrote, and a component that shouted it would be renaming the company in CSS.
- Don't ship it with a mark that is not yours. Nothing defaults here on purpose: Arena is
  MIT and a default mark would be someone else's trademark travelling in your build.
- Don't reach for a fifth size. Four steps are the repertoire; a size between them is a
  token question, not a call-site one.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
