The one control on a page that exists for a keyboard alone: it lets a reader step over everything
repeated on every screen and land in the content. It returns the anchor itself, so what the page
sees is the element, with no wrapper around it.

```tsx
<ArenaSkipLink label="Skip to content" />
<Header />
<ArenaSideNav ariaLabel="Sections">…</ArenaSideNav>
<ArenaMain>
  <Outlet />
</ArenaMain>
```

<!-- @api GENERATED from contracts/api/components/ArenaSkipLink.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | The words a reader reads when the link appears. Required, and guarded at runtime after trimming, the shape ArenaSideNav.ariaLabel carries for the same reason: this is text a person reads and nothing can derive it, and the guard trims first because the value it exists to catch is a present and useless one rather than an absent one, which the type already refuses. There is a defensible default in English and it is deliberately not given, because a default in one language is a wrong answer everywhere else and it is wrong silently. |

<!-- @api end -->

**Place it first, above everything it exists to skip.** That is the one of the four details it
cannot do for itself, and it is the one that decides whether the link works at all: tab order
follows the document, so a skip link written under a nav of nine destinations is reached on the
tenth Tab, by which point the reader has already been through everything the link was going to
save them. Write it as the first element of the shell.

**The other three are Arena's.** It is invisible until it takes focus and visible the moment it
does, through opacity rather than through mounting, so it is reachable by Tab at every moment and
nothing appears or disappears from the tree. It is fixed at the top of the page, on the layering
slot directly above `nav`, because a link that lands under a sticky header is a link nobody can
read. And the region it points at is focusable programmatically, which `ArenaMain` carries: an
anchor pointing at a container the platform will not focus scrolls the page and leaves focus
behind.

**It points at the page's `ArenaMain`, by an id Arena writes on both sides.** There is nothing to
coordinate at the call site and no id to pass, because a page has one main landmark. A page with a
skip link and no `ArenaMain` has a link to nowhere, and nothing can detect that from inside either
component, so it is the one thing to check by hand.

**Do**
- Say where the reader lands, in the application's own words. "Skip to content" and "Skip to the
  order list" are both right; the second is better on a screen whose content has a name.
- Write exactly one per page, next to the one `ArenaMain`.

**Don't**
- Don't put it inside the header or the nav to keep the shell tidy. Inside either, it is reached
  after them and skips nothing.
- Don't give it a `className` to make it visible for testing. Press Tab, which is the state a
  reader actually meets.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/react/components/layout/arena-skip-link/ArenaSkipLink.demo.generated.html`:
- With the page freshly loaded, the first Tab reveals it and nothing else has focus before it.
- It draws over whatever is beneath it rather than pushing the page down.
- Enter moves focus into the main region, and the Tab after that continues from inside it.
- A second Tab away from it makes it invisible again with no layout moving.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
