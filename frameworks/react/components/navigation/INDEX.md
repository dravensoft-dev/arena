<!-- GENERATED from the contracts by bun run generate:skills. Edit the contracts, not this file. -->

# Arena navigation components, the React layer

Every navigation component this layer ships, under the names it binds them to. **This page is an
index, not a manual.** How to write one is its own prompt, linked in the last column.

**The rules every component below answers to are stated in
[`../../../../skills/design/SKILL.md`](../../../../skills/design/SKILL.md) before any component
here**, and nothing on this page restates them.

Import from the package root, never from a path inside it:

```tsx
import { ArenaButton, ArenaTag } from '@dravensoft/arena-react';
```

A member is a prop. The main slot is `children`, a named slot is a prop taking a node, and an
event is an `on`-prefixed handler. An icon is a Phosphor class-name string, never an element.

- Every other category this layer ships: [`../../INDEX.md`](../../INDEX.md).
- Installing the package, declaring your skin, and what it exports besides components:
  [`../../PACKAGE.md`](../../PACKAGE.md).
- **Takes** is the members the component's API contract declares, in contract order, under this
  layer's own names. A member marked `*` is required; the prompt gives its type and its default.
- **A member whose type is an object or an enum takes one this package exports.** The prompt
  names the type and says what it is for; the fields it holds are in the type declaration itself,
  which `import type { … } from '@dravensoft/arena-react'` brings in. That field list is in neither
  the prompt nor the contract, so the type is where you read it.

