Arena app bar, the band across the top of every screen. Standalone, `OnPush`, signal I/O. The host
takes itself out of layout with `display: contents` and the real `<header>` is inside, because a
banner landmark has to be that element.

```html
<arena-app-bar>
  <a brand routerLink="/" aria-label="Meridian Roasters, home">
    <arena-app-logo size="sm" name="Meridian" />
  </a>
  <nav nav aria-label="Shop sections">
    @for (d of destinations(); track d.id) { <a [routerLink]="d.href">{{ d.label }}</a> }
  </nav>
  <div actions>
    <arena-icon-button icon="ph-bold ph-magnifying-glass" label="Search the catalogue" (click)="openSearch()" />
  </div>
</arena-app-bar>
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

**The three slots are attributes**, `brand`, `nav` and `actions`, projected through the marker
directives. Each takes one element, so wrap a row of controls in a container of your own.

**The bar spans the viewport and the band inside it does not.** The fill and the hairline run edge
to edge; the contents stop at the page width with a gutter either side, so they line up with
everything under them. Both lengths are the roles a style plugin re-answers, the same pair `.arena-band`
carries for markup you wrote yourself.

**The nav landmark is yours, and that is deliberate.** The links are your router's, and Arena never
wraps one. A page with a side nav as well has two navigation landmarks, and naming them apart is a
judgement about your page rather than about this component.

**Do / Don't**
- **Do** wrap the brand in your own link if it should lead home. The bar draws no anchor.
- **Do** remember the host carries no box, which is the rule every `display: contents` primitive in
  this package carries.
- **Don't** put a second `<header>` at the top level of the page. Banner is one per page.
- **Don't** reach for it inside a card or a dialog. A `<header>` nested in a section is not a
  banner, and this component is one.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/angular/components/navigation/arena-app-bar/ArenaAppBar.demo.generated.html`:
- Scroll the page: with `sticky` the bar holds the top edge and a dialog still covers it.
- Narrow the window: the row wraps to two lines rather than squeezing its controls.
- The band's contents line up with the content under the bar at every width.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
