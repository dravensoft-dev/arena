The fixed box a stack of notices lives in. `ArenaToast` carries `--z-toast` and no `position` of its
own, and CSS only honors `z-index` on a positioned box or a flex item, so a `<ArenaToast>` dropped into
static flow quietly stops floating. This is what makes it a flex item.

```tsx
<ArenaToastHost>
  {toasts.map((t) => (
    <ArenaToast key={t.id} tone={t.tone} title={t.title} message={t.message}
           actionLabel={t.actionLabel} onAction={t.onAction}
           persist={t.persist} dismissible onClose={() => drop(t.id)} />
  ))}
</ArenaToastHost>
```

<!-- @api GENERATED from contracts/api/components/ArenaToastHost.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `placement` | enum | `ArenaToastPlacement` | `"bottom-end"` | Which corner the stack is pinned to. A bottom placement clears the device's own bottom inset, so a stack on a phone never lands under the home indicator. |
| `children` | slot |  |  | The notices, in the order they are read. The stack is a plain column and the visual order is the source order, whatever the corner: a reversed one would put the newest notice first on screen and last in the reading order, and the two must agree. Nothing here caps the count or times a dismissal, because the queue that produced these notices already holds their identity and their order, and a cap applied by the box that draws them would fight the queue that owns them. |

<!-- @api end -->

`placement` picks the corner: `top-start`, `top-end`, `bottom-start`, `bottom-end`, default
`bottom-end`. The inline half is `start`/`end` rather than left/right, so a right-to-left document
flips the stack with the text. A bottom placement stands off `max(var(--sp-6),
var(--pad-safe-bottom))`, so on a phone the stack clears the home indicator instead of sitting
under it.

**It owns no clock, and it counts nothing.** The queue that produced these notices already holds
their ids, their order and how many there are, so the timer and any ceiling stay there. Take the
interval from `ARENA_TOAST_DISMISS`, exported beside `ArenaToast`, rather than typing a number:
`if (!t.persist) setTimeout(dismiss, t.actionLabel ? ARENA_TOAST_DISMISS.actionable : ARENA_TOAST_DISMISS.default);`.

**Do / Don't**
- **Do** mount exactly one per placement, at the root of the app, outside anything that scrolls or
  transforms: a `transform` on an ancestor makes it the containing block for a fixed child, and the
  stack then scrolls away with that ancestor instead of staying put.
- **Do** leave the notices in the order they were raised. The stack is a plain column, so what is
  read is what is seen, and reversing the array to put the newest on top puts it last in the
  reading order.
- **Don't** wrap a `<ArenaToast>` in a `<div>` inside it. The gap is a flex gap between the notices
  themselves, and a wrapper takes the flex-item role away from the notice.
- **Don't** put anything but notices in it. It is one positioned box with a z-index above every
  overlay in the system; anything else parked there covers the whole app.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
