Arena breadcrumb trail. Mono, wide-tracked, with the last crumb as the current page --
not a link, and carrying `aria-current="page"`. The landmark is a real `<nav>` inside a bare
`display: contents` host, with `aria-label` bound to the required `ariaLabel` input, the same
carve-out `arena-pagination` takes, because the `navigation` pattern offers `role="navigation"`
only for when a `<nav>` cannot be used. Use it where a hierarchy is deeper than tabs can show.

**A consumer attribute written on `<arena-breadcrumbs>` lands on the inert host, not on the
styled `<nav>`**, which is the price every carve-out pays and is why the default is to
host-bind.

`ariaLabel` is **required**: `input.required`, so Angular throws when it is missing. A constant
like `"Breadcrumb"` written straight into the `host` block names the
WIDGET rather than the trail and leaves two of these on one page indistinguishable as
landmarks. Say which hierarchy this is a trail through ("Project navigation").

A crumb renders as a real `<a href>` and splits its activations. The plain one is reported
through `navigate`, which carries the clicked `ArenaCrumb` alone: route from there and the browser
does not navigate underneath you. The rest keep working for a consumer who wires no listener
at all.

**Do not put `routerLink` on `arena-breadcrumbs`.** `RouterLink` decides whether it is on an
anchor from the host's `tagName`, and the anchor here is inside the component, so it would
ignore every modifier key and add a second tab stop over the crumb's own link. Route in the
handler instead:

```html
<arena-breadcrumbs ariaLabel="Project navigation" [items]="[
  { label: 'Clients', href: '/clients' },
  { label: 'Ardennes', href: '/clients/ardennes' },
  { label: 'Deployments' }
]" (navigate)="go($event)" />
```

<!-- @api GENERATED from contracts/api/components/ArenaBreadcrumbs.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `ariaLabel*` | primitive | `string` |  | Names this navigation landmark. Required, and guarded at runtime: nothing can derive it, and the constant "Breadcrumb" it used to hardcode made two trails on one page indistinguishable as landmarks while satisfying the requirement mechanically. Say which hierarchy this is a trail through: "Project navigation", never "Breadcrumb". |
| `items*` | array | `readonly ArenaCrumb[]` |  | The trail, root first. The last entry is the current location and is never a link. |
| `separator` | primitive | `string` | `"/"` | Drawn between crumbs, never before the first. Arena draws it, in its own aria-hidden span. |
| `navigate` | event | `ArenaCrumb` |  | A non-current crumb was activated, carrying that crumb alone. The native MouseEvent is not forwarded, because a platform's own event type never travels in a payload; what the listener needs from it, the chance to route instead of navigating, arrives as behaviour rather than as data. Arena has already cancelled the anchor by the time this fires, so a listener routes and does not double-navigate. It fires for a primary click with no modifier and for Enter; ctrl-click, middle-click and open-in-new-tab are the browser's and fire nothing, so a consumer who wires no listener still has a working trail of real links. |

<!-- @api end -->

```ts
go(crumb: ArenaCrumb): void {
  this.router.navigateByUrl(crumb.href ?? '/');
}
```

**Do / Don't**
- Keep the last crumb non-navigable. A link to the page you are on is noise, and it
  breaks the trail's promise that everything to the left is somewhere else.
- Don't use breadcrumbs for steps in a flow. A trail describes where something *is*,
  not how far through it you are -- that is the coachmark's dots or a stepper.
- Don't truncate the middle of a trail to save space. Wrap it; the row already does.
- Don't reach for `(navigate)` to call `preventDefault()` -- it never receives the click
  event, and it does not need to: Arena has already cancelled the anchor by the time it fires.
- Don't route on a modified click. `(navigate)` never fires for one, and if it did, opening
  in the current tab is the opposite of what the reader asked for.

**Accessibility note:** the trail renders no `<ol>`/`<li>` wrapper, so a
screen reader gets no "list, N items" orientation cue that the WAI-ARIA APG's breadcrumb
structure would otherwise give. `nav[aria-label="Breadcrumb"]` and `aria-current="page"`
are what make the trail operable and named; the list semantics were judged a secondary
nicety, not an operability gap, and left out on that basis rather than by oversight.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
