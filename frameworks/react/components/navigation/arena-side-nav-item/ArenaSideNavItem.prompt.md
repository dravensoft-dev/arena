One destination in an `ArenaSideNav`. Write one per destination, as a direct child.

```tsx
<ArenaSideNav ariaLabel="Primary" active={route} onNav={(id) => setRoute(id)}>
  <ArenaSideNavItem id="projects" icon="ph-bold ph-squares-four" label="Projects" href="/projects" />
  <ArenaSideNavItem id="filters" label="Filters" />
</ArenaSideNav>
```

<!-- @api GENERATED from contracts/api/components/ArenaSideNavItem.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `id*` | primitive | `string` |  | Identifies the destination. ArenaSideNav.active names one of these, and the item whose id matches is the one marked aria-current="page". Required, and guarded with a falsy check rather than an absence check: a blank id can never match and is an omission wearing a value. |
| `label*` | primitive | `string` |  | What the item reads, and the whole of its accessible name unless a badge adds a count to it. Required and falsy-guarded for the same reason. |
| `icon` | primitive | `string` |  | A Phosphor class name drawn before the label -- Arena draws the <i>, the consumer names the glyph. **The ACTIVE row is drawn in the filled weight, and there is no member for it**: the item whose id matches ArenaSideNav.active swaps whatever weight the string carries for `ph-fill`, so a consumer passes one string per destination rather than two and a conditional. It is Arena's convention, so Arena applies it, the same judgement that inverted ArenaPageHead's guidance rather than adding a boolean whose false nobody wants. Pass `ph-fill` yourself and nothing changes, since the swap is idempotent. |
| `disabled` | primitive | `boolean` | `false` | Whether the destination is drawn but cannot be reached -- one the consumer's rules lock, such as a feature the current plan does not include. It reflects through `aria-disabled` rather than the native attribute, and rather than by not rendering the item at all: an unavailable destination a user can see and hear announced as unavailable is what tells them it exists, which is the whole reason to draw it. The anchor keeps its `href` so the case split stays what it is -- what changes is that activation is refused and the state is announced. |
| `badge` | primitive | `number` |  | A count drawn at the row's trailing edge -- pending orders, unread notices. Zero draws nothing, because a badge reading 0 is a mark that says there is nothing to mark; above 99 it reads "99+", so a four-digit count cannot widen the column. A number rather than a string, because the two rules above are arithmetic and a caller who has already formatted the value has taken them away. It is NOT hidden from assistive technology, so the row announces "Orders 12": a count a screen-reader user cannot hear is a count that is not there, and aria-hidden on it would trade a real loss for a tidier name. What the 12 counts stays unsaid, because nothing can derive it and no member states it -- say it in the label where it matters. |
| `href` | primitive | `string` |  | Present => the item renders an <a>; absent => a <button>. A control that navigates must be a link -- openable in a new tab, address copyable, announced as a link. An item that only changes local state is a button. A primary click with no modifier is cancelled and reported through ArenaSideNav's `nav`, so a router owns it; a modified or middle click is the browser's and reports nothing. |

<!-- @api end -->

`href` decides which element the item renders, so it is the field to read first:
present ⇒ an `<a>`, absent ⇒ a `<button>`. The active item, the one whose `id`
matches `ArenaSideNav.active`, takes `aria-current="page"`, `--crimson-soft` behind
`--crimson` text at `--fw-semibold`; the rest are transparent, `--mute`,
`--fw-medium`. Everything about *where* the item sits, its nesting depth, which id
is active, the indent step and the handler that reports `nav`, is injected by
`ArenaSideNav` and is not part of this component's API. You never write those.

## Do / Don't

- **Do** give it an `id` and a `label`. Both are required and both are guarded against
  a *blank* value as well as an absent one: `label` is the link's whole accessible
  name, and a blank `id` can never match `active`, so it is an omission wearing a value.
- **Do** give it an `href` when it navigates, even in a single-page app. It is what
  lets the destination be opened in a new tab, copied, and announced as a link. An
  item that only changes local state is correctly a `<button>`.
- **Do** name the glyph, not the markup. `icon` is a Phosphor class name and Arena
  draws the `<i>`.
- **Do** pass a count as `badge`, a number rather than a string. Arena draws it at the
  trailing edge, draws nothing at zero, and reads `99+` above ninety-nine; a value you
  have already formatted takes both rules away.
- **Don't** expect to put your own markup inside one. The single-icon convention's
  stated price is exactly this: an item is an icon, a label and a count, so a row with
  an avatar or a two-line body has no expression here.
- **Don't** wrap items in a fragment. Arena injects into the children it is handed,
  and `React.Children.toArray` does not see through a `<>…</>`; write them as
  siblings, or in an array. A wrapper component of your own has the same effect, and
  it is the same limit `ArenaTable` and `ArenaRadioGroup` already carry.
- **Don't** render one outside an `ArenaSideNav`. It renders, but nothing injects the active
  id or the handler, so it is a link that reports nothing and never marks itself current.

- **`disabled` draws the destination and refuses it.** It reflects through `aria-disabled` rather
  than by not rendering the item: an unavailable destination a user can see, and hear announced as
  unavailable, is what tells them it exists: a feature behind a plan they do not have is worth
  showing. The anchor keeps its `href`, so the shape does not change; what changes is that the
  click is prevented and `onActivate` never fires.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
