The title block at the top of a page. The block holds the page's own heading, which is an `h1` unless a hero above it took that rung. Beside it sit an optional muted subtitle and the page's actions, pushed to the far side. Below `--bp-sm` it stacks and the actions stretch full width, measured on its own container, so it stacks inside a narrow panel too.

```tsx
<ArenaPageHead title="Deployments" />

<ArenaPageHead
  title="Client Portal"
  subtitle="Last published 2 h ago · build #4821"
  className="arena-align-center"
  actions={<>
    <ArenaButton className="arena-emphasis-secondary arena-size-sm">View logs</ArenaButton>
    <ArenaButton className="arena-size-sm">Deploy</ArenaButton>
  </>}
/>
```

<!-- @api GENERATED from contracts/api/components/ArenaPageHead.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `title*` | primitive | `string` |  | The page title. Required: a page head with no title is a bug, not a state. |
| `headingLevel` | enum | `ArenaHeadingLevel` | `"h1"` | Which rung of the document outline the title takes. Only the element changes: the title's class is the same at every value, so the render is identical and no appearance follows from it. It defaults to `h1` because a page head is the page's own title and the screen it heads carries no other. Under a hero, the one rung above it on the title ladder, it takes `h2` and leaves the page's single `h1` to the hero; that is the one arrangement where the default is wrong, and it is a member rather than something read off the page, because what a component renders is never derived from what sits above it. `none` is refused at runtime, the rule every component whose `title` is required follows: a title required because it names the thing it draws cannot also be told that the name is not one. |
| `subtitle` | primitive | `string` |  | A muted line under the title. |
| `actions` | slot |  |  | Page-level controls, right-aligned in the head. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`align`](../../../../VOCABULARY.md#align): `arena-align-center`, `arena-align-start` (default). Write one as `className="arena-align-center"` on the component, or on a container whose components should all take it.

<!-- @answers end -->

`arena-align-start`, the default, keeps the actions top-aligned with a tall title, and `arena-align-center` vertically centers them against it. Both govern only the wide layout. Below `--bp-sm` the row always stacks and
the align class has no effect. `ArenaPageHead` applies no outer bottom margin; the parent composes
that spacing, the way `Shell.tsx`'s header owns its own padding.

**Do**
- Use exactly one `ArenaPageHead` per page: it renders the `h1`, and a page has one. Under an `ArenaHero`, the one rung above it on the title ladder, pass `headingLevel="h2"` and leave the page's single `h1` to the hero. The page head cannot see the hero, because what an Arena component renders never follows from what sits above it.
- Keep the subtitle to a fragment of context ("Last published 2 h ago"), not a description of the page.
- Put the page's primary action here, and only the primary plus a couple of supports. A crowded head reads as a toolbar.
- Give the parent the bottom margin it needs; `ArenaPageHead` bakes none in.

**Don't**
- Don't use it as a section header inside a page: that is `ArenaSection`, which is a heading over a region and already sits a rung below. Dropping a page head to `h3` gets the outline right and still draws the page register, which is the wrong size for a section.
- Don't pass a destructive action as the visual lead. Danger stays outline (`destructive`), never the filled primary.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena-to-prod --audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
