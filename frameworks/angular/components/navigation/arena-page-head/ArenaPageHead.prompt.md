Arena page header: the display-weight title, an optional subtitle, and the page's
actions. It measures **itself**, not the viewport, and stacks below `--bp-sm`, a page
head inside a narrow panel stacks there too, on any screen. Actions are projected, so the
head lays out controls the consumer wrote rather than declaring a second button API of its own.

```html
<arena-page-head title="Deployments" subtitle="Everything shipped in the last 30 days" align="center">
  <arena-button actions variant="secondary">Export</arena-button>
  <arena-button actions>New deployment</arena-button>
</arena-page-head>
```

<!-- @api GENERATED from contracts/api/components/ArenaPageHead.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `title*` | primitive | `string` |  | The page title. Required: a page head with no title is a bug, not a state. |
| `subtitle` | primitive | `string` |  | A muted line under the title. |
| `actions` | slot |  |  | Page-level controls, right-aligned in the head. |
| `align` | enum | `ArenaPageHeadAlign` | `"start"` | Cross-axis alignment of the actions block against the title, wide layout only. |

<!-- @api end -->

`title` is required: a page head with no title is a bug, not a state. `align` (default
`start`) governs only the wide layout's cross-axis alignment of the actions block against
the title; below `--bp-sm` the row always stacks and `align` has no effect. `arena-page-head`
applies no outer bottom margin; the parent composes that spacing.

Import `ArenaActions` from `@dravensoft/arena-angular` alongside `ArenaPageHead` in the
host component's `imports`,
`actions` is a directive, not a plain attribute, because it is how the page head
detects that actions were projected at all. Without it the attribute is inert, the
actions wrapper never renders, and the buttons silently disappear. `ArenaActions` is
shared: every primitive with a plural, toolbar-shaped projected slot imports the same
directive rather than declaring its own.

The measurement helper is public too. `arenaContainerWidth()` is exported from
`@dravensoft/arena-angular` for a consumer building their own responsive component: call it
from an injection context (a field initializer or the constructor), render the wide layout
while the width is still `null`, and compare against the breakpoint token rather than writing
a media query.

`arenaContainerWidth()` measures the caller's own host by default and takes an `ElementRef` when
the box to measure is a different one, so a component whose responsive question is about an
inner panel does not have to make that panel a component of its own. The injection context is
required either way, and not because of the element: `DestroyRef` disconnects the observer and
`afterNextRender` decides when there is a box to measure at all. For page CSS rather than a
component, write the media query yourself against the same three thresholds Arena uses,
480px, 768px and 1024px. A media query condition holds no `var()`, so there is no token form
of them to import.

**Do / Don't**
- Exactly one `arena-page-head` per screen. It emits the `h1`, and a page with two
  `h1`s has no outline.
- Keep the subtitle to one line of orientation. It is not the place for instructions.
- Don't write a media query to stack it. It already stacks, on its own width, which is
  the measurement that is right more often.
- Mark **each** control with `actions`, as siblings. Arena lays them out in a wrapping
  row, and that row wraps its own children: a single `<div actions>` holding three buttons is
  one flex item, so it can never wrap, and three buttons overflow the page at 390px. One
  element per control is what makes the wrap reachable at all.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
