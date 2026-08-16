Arena side-nav item, one destination in an `arena-side-nav`. Standalone, `OnPush`, signal I/O.
The host declares `display: contents`
and the row itself is a real `<a>` or a real `<button>`, so the browser's own activation,
navigation and focus semantics are never re-implemented.

```html
<arena-side-nav-item id="projects" icon="ph-bold ph-squares-four" label="Projects" href="/projects" />
<arena-side-nav-item id="settings" icon="ph-bold ph-gear-six" label="Settings" />
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

**`href` decides the element.** With one it renders an `<a>`; without one, a `<button
type="button">`. Both carry the same row styling, the same `aria-current="page"` when active, and
both report through the enclosing nav's `nav` output. The anchor's native navigation is **not**
suppressed, so a middle-click or a ctrl-click behaves as a link should.

That is also why the binding is `none` rather than `button`: no single interactive pattern applies
to a component that renders two different elements. What the rendered element carries comes from
the platform and from `ArenaSideNav`'s own `navigation` binding.

`id` and `label` are both **required and guarded at runtime**. `icon` is a Phosphor class name that
Arena draws as an `aria-hidden` `<i>`, the single-icon convention, never a projected node.

`aria-current="page"` is present on the active row and **absent** on the rest, never `false`.

**Do / Don't**
- **Do** write one item per destination, as a sibling. Depth comes from the containers around it,
  and an item never declares its own.
- **Do** use `href` when the destination is a real URL, even in a routed app. A nav made of buttons
  cannot be opened in a new tab.
- **Don't** wrap it in anything expecting the indent to survive, it will, because depth is pulled
  through DI rather than pushed, but a wrapper still changes the flex layout of the column.
- **Do** pass a count as `badge`, not as markup. The item takes no projected content, so the
  count is a number Arena draws at the trailing edge: zero draws nothing, and above 99 reads
  `99+`. Pass the raw number, because both of those rules are arithmetic and a string has
  already taken them away. Anything else a row might want, an avatar or a second line, is
  still a change to the contract rather than to a caller.

- **`disabled` draws the destination and refuses it.** It reflects through `aria-disabled` rather
  than by not rendering the item: an unavailable destination a user can see, and hear announced as
  unavailable, is what tells them it exists. The anchor keeps its `href`, so the shape does not
  change; what changes is that the click is prevented and the nav is never told to activate.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
