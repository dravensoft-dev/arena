The sidebar's navigation list: icon, label, active state. The list only: the frame
around it (brand, user footer, content area) stays the product's to compose.

A **compound** component. You write one `<ArenaSideNavItem>` per destination; `ArenaSideNav`
walks its direct children and injects where each sits, which `id` is active and the
handler that reports `nav`. None of what it injects is a member of any contract,
the same shape as `ArenaTable`/`ArenaTableRow` and `ArenaRadioGroup`/`ArenaRadio`, one size down.

```tsx
<ArenaSideNav ariaLabel="Primary" active={route} onNav={(id) => setRoute(id)}>
  <ArenaSideNavItem id="dashboard" icon="ph-bold ph-squares-four" label="Projects" href="/projects" />
  <ArenaSideNavItem id="deploys" icon="ph-bold ph-rocket-launch" label="Deployments" href="/deploys" />
  <ArenaSideNavItem id="settings" icon="ph-bold ph-gear-six" label="Settings" />
</ArenaSideNav>
```

<!-- @api GENERATED from contracts/api/components/ArenaSideNav.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `active` | primitive | `string` |  | The id of the current destination. The ArenaSideNavItem whose id matches is marked aria-current="page", and no item is marked when it names none of them. |
| `ariaLabel*` | primitive | `string` |  | Names this navigation landmark. Required, and guarded at runtime: the guard trims before it decides, so a blank name is refused as well as an absent one, because ariaLabel="" renders a landmark with no accessible name, which is the defect arriving through a value that is present. Guarded rather than defaulted: the navigation pattern asks each landmark on a page for a UNIQUE name, and a constant default satisfies the existence half while two sidebars on one page stay indistinguishable. Nothing can derive it either; what a nav is FOR is editorial. Say what it navigates -- "Primary", "Project settings" -- the ArenaTable.label and ArenaSegmentedControl.ariaLabel shape. |
| `children` | slot |  |  | The navigation tree. One ArenaSideNavItem per destination, optionally grouped by ArenaSideNavSection and ArenaSideNavCollapsible; where each child sits, which id is active and how it reports `nav` are the parent's to settle, and none of it is a member here. |
| `indentStep` | primitive | `number` | `3` | How far each nesting level indents, as a MULTIPLIER of --sp-1 rather than a length: the row at depth N is padded calc(var(--sp-1) * 3 + var(--sp-1) * indentStep * N). A CSS string was rejected -- a caller-supplied "1.5rem" is neither a token nor a derivation of one, so it would stop re-densifying inside .arena-compact, and no gate would catch it because the gate that forbids a bare length scans source and not the values a caller passes in. |
| `onNav` | event | `string` |  | An item was activated, carrying its id. It carries the id alone, on the ArenaBreadcrumbs precedent that the platform event leaves the payload and the item travels by itself, and under the compound shape there is no item datum left to carry either, because the consumer wrote the element and already holds everything on it. Where the item has an href, Arena has already cancelled the anchor by the time this fires, so a listener routes and does not double-navigate; ctrl-click, middle-click and open-in-new-tab are the browser's and fire nothing, so a consumer who wires no listener still has a working column of real links. |

<!-- @api end -->

An item's click reports `onNav(id)` -- the activated item's `id`, with no DOM event.
There is no item datum to carry: you wrote the element, so you already hold
everything on it. An item with `href` splits its activations: the plain one is reported
through `onNav`, so routing from there does not race the browser, and the rest keep working
for a consumer who wires no handler.

An item with `href` renders an `<a>`; without one it renders a `<button>`. The active
item takes `--crimson-soft` behind `--crimson` text at `--fw-semibold`; the rest are
transparent, `--mute`, `--fw-medium`. Both read `--dz-text`, so the nav re-densifies
inside `.arena-compact`.

Group related items with `<ArenaSideNavSection label="Workspace">…</ArenaSideNavSection>`. Each
nesting level indents one step deeper, and `indentStep` (default `3`) is the multiplier of
`--sp-1` that step applies -- a caller can only widen or narrow the multiplier, never
supply a length of their own, so the indent keeps re-densifying inside `.arena-compact` no
matter how far it is nested.

```tsx
<ArenaSideNav ariaLabel="Primary" active={route} onNav={(id) => setRoute(id)}>
  <ArenaSideNavItem id="dashboard" icon="ph-bold ph-squares-four" label="Projects" href="/projects" />
  <ArenaSideNavSection label="Workspace">
    <ArenaSideNavItem id="deploys" icon="ph-bold ph-rocket-launch" label="Deployments" href="/deploys" />
    <ArenaSideNavItem id="settings" icon="ph-bold ph-gear-six" label="Settings" />
  </ArenaSideNavSection>
</ArenaSideNav>
```

