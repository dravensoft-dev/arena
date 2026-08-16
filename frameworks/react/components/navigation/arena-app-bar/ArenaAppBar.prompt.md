The band across the top of every screen: the site's identity, the way through it, and the controls
that follow the reader everywhere. It is the banner landmark, so there is one per page.

```tsx
<ArenaAppBar
  brand={<Link to="/" aria-label="Meridian Roasters, home"><ArenaAppLogo size="sm" name="Meridian" /></Link>}
  nav={<nav aria-label="Shop sections">{destinations.map((d) => <Link key={d.id} to={d.href}>{d.label}</Link>)}</nav>}
  actions={<>
    <ArenaIconButton icon="ph-bold ph-magnifying-glass" label="Search the catalogue" onClick={openSearch} />
    <ArenaIconButton icon="ph-bold ph-basket" variant="solid" label="Basket" onClick={openCart} />
  </>} />
```

<!-- @api GENERATED from contracts/api/components/ArenaAppBar.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `brand` | slot |  |  | The identity, at the start edge: an ArenaAppLogo, a wordmark, a mark. Wrap it in your own link if it should lead home; the bar draws no anchor of its own, which is what keeps a router's link out of a component that would have to swallow it. |
| `nav` | slot |  |  | The way through the site, between the brand and the actions. It is a slot and not a list of destinations because the links are the consumer's: they are their router's, and the navigation landmark around them is theirs to name, since a page with a side nav as well needs the two told apart. |
| `actions` | slot |  |  | What follows the reader everywhere, at the end edge: search, theme, basket, account. Arena draws the row; the consumer draws what sits in it. |
| `sticky` | primitive | `boolean` | `true` | Whether the bar stays at the top edge as the page scrolls. True by default, because a bar that carries the way through a site and scrolls away with the content is a bar the reader has to go back for. It takes the navigation layer of the stacking order, so a dialog and a sheet still cover it. |

<!-- @api end -->

**The bar spans the viewport and the band inside it does not.** The fill and the hairline run edge
to edge; the contents stop at the page width with a gutter either side, so they line up with
everything under them. Both lengths are the roles a style plugin re-answers, the same pair `.arena-band`
carries for markup you wrote yourself.

**The nav landmark is yours, and that is deliberate.** The links are your router's, and Arena never
wraps one. A page with a side nav as well has two navigation landmarks, and naming them apart is a
judgement about your page rather than about this component, so the `<nav aria-label>` goes in the
slot.

**`sticky` takes the navigation layer of the stacking order.** A dialog, a sheet and a command
palette all still cover it, which is what keeps a modal from sliding under the bar.

**Do / Don't**
- **Do** wrap the brand in your own link if it should lead home. The bar draws no anchor.
- **Do** keep the actions to controls the reader needs on every screen. The row wraps rather than
  squeezing, so a crowded bar becomes two lines rather than an unreadable one.
- **Don't** put a second `<header>` at the top level of the page. Banner is one per page, and two
  make the landmark useless to anyone navigating by it.
- **Don't** reach for it inside a card or a dialog. A `<header>` nested in a section is not a
  banner, and this component is one.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
