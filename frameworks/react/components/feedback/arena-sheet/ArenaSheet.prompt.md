A working surface anchored to one edge of the page, kept open beside the page rather than over it:
a cart, a filter drawer, a detail pane. It carries no scrim, traps no focus and takes nothing away
from what is behind it. **When a panel is meant to take the whole interaction until it is answered,
that is an `ArenaDialog`**, two stacking slots higher, and the scrim is how it says so.

```tsx
<ArenaSheet open={cartOpen} placement="end" title="Cart"
       collapsed={folded} onCollapsedChange={setFolded}
       dismissible onClose={() => setCartOpen(false)}
       footer={<ArenaButton onClick={checkout}>Checkout</ArenaButton>}>
  {lines.map((line) => <CartLine key={line.id} line={line} />)}
</ArenaSheet>
```

<!-- @api GENERATED from contracts/api/components/ArenaSheet.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `open*` | primitive | `boolean` |  | Whether the panel is on the page at all. The host owns it, the same way it owns a dialog's. Closed renders nothing, which is what distinguishes it from collapsed. |
| `placement` | enum | `ArenaSheetPlacement` | `"bottom"` | The edge the panel is anchored to. It spans that edge and stands off the device's own inset there, so a bottom sheet on a phone clears the home indicator. |
| `title*` | primitive | `string` |  | Names the panel for assistive technology and heads it visually. It is also the accessible name of the fold control, so a reader hears which panel is being folded rather than the word Toggle. Required and **guarded at runtime** rather than defaulted: what this panel is showing is editorial, and a constant fallback would satisfy the pattern mechanically while telling a screen-reader user nothing. |
| `collapsed` | primitive | `boolean` | `false` | Whether the body is folded away. The header stays visible either way: a collapsed panel is still on the page and still says what it is, which is why folding is not the same act as closing. The body is hidden rather than removed, so the fold control's reference to it never points at nothing. |
| `onCollapsedChange` | event | `boolean` |  | The fold control was pressed, carrying the state it moved to. Arena never folds the panel by itself, so a host that ignores this gets a control that reports and a body that does not move. |
| `dismissible` | primitive | `boolean` | `false` | Whether the close control is shown. Every layer gates it on this member and never on whether anything listens for `close`, because Arena never derives what it draws from what a consumer listens for. |
| `onClose` | event |  |  | The panel was dismissed, by the close control or by Escape. No payload. Escape reports here rather than adding a member of its own, and it is the only key the panel takes: a non-modal panel leaves every other key to the page behind it. |
| `children` | slot |  |  | The panel's body, which is what folds away. |
| `footer` | slot |  |  | A row that stays put while the body scrolls: a total and its action, a pair of filters buttons. It is outside the folding body on purpose, so a folded panel can still carry the one action it exists for. |

<!-- @api end -->

**Closed and collapsed are two different states, and both exist.** `open` decides whether the panel
is on the page at all; `collapsed` folds the body away and leaves the header and the footer where
they were. That is what the pattern buys: a reader can put the cart out of the way and still see
what it is and still check out, without losing it.

`title` is required and guarded rather than defaulted. It heads the panel, and it is also the
accessible name of the fold control, so a screen-reader user hears "Cart, collapse" rather than
"Toggle". Nothing can derive it, because what the panel is showing is editorial.

**Escape reports through `onClose`**, which is why answering it costs no member. It reaches the
panel only while focus is inside it: nothing here took focus in the first place, and a panel that
swallowed Escape from across the page would break the dialog a reader has open somewhere else.

**Do / Don't**
- **Do** own both booleans. Neither folds nor closes itself, so a handler that ignores
  `onCollapsedChange` gets a caret that turns and a body that does not move.
- **Do** put the one action the panel exists for in `footer`. It sits outside the folding body, so
  a folded panel still carries it.
- **Don't** reach for it as a menu or a popover. It spans a whole edge and stays; `ArenaMenu` is the
  transient list that hangs off a trigger.
- **Don't** open two at once on the same edge. They share a stacking slot and one lands on the
  other; a second surface at the same time is a sign the first should have been an `ArenaDialog`.
- **Don't** put a form a reader must finish in it. Nothing stops them clicking away mid-way, which
  is the whole point of a non-modal panel and the whole reason a confirmation is not one.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
