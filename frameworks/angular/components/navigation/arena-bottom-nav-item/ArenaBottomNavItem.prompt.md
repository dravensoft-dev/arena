One destination in an `arena-bottom-nav`: glyph above label, an equal share of the bar's width.
Standalone, `OnPush`, signal I/O. It renders no wrapper of its own, so the host declares
`display: contents` and the anchor or the button inside is what the bar lays out.

Which destination is active and how this one reports are settled with the parent it injects, so
nothing about that is a member here.

```html
<arena-bottom-nav-item id="orders" icon="ph-bold ph-receipt" label="Orders" href="/orders" [badge]="12" />
<arena-bottom-nav-item id="more" icon="ph-bold ph-dots-three" label="More" />
```

<!-- @api GENERATED from contracts/api/components/ArenaBottomNavItem.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `id*` | primitive | `string` |  | Identifies the destination. ArenaBottomNav.active names one of these, and the item whose id matches is the one marked aria-current="page". Required, and guarded with a falsy check rather than an absence check: a blank id can never match and is an omission wearing a value. |
| `label*` | primitive | `string` |  | What the item reads under its glyph, and the whole of its accessible name unless a badge adds a count to it. Required and falsy-guarded for the same reason. It is drawn rather than hidden: a bar of glyphs alone asks every reader to have learnt the icons, and the label is what makes the destination sayable. |
| `icon*` | primitive | `string` |  | A Phosphor class name drawn above the label. Arena draws the element, the consumer names the glyph. **The ACTIVE destination is drawn in the filled weight, and there is no member for it**: the item whose id matches ArenaBottomNav.active swaps whatever weight the string carries for `ph-fill`, so a consumer passes one string per destination rather than two and a conditional. It is Arena's convention, so Arena applies it, and passing `ph-fill` yourself changes nothing because the swap is idempotent. Required here where a sidebar leaves it optional: a bar of five equal columns has no room for a label long enough to stand alone, and one column without a glyph breaks the row's rhythm. |
| `badge` | primitive | `number` |  | A count drawn over the glyph's trailing corner: pending orders, unread notices. Zero draws nothing, because a badge reading 0 is a mark that says there is nothing to mark; above 99 it reads "99+", so a four-digit count cannot widen the column. A number rather than a string, because both rules are arithmetic and a caller who has already formatted the value has taken them away. It is NOT hidden from assistive technology, so the destination announces "Orders 12". |
| `href` | primitive | `string` |  | Present => the item renders an <a>; absent => a <button>. A control that navigates must be a link: openable in a new tab, address copyable, announced as a link. An item that only changes local state is a button. A primary click with no modifier is cancelled and reported through ArenaBottomNav's `nav`, so a router owns it; a modified or middle click is the browser's and reports nothing. |
| `disabled` | primitive | `boolean` | `false` | Whether the destination is drawn but cannot be reached. It reflects through `aria-disabled` rather than the native attribute, and rather than by not rendering the item at all: a destination a user can see and hear announced as unavailable is what tells them it exists. The anchor keeps its `href` so the case split stays what it is; what changes is that activation is refused and the state is announced. |

<!-- @api end -->

**`icon` is required here where a sidebar leaves it optional**, and the active weight is not a
member: the destination whose `id` matches the bar's `active` has whatever weight the string carries
swapped for `ph-fill`, so pass one string per destination rather than two and a conditional. Passing
`ph-fill` yourself changes nothing, because the swap is idempotent.

**`label` is drawn, not hidden.** A bar of glyphs alone asks every reader to have learnt the icons.

`href` decides the element: present renders an `<a>`, absent a `<button type="button">`. A
destination that navigates must be a link; an item that only opens a local sheet is a button.

`badge` is a number, and Arena applies the two rules: zero draws nothing, and anything above 99 reads
`99+` so the column cannot widen. It is announced, so the destination reads "Orders 12".

`disabled` draws the destination and refuses it, through `aria-disabled` rather than the native
attribute, so a reader still hears that it exists.

**Do / Don't**
- **Do** keep the label to one word where you can. The column is a fifth of a phone, and a long one
  truncates.
- **Don't** format the badge yourself. A string would take the two rules away.
- **Don't** write it outside an `arena-bottom-nav`. It injects the bar, so without one there is no
  provider and Angular throws rather than rendering a destination that can never be current.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/angular/components/navigation/arena-bottom-nav/ArenaBottomNav.demo.generated.html` at 390px:
- A destination with a badge of 0 shows none, one of 4821 shows `99+`, and neither widens its column.
- Tab reaches every destination once, in source order, and the disabled one announces itself as
  disabled rather than being skipped.
- A five-word label truncates with an ellipsis instead of pushing its neighbours out of line.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
