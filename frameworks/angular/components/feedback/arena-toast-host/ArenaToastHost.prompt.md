Arena toast host, the fixed box a stack of notices lives in. Standalone, `OnPush`, signal I/O.
The host **is** the box, so `<arena-toast-host>` is the element you place.

It exists because `arena-toast` carries `--z-toast` and no `position` of its own, and a
statically-positioned element ignores `z-index`: the one thing that must float above every overlay
in the system stops floating unless something places it.

```html
<arena-toast-host placement="bottom-end">
  @for (notice of notices(); track notice.id) {
    <arena-toast [title]="notice.title" [message]="notice.message" [tone]="notice.tone"
                 actionLabel="Retry" dismissible
                 (action)="retry(notice)" (close)="drop(notice)" />
  }
</arena-toast-host>
```

<!-- @api GENERATED from contracts/api/components/ArenaToastHost.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `placement` | enum | `ArenaToastPlacement` | `"bottom-end"` | Which corner the stack is pinned to. A bottom placement clears the device's own bottom inset, so a stack on a phone never lands under the home indicator. |
| `content` | slot |  |  | The notices, in the order they are read. The stack is a plain column and the visual order is the source order, whatever the corner: a reversed one would put the newest notice first on screen and last in the reading order, and the two must agree. Nothing here caps the count or times a dismissal, because the queue that produced these notices already holds their identity and their order, and a cap applied by the box that draws them would fight the queue that owns them. |

<!-- @api end -->

`placement` picks the corner: `top-start`, `top-end`, `bottom-start`, `bottom-end`, default
`bottom-end`. The inline half is `start`/`end` rather than left/right, so a right-to-left document
flips the stack with the text. A bottom placement stands off `max(var(--sp-6),
var(--pad-safe-bottom))`, so on a phone the stack clears the home indicator instead of sitting
under it, and nothing about the device's own geometry is retyped.

**It owns no clock, and it counts nothing.** The queue that produced these notices already holds
their ids, their order and how many there are, so the timer and any ceiling stay there. Read
`data-persist` off each notice and skip the timer for the ones that carry it, and take the interval
from `ARENA_TOAST_DISMISS`, exported beside `arena-toast`:
`.default` for a notice that only has to be read, `.actionable` for one carrying a button.

**Do / Don't**
- **Do** mount exactly one per placement, in the app's root template, outside anything that scrolls
  or transforms: a `transform` on an ancestor becomes the containing block for a fixed descendant,
  and the stack then scrolls away with it instead of staying put.
- **Do** leave the notices in the order they were raised. The stack is a plain column, so what is
  read is what is seen, and reversing the list to put the newest on top puts it last in the reading
  order.
- **Don't** give it a `role` or an `aria-live` of its own. Each `arena-toast` already announces,
  `alert` for danger and `status` for the rest, and a second live region around them announces the
  same notice twice.
- **Don't** put anything but notices in it. It is one positioned box above every overlay in the
  system, the CDK layer included; anything else parked there covers the whole app.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/angular/components/feedback/arena-toast-host/ArenaToastHost.demo.generated.html`:
- Each of the four corners pins where it says, and the stack grows away from its own edge.
- The gap between two notices is the same in all four, and the standoff from the edges is too.
- With the browser emulating a device that reports a bottom inset, the bottom stack moves up by it
  and the top one does not move at all.
- A notice raised while a dialog is open paints over the dialog.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
