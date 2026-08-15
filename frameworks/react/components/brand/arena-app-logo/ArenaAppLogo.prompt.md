Brand lock-up: a mark paired with a product name. `mark` and `name` are required,
nothing defaults, so the first render is either your brand or a type error, never
Dravensoft's by accident.

```tsx
<ArenaAppLogo size="sm"
  mark={<img src="../../../assets/rotor-crimson.svg" alt="" />}
  name="Draven" dim="soft" />
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

`size` picks both halves at once, the mark's slot and the wordmark's size. It is a
fixed repertoire, not a ratio: `sm` (30/17) sits beside a product name in an
application frame, `md` (40/24) heads a signed-out panel, `lg` (54/34) is the brand
manual's Primary · horizontal, and `xl` (124/78) is the hero case, where the lock-up
is the only thing on the screen. All eight numbers are `--logo-*` tokens.

The manual's three variants are expressible without a `variant` prop, because they
are two decisions and not three:

| Manual variant | mark | wordmark |
|---|---|---|
| Primary · horizontal | `rotor-crimson.svg` | `name="Draven" dim="soft"` |
| Vertical · stacked | `rotor-crimson.svg` | same, `orientation="vertical"` |
| Monochrome · single ink | `rotor-bone.svg` | `name="Dravensoft"`, no `dim` |

## Do / Don't

- **Do** pass the mark as an asset, so the call site names which brand it renders.
- **Do** give the mark an empty `alt`, the wordmark beside it is the accessible name,
  and a mark announced separately reads the brand twice.
- **Don't** put a `width` or `height` on the node you pass as `mark`. `ArenaAppLogo` sizes
  the slot and the mark fills it; a mark that sizes itself fights the lock-up.
- **Don't** look for a component that renders the mark on its own. Arena ships none:
  the mark is a brand asset (`assets/rotor-*.svg`), and the lock-up is this component,
  which takes that asset as `mark` alongside a product `name`.
- **Don't** mix the variants. A crimson mark beside an undivided `DRAVENSOFT` is half
  of Primary and half of Monochrome, no variant at all, and precisely the defect that
  existed in the console before this component held the rule.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
