The title block at the top of a page: an `h1`, an optional muted subtitle, and the page's actions pushed to the far side. Below `--bp-sm` it stacks and the actions stretch full width, measured on its own container, so it stacks inside a narrow panel too.

```tsx
<ArenaPageHead title="Deployments" />

<ArenaPageHead
  title="Client Portal"
  subtitle="Last published 2 h ago · build #4821"
  align="center"
  actions={<>
    <ArenaButton variant="secondary" size="sm">View logs</ArenaButton>
    <ArenaButton variant="primary" size="sm">Deploy</ArenaButton>
  </>}
/>
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

`align` (default `"start"`) governs only the wide layout's cross-axis alignment of the
actions block against the title, `"start"` keeps actions top-aligned with a tall title,
`"center"` vertically centers them against it. Below `--bp-sm` the row always stacks and
`align` has no effect. `ArenaPageHead` applies no outer bottom margin; the parent composes
that spacing, the way `Shell.tsx`'s header owns its own padding.

**Do**
- Use exactly one `ArenaPageHead` per page: it renders the `h1`, and a page has one.
- Keep the subtitle to a fragment of context ("Last published 2 h ago"), not a description of the page.
- Put the page's primary action here, and only the primary plus a couple of supports. A crowded head reads as a toolbar.
- Give the parent the bottom margin it needs; `ArenaPageHead` bakes none in.

**Don't**
- Don't use it as a section header inside a page: that is a heading, not a page head, and it would emit a second `h1`.
- Don't pass a destructive action as the visual lead. Danger stays outline (`variant="danger"`), never the filled primary.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
