Breadcrumb navigation (H3). Gives an explicit return path when the hierarchy is deeper than the tabs. The last item is the current page (not linked).

```tsx
<ArenaBreadcrumbs ariaLabel="Project navigation" items={[
  { label: 'Projects', href: '/projects' },
  { label: 'Checkout', href: '/projects/checkout' },
  { label: 'Deployment #482' },
]} onNavigate={(crumb) => go(crumb)} />
```

<!-- @api GENERATED from contracts/api/components/ArenaBreadcrumbs.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `ariaLabel*` | primitive | `string` |  | Names this navigation landmark. Required, and guarded at runtime: nothing can derive it, and the constant "Breadcrumb" it used to hardcode made two trails on one page indistinguishable as landmarks while satisfying the requirement mechanically. Say which hierarchy this is a trail through: "Project navigation", never "Breadcrumb". |
| `items*` | array | `readonly ArenaCrumb[]` |  | The trail, root first. The last entry is the current location and is never a link. |
| `separator` | primitive | `string` | `"/"` | Drawn between crumbs, never before the first. Arena draws it, in its own aria-hidden span. |
| `onNavigate` | event | `ArenaCrumb` |  | A non-current crumb was activated, carrying that crumb alone. The native MouseEvent is not forwarded, because a platform's own event type never travels in a payload; what the listener needs from it, the chance to route instead of navigating, arrives as behaviour rather than as data. Arena has already cancelled the anchor by the time this fires, so a listener routes and does not double-navigate. It fires for a primary click with no modifier and for Enter; ctrl-click, middle-click and open-in-new-tab are the browser's and fire nothing, so a consumer who wires no listener still has a working trail of real links. |

<!-- @api end -->

`ariaLabel` names the landmark and is **required**, throwing when absent. A constant like
`"Breadcrumb"` names the WIDGET rather than the trail, which leaves two of these on one page
as indistinguishable landmarks while the requirement reads as met. Say which hierarchy this is
a trail through ("Project navigation").

A non-current crumb renders a real `<a href>` and splits its activations. The plain one is
reported through `onNavigate(crumb)`, which carries the crumb alone and no DOM event: route
from there and the browser does not navigate underneath you. The rest keep working for a
consumer who wires no handler.

**Do / Don't**
- The last item is the current location: no link, styled in `--bone`.
- Don't replace tabs with breadcrumbs or vice versa; they coexist (tabs = sibling sections, breadcrumbs = depth).
- Don't reach for `onNavigate` to call `preventDefault()` -- it never receives the click
  event, and it does not need to: Arena has already cancelled the anchor by the time it fires.
- Don't wrap a crumb in your router's `Link`. `items` is data and the anchor is Arena's;
  navigate in `onNavigate` instead.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
