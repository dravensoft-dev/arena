Arena page header: the display-weight title, an optional subtitle, and the page's
actions. The head measures **itself** rather than the viewport, and stacks below `--bp-sm`. A page head inside a narrow panel stacks there too, on any screen. Actions are projected, so the
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
| `headingLevel` | enum | `ArenaHeadingLevel` | `"h1"` | Which rung of the document outline the title takes. Only the element changes: the title's class is the same at every value, so the render is identical and no appearance follows from it. It defaults to `h1` because a page head is the page's own title and the screen it heads carries no other. Under a hero, the one rung above it on the title ladder, it takes `h2` and leaves the page's single `h1` to the hero; that is the one arrangement where the default is wrong, and it is a member rather than something read off the page, because what a component renders is never derived from what sits above it. `none` is refused at runtime, the rule every component whose `title` is required follows: a title required because it names the thing it draws cannot also be told that the name is not one. |
| `subtitle` | primitive | `string` |  | A muted line under the title. |
| `actions` | slot |  |  | Page-level controls, right-aligned in the head. |
| `align` | enum | `ArenaPageHeadAlign` | `"start"` | Cross-axis alignment of the actions block against the title, wide layout only. |

<!-- @api end -->

`title` is required: a page head with no title is a bug, not a state. `align` (default
`start`) governs only the wide layout's cross-axis alignment of the actions block against
the title; below `--bp-sm` the row always stacks and `align` has no effect. `arena-page-head`
applies no outer bottom margin; the parent composes that spacing.

Import `ArenaActions` from `@dravensoft/arena-angular` alongside `ArenaPageHead` in the host component's `imports`. `actions` is a directive rather than a plain attribute, because it is how the page head detects that actions were projected at all. Without it the attribute is inert, the
actions wrapper never renders, and the buttons silently disappear. `ArenaActions` is
shared: every primitive with a plural, toolbar-shaped projected slot imports the same
directive rather than declaring its own.

The measurement helper is public too. `arenaContainerWidth()` is exported from `@dravensoft/arena-angular` for a consumer building their own responsive component. Call it from an injection context, such as a field initializer or the constructor. Render the wide layout while the width is still `null`, and compare against the breakpoint token rather than writing a media query.

`arenaContainerWidth()` measures the caller's own host by default, and takes an `ElementRef` when the box to measure is a different one. A component whose responsive question is about an inner panel does not have to make that panel a component of its own. The injection context is
required either way, and not because of the element: `DestroyRef` disconnects the observer and
`afterNextRender` decides when there is a box to measure at all. For page CSS rather than a
component, write the media query yourself against the same three thresholds Arena uses,
480px, 768px and 1024px. A media query condition holds no `var()`, so there is no token form
of them to import.

**Do / Don't**
- Exactly one `arena-page-head` per screen. The head emits the `h1`, and a page with two `h1`s has no outline. Under an `arena-hero`, which is the one rung above it on the title ladder, the head takes `headingLevel="h2"` and leaves the page's single `h1` to the hero. The head cannot see the hero, because what an Arena component renders never follows from what sits above it.
- Keep the subtitle to one line of orientation. The head is not the place for instructions.
- Don't write a media query to stack it. The head already stacks, on its own width, which is the measurement that is right more often.
- Mark **each** control with `actions`, as siblings. Arena lays them out in a wrapping row, and that row wraps its own children. A single `<div actions>` holding three buttons is one flex item, so it can never wrap, and three buttons overflow the page at 390px. One
  element per control is what makes the wrap reachable at all.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component is not a styling surface, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena-to-prod --audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
