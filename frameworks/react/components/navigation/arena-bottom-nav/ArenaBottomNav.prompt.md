The bar of destinations pinned to the bottom of a phone screen. Compound, the `ArenaSideNav`/`ArenaSideNavItem`
shape: write one `<ArenaBottomNavItem>` per destination and the bar settles which is active and how each
one reports.

```tsx
<ArenaBottomNav ariaLabel="Primary" active={route} onNav={setRoute}>
  <ArenaBottomNavItem id="home" icon="ph-bold ph-house" label="Home" href="/" />
  <ArenaBottomNavItem id="orders" icon="ph-bold ph-receipt" label="Orders" href="/orders" badge={12} />
  <ArenaBottomNavItem id="clients" icon="ph-bold ph-users" label="Clients" href="/clients" />
  <ArenaBottomNavItem id="more" icon="ph-bold ph-dots-three" label="More" />
</ArenaBottomNav>
```

<!-- @api GENERATED from contracts/api/components/ArenaBottomNav.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `active` | primitive | `string` |  | The id of the current destination. The ArenaBottomNavItem whose id matches is marked aria-current="page" and draws its glyph in the filled weight, and no item is marked when it names none of them. |
| `ariaLabel*` | primitive | `string` |  | Names this navigation landmark. Required, and **guarded at runtime**: the guard trims before it decides, so a blank name is refused as well as an absent one, because a landmark present with no accessible name is the defect arriving through a value. A phone shell usually carries this bar AND a sidebar or a header, so two navigation landmarks share a page and the pattern asks each for a unique name; a constant default would satisfy the existence half and leave them indistinguishable. |
| `children` | slot |  |  | The destinations. One ArenaBottomNavItem each; which id is active and how each reports `nav` are the parent's to settle, and none of it is a member here. |
| `onNav` | event | `string` |  | A destination was activated, carrying its id. Where the item has an href, Arena has already cancelled the anchor by the time this fires, so a listener routes and does not double-navigate; a modified click, a middle click and open-in-new-tab are the browser's and fire nothing, so a consumer who wires no listener still has a bar of real links. |

<!-- @api end -->

**It is not an `ArenaSideNav` lying down.** A sidebar is a stack of indented rows with the glyph before the
label and arbitrary nesting; this is a row of equal columns with the glyph above the label and no
nesting at all. It is not `ArenaTabs` either, which mounts every panel at once and announces
tablist/tab/tabpanel, and not an `ArenaSegmentedControl`, which is a radio group that chooses rather than
navigates.

Its geometry is Arena's tokens rather than a number: `--layout-bar` for the height, `--z-nav` for the
stacking slot, and `--pad-safe-bottom` so the row clears the home indicator on a device that has one.
Reserve the same height at the foot of the page it covers, or the last row of content sits under it.

**`ariaLabel` is required and guarded**, trimmed before it decides. A phone shell usually carries
this bar and a header or a sidebar too, so two navigation landmarks share a page and each needs its
own name.

**Do / Don't**
- **Do** give a destination an `href` when it is one. The item renders a real `<a>`, so it opens in a
  new tab, its address copies, and it is announced as a link.
- **Do** route in `onNav`. Arena has already cancelled the primary click by the time it fires, so
  routing there navigates once; ctrl-click and middle-click stay the browser's and report nothing.
- **Don't** put `routerLink` on it. The anchor is inside the component, so a router directive placed
  outside cannot see it, ignores the modifiers and adds a second tab stop.
- **Don't** exceed five destinations. Every column takes an equal share, and a sixth makes the labels
  truncate before anyone has read them.
- **Don't** reach for it above a phone width. It covers the bottom of the viewport, and a wide screen
  has a sidebar's room.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
