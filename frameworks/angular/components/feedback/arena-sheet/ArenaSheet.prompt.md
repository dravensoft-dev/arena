Arena sheet, a working surface anchored to one edge of the page and kept open beside it rather than
over it: a cart, a filter drawer, a detail pane. Standalone, `OnPush`, signal I/O. The host
**is** the panel, so `<arena-sheet>` is the element you place.

It carries no scrim, traps no focus and takes nothing away from the page behind it. **When a panel
is meant to take the whole interaction until it is answered, that is `arena-dialog`**, two stacking
slots higher, and the scrim is how it says so.

```html
<arena-sheet [open]="cartOpen()" placement="end" title="Cart"
             [collapsed]="folded()" (collapsedChange)="folded.set($event)"
             dismissible (close)="cartOpen.set(false)">
  @for (line of lines(); track line.id) {
    <app-cart-line [line]="line" />
  }
  <div footer>
    <arena-button (click)="checkout()">Checkout</arena-button>
  </div>
</arena-sheet>
```

<!-- @api GENERATED from contracts/api/components/ArenaSheet.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `open*` | primitive | `boolean` |  | Whether the panel is on the page at all. The host owns it, the same way it owns a dialog's. Closed renders nothing, which is what distinguishes it from collapsed. |
| `placement` | enum | `ArenaSheetPlacement` | `"bottom"` | The edge the panel is anchored to. It spans that edge and stands off the device's own inset there, so a bottom sheet on a phone clears the home indicator. |
| `title*` | primitive | `string` |  | Names the panel for assistive technology and heads it visually. It is also the accessible name of the fold control, so a reader hears which panel is being folded rather than the word Toggle. Required and **guarded at runtime** rather than defaulted: what this panel is showing is editorial, and a constant fallback would satisfy the pattern mechanically while telling a screen-reader user nothing. |
| `collapsed` | primitive | `boolean` | `false` | Whether the body is folded away. The header stays visible either way: a collapsed panel is still on the page and still says what it is, which is why folding is not the same act as closing. The body is hidden rather than removed, so the fold control's reference to it never points at nothing. |
| `collapsedChange` | event | `boolean` |  | The fold control was pressed, carrying the state it moved to. Arena never folds the panel by itself, so a host that ignores this gets a control that reports and a body that does not move. |
| `dismissible` | primitive | `boolean` | `false` | Whether the close control is shown. Every layer gates it on this member and never on whether anything listens for `close`, because Arena never derives what it draws from what a consumer listens for. |
| `close` | event |  |  | The panel was dismissed, by the close control or by Escape. No payload. Escape reports here rather than adding a member of its own, and it is the only key the panel takes: a non-modal panel leaves every other key to the page behind it. |
| `content` | slot |  |  | The panel's body, which is what folds away. |
| `footer` | slot |  |  | A row that stays put while the body scrolls: a total and its action, a pair of filters buttons. It is outside the folding body on purpose, so a folded panel can still carry the one action it exists for. |

<!-- @api end -->

**Closed and collapsed are two different states, and both exist.** `open` decides whether the panel
is on the page at all; `collapsed` folds the body away and leaves the header and the footer where
they were. That is what the pattern buys: a reader can put the cart out of the way and still see
what it is and still check out, without losing it. The body is hidden rather than removed, so the
fold control's `aria-controls` never points at nothing.

`title` is required and **guarded at runtime**: a blank one throws rather than rendering a nameless
panel. It heads the panel and it is also the accessible name of the fold control, so a screen-reader
user hears "Cart, collapse" rather than "Toggle". Nothing can derive it, because what the panel is
showing is editorial.

`dismissible` gates the ×. It exists because Angular cannot ask whether an output has subscribers,
so the host says whether the panel is closeable rather than have Arena infer it from a `close`
listener. **Escape reports through that same `close`**, which is why answering it costs no member.
It reaches the panel only while focus is inside it: nothing here took focus in the first place, and
a panel that swallowed Escape from across the page would break a dialog open somewhere else.

**Do / Don't**
- **Do** own both booleans. Neither folds nor closes itself, so a template that ignores
  `collapsedChange` gets a caret that turns and a body that does not move.
- **Do** put the one action the panel exists for in the `footer` slot. It sits outside the folding
  body, so a folded panel still carries it.
- **Don't** reach for it as a menu or a popover. It spans a whole edge and stays; `arena-menu` is
  the transient list that hangs off a trigger.
- **Don't** open two at once on the same edge. They share a stacking slot and one lands on the
  other; a second surface at the same time is a sign the first should have been a dialog.
- **Don't** put a form a reader must finish in it. Nothing stops them clicking away mid-way, which
  is the whole point of a non-modal panel and the whole reason a confirmation is not one.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/angular/components/feedback/arena-sheet/ArenaSheet.demo.generated.html`:
- The page behind the panel still scrolls and its buttons still take a click, at every placement.
- Folding leaves the header and the footer in place and moves nothing else; the caret turns with it.
- A `ArenaMenu` opened from inside the panel paints over the panel, and the panel paints over a fixed
  bottom bar.
- Tab from the last control in the panel leaves it and lands on the page; nothing is trapped.
- At 390px the bottom panel clears the home indicator when the browser emulates a device inset.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
