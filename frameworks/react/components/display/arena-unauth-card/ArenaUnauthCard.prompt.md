The panel every signed-out screen needs. It is a frame, not a form: no `email`, no
`password`, no `onSubmit`, no validation. Fields are composed from `ArenaInput` and
`ArenaButton`, which is what lets the same component serve "Welcome back", "Check your
inbox", "This link expired" and "Enter your two-factor code".

`eyebrow` and `title` are plain strings; Arena draws both entirely (the mono crimson
microlabel, the display-weight heading), so there is no markup for a consumer to
supply. `brand`, `footer` and the children default slot stay nodes.

```tsx
<ArenaUnauthCard
  brand={<ArenaAppLogo size="md" mark={<img src="/assets/rotor-crimson.svg" alt="" />} name="Draven" dim="soft" />}
  eyebrow="Delivery console"
  title="Welcome back"
  footer={<a href="/reset">Forgot your password?</a>}>
  <ArenaInput label="Email" value={email} onChange={onEmail} />
  <ArenaInput label="Password" type="password" />
  <ArenaButton variant="primary" full>Sign in</ArenaButton>
</ArenaUnauthCard>
```

<!-- @api GENERATED from contracts/api/components/ArenaUnauthCard.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `brand` | slot |  |  | The brand lock-up above the panel's content. An ArenaAppLogo, in practice. |
| `eyebrow` | primitive | `string` |  | Mono crimson microlabel: the product, not the task. |
| `title` | primitive | `string` |  | The task. "Welcome back", "Check your inbox". |
| `headingLevel` | enum | `ArenaHeadingLevel` | `"h2"` | Which rung of the document outline the title takes. Only the element changes: the title's class is the same at every value, so the render is identical and no appearance follows from it. It defaults to `h2` because this title is drawn in the section register rather than the card one, so the outline follows the register the same way every other title on the ladder does. A signed-out screen whose only title is this one says `h1` and gets the page's one heading, which is the case the member exists for. `none` takes the title out of the outline entirely; with no title there is no heading either way. |
| `children` | slot |  |  | The fields, composed from ArenaInput and ArenaButton. |
| `footer` | slot |  |  | Centred muted line below the content: a recovery link, a legal note. |

<!-- @api end -->

**It does not centre itself**: the product owns the page. The wrapper is three lines,
and writing them is what keeps a split layout beside an illustration possible:

```tsx
<div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'calc(var(--sp-1) * 6)' }}>
  <ArenaUnauthCard …>…</ArenaUnauthCard>
</div>
```

## Do / Don't

- **Do** stack the fields yourself, in a flex column with a `--sp` gap. The panel does
  not decide how many fields there are or how they space.
- **Do** put a "sign in with Google" button, an "or" divider or a resend timer straight
  into `children`. It is a card, so it is composed into; none of those needs a prop.
- **Don't** give it credentials or a submit handler. The moment it knows about a
  password it stops being the panel the other screens use.
- **Don't** centre it from inside, and don't wrap it in something that assumes it owns
  the viewport.
- **Don't** reach for a bare `ArenaCard` for a signed-out screen. This one carries the brand
  slot, the constrained width, the panel padding and the centred footer, the four
  things that would otherwise be rewritten per screen.
- **Don't** pass JSX into `eyebrow` or `title`; both are strings the component draws
  itself, not slots.
- **Don't** pass `style` or other DOM attributes to `ArenaUnauthCard`; it accepts no escape
  hatch. Wrap it in your own `<div>` for outer layout, the way the three-line centring
  wrapper above already does.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