Hide a group behind a toggle with
`<ArenaSideNavCollapsible id="deploys" label="Deployments">…</ArenaSideNavCollapsible>`. It is a real
`<button>` carrying `aria-expanded` and an `aria-controls` naming the region under it -- the
`disclosure` pattern, deliberately not a treeview -- and it **opens itself when the subtree
it holds contains `active`**, on the first render and on every later route change into it.
That saves you computing `defaultExpanded` from the route, and `onToggle` stays silent for
it, because the automatic expansion is Arena's decision rather than the user's. See
`ArenaSideNavCollapsible.prompt.md`.

```tsx
<ArenaSideNav ariaLabel="Primary" active={route} onNav={(id) => setRoute(id)}>
  <ArenaSideNavItem id="dashboard" icon="ph-bold ph-squares-four" label="Projects" href="/projects" />
  <ArenaSideNavSection label="Workspace">
    <ArenaSideNavCollapsible id="deploys" icon="ph-bold ph-rocket-launch" label="Deployments">
      <ArenaSideNavItem id="prod" label="Production" href="/deploys/prod" />
      <ArenaSideNavItem id="staging" label="Staging" href="/deploys/staging" />
    </ArenaSideNavCollapsible>
  </ArenaSideNavSection>
</ArenaSideNav>
```

## Do / Don't

- **Do** give every destination an `href`, even in a single-page app. It is what lets
  the item be opened in a new tab and announced as a link.
- **Do** label the nav. `ariaLabel` is required and guarded; it throws when omitted
  *and when blank*, because two unlabelled navs on one page are two landmarks a screen
  reader cannot tell apart, and a constant default names both of them the same thing.
- **Do** write the items yourself. A `ArenaSideNav` with no children is a legal empty
  landmark, not an error: "no destinations right now" is a thing a caller can mean.
- **Don't** wrap items in a fragment. Arena injects into the children it is handed,
  and `React.Children.toArray` does not see through a `<>…</>`; write them as
  siblings, or in an array. A wrapper component of your own has the same effect, and
  it is the same limit `ArenaTable` and `ArenaRadioGroup` already carry.
- **Don't** reach for `onNav` to call `preventDefault()` -- it never receives the click
  event, and it does not need to: Arena has already cancelled the anchor by the time it fires.
- **Don't** wrap an item in your router's `Link`. The anchor is Arena's and is already
  inside the item; navigate in `onNav`.
- **Don't** use it for tabs. `ArenaSideNav` navigates between destinations; `ArenaTabs` changes
  the view within one, and `ArenaSegmentedControl` filters within that.
- **Don't** wrap it in your own `<nav>`. It renders one.
- **Don't** pass `indentStep` a length string. It is a multiplier of `--sp-1`, never a CSS
  length -- a value like `"1.5rem"` is neither a token nor a derivation of one, and it
  would stop re-densifying inside `.arena-compact` with no gate to catch it.

### `active` is an id, and there is no route matcher

`active` names one of the ids you gave the items, and the item whose id matches is the one
marked `aria-current="page"`. It is **not** a path, and there is no `activeMatch` to say
whether it should be compared against each `href` whole or by prefix.

That was asked for and refused, and the reason is not that Arena would have to import a
router: it would not, since a prefix comparison is arithmetic over data you pass in. The
reason is that the member would change what a *different* member means depending on its own
value, so `active` would name an id under one setting and a path under another, and nothing
could check which one a caller meant. A member that redefines its neighbour is a member that
cannot be read in isolation.

Compute the active id yourself. Whatever bridges your router to a signal or to state is
yours in either design; what is left is one comparison:

```tsx
const active = DESTINATIONS.find((d) => pathname.startsWith(d.href))?.id;
```

### The active row is filled, and you pass one string

The item whose `id` matches `active` draws its glyph in `ph-fill`, whatever weight the string
carries. Pass `icon="ph-bold ph-house"` once per destination; do not concatenate a weight
yourself against a condition, which is Arena's own convention reimplemented in every project
that adopts it. The swap is idempotent, so passing `ph-fill` yourself changes nothing.

**A misspelled `ph-` name renders an empty box, silently**, because an icon is a class name
and a class that matches no glyph is not an error. Nothing on your side catches that for you,
so check a name against the `@phosphor-icons/web` you installed if a wrong one would be
expensive.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
