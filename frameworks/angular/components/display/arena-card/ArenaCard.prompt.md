Arena surface container, the hairline border on the base surface scale, with an
optional header. Standalone, `OnPush`, signal inputs. **The root slot is NOT host-bound**,
and that is forced rather than chosen: `click` is an output whose name is also a native DOM
event, and Angular installs both a DOM listener and an output subscription for such a name, so
a host that both
listens and emits re-enters its own listener on every emission. Arena's own styling lands on an inner
`<div>` that stops propagation, the shape `arena-side-nav-item` and `arena-table-row` already
take, and the host goes `display: contents`.

```html
<arena-card [eyebrow]="'Delivery'" [title]="'Client Portal'">
  <arena-badge action tone="success">Deployed</arena-badge>
  <p>Everything the client can see, in one place.</p>
</arena-card>

<arena-card floating>Just a surface, with no header block at all.</arena-card>

<arena-card interactive [title]="'checkout-api'" (click)="open(service)">Healthy, 14 replicas</arena-card>
```

<!-- @api GENERATED from contracts/api/components/ArenaCard.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `content` | slot |  |  | The card's body, below the optional header. |
| `interactive` | primitive | `boolean` | `false` | Whether the whole card is one activation target, which is the ordinary shape of a list on a phone. A boolean rather than "is `click` bound?", because Arena never derives what it draws from what a consumer listens for, the same reason ArenaTableRow.interactive is one. An interactive card is a role="button" tab stop with an Enter/Space handler and the surface's own hover and focus states; a non-interactive one is inert and adds no tab stop, because a dead stop on every card of every list is worse than the gap it would close. It is a ROLE rather than a <button> element for the same reason ArenaTableRow's card shape is: a card body may hold controls of its own, and a control inside a control is reachable by nobody. |
| `disabled` | primitive | `boolean` | `false` | Whether an interactive card is drawn but cannot be activated. It reflects through aria-disabled rather than any native attribute, and the card stays in the tab order rather than leaving it, because a disabled control nobody can reach is a control nobody knows exists. Without `interactive` there is nothing to disable and the card is inert already. |
| `href` | primitive | `string` |  | Present => the card renders an <a>; absent, with `interactive`, a role="button". The same split, and the same reason, as ArenaSideNavItem.href: a control that navigates must be a link, openable in a new tab, address copyable, announced as a link, and none of that can be rebuilt on a div. A primary click with no modifier is cancelled and reported through `click`, so a router owns it; ctrl, meta, shift, alt, a middle click and a context menu stay the browser's and report nothing. It implies interaction on its own, so `interactive` is not also required, and with `disabled` it refuses activation through aria-disabled the way an item does. The card's own content still holds whatever controls it holds; a control inside the anchor is a control inside a link, which is the price of making the whole surface the target and the reason `interactive` exists as the alternative. |
| `action` | slot |  |  | Right-aligned in the header, beside the title. Arena draws the header row; the consumer draws what sits in it. |
| `title` | primitive | `string` |  | Header title. Absent, along with eyebrow and action, renders no header block at all. |
| `eyebrow` | primitive | `string` |  | Mono uppercase label above the title, in the accent colour. |
| `floating` | primitive | `boolean` | `false` | Adds the warm shadow. Depth comes from the shadow and the surface scale, never a gradient. |
| `accent` | primitive | `boolean` | `false` | Draws the border in the accent colour instead of the surface hairline. |
| `click` | event |  |  | An interactive card was activated, by pointer or by Enter or Space. With `href` it is also how the card reports the one activation a router owns, a primary click or Enter with no modifier, and Arena has already cancelled the anchor's own navigation by the time it fires; a modified or middle click is the browser's and does not fire it at all. No payload, because the consumer wrote this element and already holds what it is about. |

<!-- @api end -->

**`interactive` makes the whole card one activation target**, which is the ordinary shape of a
list on a phone, and it is a declared boolean rather than "is `(click)` bound?", because Arena never derives what it draws from what a consumer listens for,
the same one `arena-table-row`'s `interactive` gives. Arena writes `role="button"`, a tab stop and
an Enter/Space handler, and draws the surface's own hover and focus states. Without it the card is
inert and adds no tab stop, because a dead stop on every card of every list is worse than the gap
it would close.

**An interactive card is a `role="button"` div and never a `<button>` element**, because a card
body is where a consumer puts their own controls and a control nested inside a control is
reachable by nobody. The keyboard follows from that: activation ignores a key pressed on something
inside, so Enter typed into a field within the card never opens the card.

**The pointer does not, and that is the one asymmetry to know.** A click that lands on a button, a
link or a field inside an interactive card runs that control's own handler and then reaches the
card's, because the click bubbles and the card's handler asks only whether the card is
interactive. Both fire, in that order, from one press. The card stops the event there, so nothing
above it hears the press twice, but the card itself has already heard it.

**So a card holding a control decides which of the two acts, and it decides by leaving
`interactive` off.** Without it the card draws no role, no tab stop and no handler at all: it is a
surface, and the control inside it is the only activation target on it, reached by pointer and by
keyboard alike with nothing of the card's competing. That is the shape a card full of controls
wants, and it costs nothing to say so.

