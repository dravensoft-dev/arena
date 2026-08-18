Arena side-nav section, a labelled group of destinations inside an `arena-side-nav`. Standalone,
`OnPush`, signal I/O. The host **is**
the group: `role="group"` and the `aria-labelledby` that names it sit on it, with the heading
rendered inside.

```html
<arena-side-nav-section label="Workspace">
  <arena-side-nav-item id="members" label="Members" href="/members" />
  <arena-side-nav-item id="billing" label="Billing" href="/billing" />
</arena-side-nav-section>
```

<!-- @api GENERATED from contracts/api/components/ArenaSideNavSection.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | Names the group, both on screen and to assistive technology. Required, and guarded at runtime: a blank label leaves the group with no accessible name, which is the defect the guard exists to prevent arriving through a value that is present, so the guard trims before it decides. |
| `content*` | slot |  |  | The items in the group -- SideNavItems, further SideNavSections, SideNavCollapsibles. Each sits one nesting level deeper than the section itself. Required, and guarded at runtime: a section with no children is not a legal shape, and the guard counts the way the render path counts, so a child that is a false conditional counts as absent rather than as one. The ArenaAppLogo.mark shape -- a slot that is both declared required and enforced -- and not the ArenaTooltip.content one, which is declared required and deliberately left unguarded. |

<!-- @api end -->

**Its content is required, and it is the only slot in the repository that is.** A section renders a
heading naming the group, so a childless one labels nothing, it **throws** at content-init rather
than rendering. Slot required-ness is not comparable between layers and no gate can catch a caller
who omits it, which is why the guard is runtime code and not a declaration.

It is a container, so it **re-provides** the family's state at `depth + 1`: everything inside it
indents one step, including a nested section or a collapsible. Its own heading is indented at its
**own** depth, so it lines up with its siblings rather than with its children.

The binding is `none`: the group carries no interactive affordance of its own, and every control
inside it belongs to a child.

**Do / Don't**
- **Do** give it a `label` that names the group rather than describing it, "Workspace", not
  "Workspace links".
- **Do** nest sections when the hierarchy genuinely has two levels. The indent compounds and
  nothing needs configuring.
- **Don't** use one to add a visual gap. An empty section throws, and a section of one item is a
  heading that outweighs what it introduces.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
