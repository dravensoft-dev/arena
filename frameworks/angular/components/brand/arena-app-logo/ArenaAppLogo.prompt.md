Arena brand lock-up. Project the mark into the `mark` slot and pass the product name; one
`size` picks both the mark's box and the wordmark, from the `--logo-*` scale.

```html
<arena-app-logo name="Draven" dim="soft" size="md">
  <img mark src="/assets/your-mark.svg" alt="" />
</arena-app-logo>

<arena-app-logo name="Delivery" size="lg" orientation="vertical">
  <img mark src="/assets/your-client-mark.svg" alt="" />
</arena-app-logo>
```

<!-- @api GENERATED from contracts/api/components/ArenaAppLogo.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `mark*` | slot |  |  | The mark, as an asset the consumer supplies. Required: Arena ships MIT and a default would ship Dravensoft's trademark to whoever never read the API. The slot sizes the mark; a mark that brings its own dimensions fights the lock-up. |
| `name*` | primitive | `string` |  | The product name, or its first half when `dim` carries the second. |
| `dim` | primitive | `string` |  | The wordmark's second half, drawn muted. Present for the manual's Primary variant, absent for Monochrome, which is why there is no `variant` member: the mark's ink and this are the same two decisions. |
| `size` | enum | `ArenaLogoSize` | `"md"` | Both halves at once: the mark's slot and the wordmark. |
| `orientation` | enum | `ArenaOrientation` | `"horizontal"` | Mark beside the name, or above it. |

<!-- @api end -->

**Do / Don't**
- Give the projected mark no width or height of its own. The slot sizes it; a mark that
  brings its own dimensions breaks the ratio the lock-up exists to hold.
- Give the projected element the `mark` attribute, `<ng-content select="[mark]" />` only
  projects an element marked that way; an `<img>` with no `mark` attribute projects nowhere.
- The slot stretches the projected mark with child variants (`*:block *:w-full *:h-full`)
  rather than reaching into the node, Angular has no `cloneElement`, and the CSS
  descendant combinator reaches the same result through the platform's own idiom.
- Use `dim` for the second ink of a two-part wordmark, and pass no space between the
  parts, `name="Draven" dim="soft"` renders DRAVENSOFT in two inks, one word.
- Don't ship it with a mark that is not yours. Nothing defaults here on purpose: Arena is
  MIT and a default mark would be someone else's trademark travelling in your build.
- Don't reach for a fifth size. Four steps are the repertoire; a size between them is a
  token question, not a call-site one.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