```html
<arena-card title="Acme Corp">
  <p>Everything the client can see.</p>
  <arena-button (click)="open('acme')">Open</arena-button>
</arena-card>
```

Reach for `interactive` when the whole surface is the target and anything inside it is decoration
or a second route to the same place. Reach for a control inside a plain card when the press means
something narrower than "this card".

The `action` slot is an attribute selector, which is this layer's whole projection
convention: write `action` on the element that goes beside the title. With no
`title`, no `eyebrow` and nothing marked `action`, the header block does not
render, the card is a plain surface.

**Do / Don't**
- **Bind `title`, don't write it as a static attribute.** `<arena-card title="X">`
  leaves a real `title` attribute on the host, and the browser draws a tooltip over
  the whole card. `[title]="'X'"` does not. This is layer-wide rather than ArenaCard's
  own: Angular writes a static attribute during the creation pass whether or not it
  also matches an input. This host clears it (`'[attr.title]': 'null'`), which the
  layer holds in both directions, so the binding above is the clearer spelling rather
  than a workaround.
- Depth comes from `floating`'s warm shadow and the `base-100`→`base-200`→`base-300`
  surface scale. Never a gradient.
- Reach for `accent` to mark one card among several as the current or featured one;
  it draws the border in the accent colour and nothing else. It is not a status.
- Don't write a `class` on `<arena-card>` expecting it to reach the card: the host is
  bare and out of layout, so an attribute written there lands on nothing anyone can
  see. That is the price of the carve-out above, and there is no second route in. To
  size, constrain or position a card, wrap it in your own element rather than
  reaching through it.
- Don't nest a card inside a card. The surface scale has three steps and a card is
  one of them; a card on a card reads as a mistake rather than as depth.
- Don't give a card `interactive` and then expect a control inside it to keep the press
  to itself. One pointer press runs the control's handler and the card's. If only the
  control should act, the card is a plain surface and the control carries the `(click)`.

**By hand, in a real browser** (`bun run build:angular-demo && bun run demos`, then
`frameworks/angular/components/display/arena-card/ArenaCard.demo.generated.html`):
- An interactive card takes the hover surface, and one Tab reaches it and shows the focus ring.
  Enter and Space both open it, and Space does not scroll the page underneath.
- The disabled card is still reached by Tab and still announces itself, and neither key nor
  pointer activates it.
- On the card holding a field, typing Enter in the field does not open the card, and the badge
  and the field keep their own presses.
- `floating` casts the warm shadow and the borderless variant does not, with no
  gradient on either.
- A long body wraps inside the padding rather than escaping the radius: the root
  clips with `overflow-hidden`, so a wide child is cropped rather than overflowing.
- With only an `action` and no title or eyebrow, the header still renders and the
  action sits right-aligned against an empty title block.

### A card that navigates

`href` makes the whole card a real `<a>`: openable in a new tab, address copyable, announced
as a link. It is the same split, and the same reason, as `arena-side-nav-item`'s own `href`,
and it implies interaction on its own, so `interactive` is not also needed. With `disabled` it
refuses activation through `aria-disabled` and prevents the anchor's default, the way an item
does.

```html
<arena-card href="/clients/acme" title="Acme Corp" (click)="go('/clients/acme')">
  <p>Everything the client can see.</p>
</arena-card>
```

**`href` reports its plain activation through `(click)`**, so `router.navigateByUrl` in that
handler is the whole bridge and the page does not reload. The modified clicks stay the
browser's and fire nothing, which is why the member is worth having over `interactive`. Bind
nothing and the card is a plain link that navigates the document, which is the right shape
outside a single-page application.

**`(click)` on `arena-card` is two bindings wearing one name, and the card resolves it.** Angular
subscribes the binding to the component's `click` output *and* adds a native listener for the DOM
event of the same name, so a click that reaches the host is counted twice. The card stops
propagation on its own anchor, which is what makes `(click)` fire exactly once for the activation
it owns and not at all for the ones it leaves to the browser. Both halves are pinned; the
consequence for you is that a click delegated from an ancestor of the card never sees an
activation the card handled.

**Do not put `routerLink` on `arena-card`.** It would not work: `RouterLink` decides whether
it is on an anchor from the host's `tagName`, and `arena-card` is neither an `<a>` nor a
registered custom element, so it ignores every modifier key and lands a second tab stop on the
host, over the anchor the card already draws inside itself. That is the reason `(click)` reports
the activation at all.

Choose between the two by what the press DOES. A card that goes somewhere is `href`; a card
that changes local state is `interactive` with `(click)`. And a card whose body holds controls
of its own is `interactive`, not `href`: the anchor wraps the whole surface, so a button inside
it is a control inside a link, which is exactly the nesting `interactive` was made a
`role="button"` div to avoid.

**How it is built, and why that is worth knowing.** The card projects into two slots, and
Angular hands projected content to the first matching one, so two branches cannot each carry
their own `<ng-content>`. Both projections live in one `<ng-template>` that whichever branch
renders stamps out with `ngTemplateOutlet`. Toggling `href` at runtime in either direction
keeps the content, once, inside the new root, and that is asserted rather than assumed. Nothing in Angular's documentation settles that, and an empty card would
be a silent failure.