| Component | What it is | Takes | Usage |
|---|---|---|---|
| `ArenaAppBar` | The band across the top of every screen: the site's identity, the way through it, and the controls that follow the reader everywhere. It is the banner landmark, so there is one per page, and its contents line up with the page under it because the bar spans the viewport and the band inside it does not. | `brand` `nav` `actions` `sticky` | [`ArenaAppBar.prompt.md`](./arena-app-bar/ArenaAppBar.prompt.md) |
| `ArenaBottomNav` | The bar of destinations pinned to the bottom edge of a phone screen. A compound component: the consumer writes one ArenaBottomNavItem per destination, and the coordination that tells each child which id is active and how to report `nav` is the parent's. That coordination is a member of no contract and each layer wires it in its own idiom. It is a row of equal columns with the glyph above the label, which is what separates it from a sidebar's stack of indented rows. | `active` `ariaLabel*` `children` `onNav` | [`ArenaBottomNav.prompt.md`](./arena-bottom-nav/ArenaBottomNav.prompt.md) |
| `ArenaBottomNavItem` | One destination in an ArenaBottomNav. The consumer writes one per destination; which id is currently active and how it reports `nav` are settled between it and its parent, and none of that is a member of this contract, the same shape and the same reason as ArenaSideNavItem and as the name an ArenaRadioGroup settles with each ArenaRadio. It draws its glyph above its label and takes an equal share of the bar's width, however many destinations there are. | `id*` `label*` `icon*` `badge` `href` `disabled` | [`ArenaBottomNavItem.prompt.md`](./arena-bottom-nav-item/ArenaBottomNavItem.prompt.md) |
| `ArenaBreadcrumbs` | A trail of ancestor locations ending at the current one. An explicit return path for hierarchies deeper than tabs. | `ariaLabel*` `items*` `separator` `origin` `onNavigate` | [`ArenaBreadcrumbs.prompt.md`](./arena-breadcrumbs/ArenaBreadcrumbs.prompt.md) |
| `ArenaBulkActionBar` | Appears when rows are selected and operates on the selection as a set. Renders nothing at a count of zero. | `count*` `noun` `actions*` `onRun` `layout` `clearable` `onClear` | [`ArenaBulkActionBar.prompt.md`](./arena-bulk-action-bar/ArenaBulkActionBar.prompt.md) |
| `ArenaCommandPalette` | Power-user accelerator (Cmd/Ctrl+K): search and run actions without a mouse. Controlled: the host owns whether it is open. | `open*` `commands*` `placeholder` `maxResults` `onClose` `onRun` | [`ArenaCommandPalette.prompt.md`](./arena-command-palette/ArenaCommandPalette.prompt.md) |
| `ArenaMenu` | Dropdown menu of actions on a trigger -- overflow, more actions, context. | `trigger*` `items*` `align` `onSelect` | [`ArenaMenu.prompt.md`](./arena-menu/ArenaMenu.prompt.md) |
| `ArenaPageHead` | A page heading: a required title, an optional subtitle, and an optional actions slot. | `title*` `subtitle` `actions` `align` | [`ArenaPageHead.prompt.md`](./arena-page-head/ArenaPageHead.prompt.md) |
| `ArenaPagination` | Page selector for a paged list. Renders a windowed range, never every page. | `page*` `pageCount*` `ariaLabel*` `onChange` | [`ArenaPagination.prompt.md`](./arena-pagination/ArenaPagination.prompt.md) |
| `ArenaSegmentedControl` | A compact inline filter over mutually exclusive options. A real radio group, never a tab list, and it carries no crimson. | `options*` `value` `defaultValue` `size` `ariaLabel*` `name` `onChange` | [`ArenaSegmentedControl.prompt.md`](./arena-segmented-control/ArenaSegmentedControl.prompt.md) |
| `ArenaSideNav` | The sidebar's navigation list -- the list alone, not the frame around it. A compound component: the consumer writes one ArenaSideNavItem per destination, and the coordination that tells each child where it sits, which id is active and how to report `nav` is the parent's. That coordination is a member of no contract and each layer wires it in its own idiom. | `active` `ariaLabel*` `children` `indentStep` `onNav` | [`ArenaSideNav.prompt.md`](./arena-side-nav/ArenaSideNav.prompt.md) |
| `ArenaSideNavCollapsible` | A named group inside an ArenaSideNav that shows and hides its own contents. It may contain items, sections and further collapsibles to any depth; the indent compounds with depth, which is why ArenaSideNav.indentStep is a step rather than a total. It binds the `disclosure` pattern and deliberately does NOT claim to be a treeview: there is no aria-level, no roving tab stop and no arrow navigation, because each collapsible is an independent disclosure. Its expanded state lives in the component, seeded by defaultExpanded, and it additionally opens itself when it COMES TO HOLD ArenaSideNav.active -- a transition, not a standing condition, which is what leaves a user free to collapse a group again while the route stays inside it. Implicit behaviour, stated here and in its .prompt.md rather than left to be discovered. | `id*` `label*` `icon` `defaultExpanded` `children` `onToggle` | [`ArenaSideNavCollapsible.prompt.md`](./arena-side-nav-collapsible/ArenaSideNavCollapsible.prompt.md) |
| `ArenaSideNavItem` | One destination in an ArenaSideNav. The consumer writes one per destination; the nesting depth it sits at, which id is currently active and how it reports `nav` are settled between it and its parent, and none of that is a member of this contract -- the same shape, and the same reason, as the name, checked state and selection callback an ArenaRadioGroup settles with each ArenaRadio. It used to be api/types/side-nav-item.json, a predefined object Arena read out of an array; it is an element the consumer writes now, which is what makes a section, a collapsible and arbitrary nesting expressible at all. | `id*` `label*` `icon` `disabled` `badge` `href` | [`ArenaSideNavItem.prompt.md`](./arena-side-nav-item/ArenaSideNavItem.prompt.md) |
| `ArenaSideNavSection` | A named group of navigation items inside an ArenaSideNav. It wraps what the consumer wrote and never replaces it; its accessible name is the same heading a sighted user reads. A section always has children -- a childless one is guarded against at runtime, because two shapes would be one more thing a single behaviour binding cannot describe. Having sections at all is optional: loose SideNavItems at the root are legal and may sit beside them. | `label*` `children*` | [`ArenaSideNavSection.prompt.md`](./arena-side-nav-section/ArenaSideNavSection.prompt.md) |
| `ArenaTab` | One tab in an ArenaTabs strip, and the panel it shows. ArenaTab draws the button; its content fills the tabpanel ArenaTabs renders beside the tablist. | `value*` `label*` `children` | [`ArenaTab.prompt.md`](./arena-tab/ArenaTab.prompt.md) |
| `ArenaTabs` | A row of tabs and the one panel they switch between. Write one `ArenaTab` per view; ArenaTabs renders the tablist, the panel, and the keyboard. | `children` `value` `defaultValue` `onChange` | [`ArenaTabs.prompt.md`](./arena-tabs/ArenaTabs.prompt.md) |

16 navigation components in this layer.
