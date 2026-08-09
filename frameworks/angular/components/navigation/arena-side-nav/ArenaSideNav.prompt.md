Arena side nav, the primary navigation landmark, and the root of a compound family that nests to
any depth. Standalone, `OnPush`, signal I/O. The host **is** the landmark: `role="navigation"`,
the accessible name and the column layout all sit on it.

```html
<arena-side-nav ariaLabel="Primary" [active]="route()" (nav)="go($event)">
  <arena-side-nav-item id="projects" icon="ph-bold ph-squares-four" label="Projects" href="/projects" />
  <arena-side-nav-section label="Workspace">
    <arena-side-nav-item id="members" label="Members" href="/members" />
    <arena-side-nav-collapsible id="deploys" icon="ph-bold ph-rocket-launch" label="Deployments">
      <arena-side-nav-item id="prod" label="Production" href="/prod" />
    </arena-side-nav-collapsible>
  </arena-side-nav-section>
</arena-side-nav>
```

<!-- @api GENERATED from contracts/api/components/ArenaSideNav.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `active` | primitive | `string` |  | The id of the current destination. The ArenaSideNavItem whose id matches is marked aria-current="page", and no item is marked when it names none of them. |
| `ariaLabel*` | primitive | `string` |  | Names this navigation landmark. Required, and guarded at runtime: the guard trims before it decides, so a blank name is refused as well as an absent one, because ariaLabel="" renders a landmark with no accessible name, which is the defect arriving through a value that is present. Guarded rather than defaulted: the navigation pattern asks each landmark on a page for a UNIQUE name, and a constant default satisfies the existence half while two sidebars on one page stay indistinguishable. Nothing can derive it either; what a nav is FOR is editorial. Say what it navigates -- "Primary", "Project settings" -- the ArenaTable.label and ArenaSegmentedControl.ariaLabel shape. |
| `content` | slot |  |  | The navigation tree. One ArenaSideNavItem per destination, optionally grouped by ArenaSideNavSection and ArenaSideNavCollapsible; where each child sits, which id is active and how it reports `nav` are the parent's to settle, and none of it is a member here. |
| `indentStep` | primitive | `number` | `3` | How far each nesting level indents, as a MULTIPLIER of --sp-1 rather than a length: the row at depth N is padded calc(var(--sp-1) * 3 + var(--sp-1) * indentStep * N). A CSS string was rejected -- a caller-supplied "1.5rem" is neither a token nor a derivation of one, so it would stop re-densifying inside .arena-compact, and no gate would catch it because the gate that forbids a bare length scans source and not the values a caller passes in. |
| `nav` | event | `string` |  | An item was activated, carrying its id. It carries the id alone, on the ArenaBreadcrumbs precedent that the platform event leaves the payload and the item travels by itself, and under the compound shape there is no item datum left to carry either, because the consumer wrote the element and already holds everything on it. Where the item has an href, Arena has already cancelled the anchor by the time this fires, so a listener routes and does not double-navigate; ctrl-click, middle-click and open-in-new-tab are the browser's and fire nothing, so a consumer who wires no listener still has a working column of real links. |

<!-- @api end -->

`ariaLabel` is **required and guarded at runtime**, because `input.required` is a compile-time
claim and a blank string satisfies it. Two navigation landmarks on one page must not share a name.

**Depth is pulled, not pushed, and that is the whole design.** Each container **provides** a
fresh `ArenaSideNavState` whose depth is its parent's plus one, and a row reads its own indent from
the nearest ancestor through DI. The consequence is worth knowing: **a consumer's own wrapper
component between two levels is harmless**, because DI walks past it, and so is a `@for`, and
so is any depth of projection. Nothing here inspects its own children, so nothing here can be
broken by what sits between them.

**A row declares its own id to the nearest state, and that is how a group knows it holds the
active destination.** The travel is the row's, not the group's, for the same reason the indent is:
a row is where its own `id` is bound, so it is the only place that value can be read without
asking a question about a child that has not been given one yet. So a group opens itself around
an active row it never sees, whether a `@for` built that row, a wrapper component holds it, or it
sits three levels down.

