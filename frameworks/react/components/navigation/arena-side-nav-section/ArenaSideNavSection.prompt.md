A named group of items inside an `ArenaSideNav` -- a subheading plus the items under it. It
**wraps** what you write; it never replaces it.

```tsx
<ArenaSideNav ariaLabel="Primary" active={route} onNav={(id) => setRoute(id)}>
  <ArenaSideNavItem id="dashboard" icon="ph-bold ph-squares-four" label="Projects" href="/projects" />
  <ArenaSideNavSection label="Workspace">
    <ArenaSideNavItem id="deploys" icon="ph-bold ph-rocket-launch" label="Deployments" href="/deploys" />
    <ArenaSideNavItem id="settings" icon="ph-bold ph-gear-six" label="Settings" />
  </ArenaSideNavSection>
</ArenaSideNav>
```

<!-- @api GENERATED from contracts/api/components/ArenaSideNavSection.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | Names the group, both on screen and to assistive technology. Required, and guarded at runtime: a blank label leaves the group with no accessible name, which is the defect the guard exists to prevent arriving through a value that is present, so the guard trims before it decides. |
| `children*` | slot |  |  | The items in the group -- SideNavItems, further SideNavSections, SideNavCollapsibles. Each sits one nesting level deeper than the section itself. Required, and guarded at runtime: a section with no children is not a legal shape, and the guard counts the way the render path counts, so a child that is a false conditional counts as absent rather than as one. The ArenaAppLogo.mark shape -- a slot that is both declared required and enforced -- and not the ArenaTooltip.content one, which is declared required and deliberately left unguarded. |

<!-- @api end -->

The heading reads `label`, in the mono uppercase micro-label treatment, and is the group's
accessible name -- an `aria-labelledby` on the `role="group"` wrapper points at that same
heading element, so the grouping a sighted user sees is the grouping a screen reader
announces. Every item inside indents one step deeper than the section itself, and that
indent is `indentStep` (from the enclosing `ArenaSideNav`) applied again, not a second value of
its own -- see `ArenaSideNav.indentStep`.

## Do / Don't

- **Do** put a section only where a group of destinations shares one name. A single loose
  `ArenaSideNavItem` at the root needs no section at all.
- **Do** nest an `ArenaSideNavSection` inside another, or inside an `ArenaSideNavCollapsible`, when the
  navigation tree is more than two levels deep. Depth is injected, not counted by hand.
- **Don't** write a section with no children. It is not a legal shape and throws --
  allowing an empty one would give the component two shapes a single behaviour binding
  cannot describe.
- **Don't** leave `label` blank. It is required and guarded: a blank label leaves the group
  with no accessible name, which is the defect the guard exists to catch.
- **Don't** wrap its children in a fragment or a component of your own. `ArenaSideNavSection`
  injects into the children it is handed, and `React.Children.toArray` does not see
  through a `<>...</>` -- write items as siblings, or in an array, the same limit
  `ArenaSideNav` itself carries.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