`indentStep` is a **number**, never a CSS string, a multiplier on `--sp-1`, not a length. A row at
depth N is padded `calc(var(--sp-1) * 3 + var(--sp-1) * indentStep * N)`, so the indent
re-densifies and re-themes with the token. Pass a step, never a length: a CSS string here
would survive the type and then stop tracking the density and the theme.

`active` is the id of the current destination and `nav` reports the id of the row pressed. An item
with `href` splits its activations: the plain one is reported through `nav`, so
`router.navigateByUrl` in that handler is the whole bridge and nothing navigates twice, and the
rest keep working for a consumer who wires no handler.

**Do not put `routerLink` on `arena-side-nav-item`.** `RouterLink` decides whether it is on an
anchor from the host's `tagName`, and the anchor here is inside the component, so it would ignore
every modifier key and add a second tab stop over the row's own link. Navigate in `(nav)` instead.

**Do / Don't**
- **Do** give each row a stable `id`. `active`, `nav` and the collapsible's own auto-expansion are
  all keyed by it.
- **Do** leave `indentStep` alone unless the rail is unusually narrow. Three is the step every
  Arena sidebar uses.
- **Don't** put a heading, a divider or a search box in as a child. The family is three components
  and the landmark holds nothing else.
- **Don't** expect a treeview. Each collapsible is an independent disclosure, no `aria-level`, no
  roving tab stop, no arrow navigation, and that is refused rather than missing;
  `ArenaSideNavCollapsible.behaviour.json` states the cost.

### `active` is an id, and there is no route matcher

`active` names one of the ids you gave the items, and the item whose id matches is the one
marked `aria-current="page"`. It is **not** a path, and there is no `activeMatch` to say
whether it should be compared against each `href` whole or by prefix.

That was asked for and refused, and the reason is not that Arena would have to import
`@angular/router`: it would not, since a prefix comparison is arithmetic over data you pass
in. The reason is that the member would change what a *different* member means depending on
its own value, so `active` would name an id under one setting and a path under another, and
nothing could check which one a caller meant. A member that redefines its neighbour is a
member that cannot be read in isolation.

Compute the active id yourself. The `NavigationEnd` bridge that turns `router.url` into a
signal is yours in either design, because `router.url` is a property rather than a signal.
Write the bridge, then the comparison:

```ts
private readonly router = inject(Router);

readonly url = toSignal(
  this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url)),
  { initialValue: this.router.url },
);

readonly active = computed(() => DESTINATIONS.find((d) => this.url().startsWith(d.href))?.id);
```

**Read `router.url` through the bridge and never in the template.** Reading the property
directly appears to work, because swapping the routed component marks the shell dirty as a
side effect of how `RouterOutlet` works, and a zoneless `OnPush` shell then re-renders anyway.
It stops the moment a navigation reuses the component it is already showing, which is what a
tab change or a parameter change does, and nothing reports it: the rail simply keeps the
previous destination lit.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/angular/components/navigation/arena-side-nav/ArenaSideNav.demo.generated.html`:
- Each level steps in by exactly one `--sp-1 * indentStep`, and a row's icon stays aligned with its
  siblings' rather than with its parent's.
- Switching the active destination moves the ink and the weight, and opens the group holding it.
- The rail still reads at `.arena-compact`, where every indent shrinks with the token.

### The active row is filled, and you pass one string

The item whose `id` matches `active` draws its glyph in `ph-fill`, whatever weight the string
carries. Pass `icon="ph-bold ph-house"` once per destination; do not concatenate a weight
yourself against a condition, which is Arena's own convention reimplemented in every project
that adopts it. The swap is idempotent, so passing `ph-fill` yourself changes nothing.

**A misspelled `ph-` name renders an empty box, silently**, because an icon is a class name
and a class that matches no glyph is not an error. Nothing on your side catches that for you,
so check a name against the `@phosphor-icons/web` you installed if a wrong one would be
expensive.
