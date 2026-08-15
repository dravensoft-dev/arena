Arena site footer, the band across the bottom of every screen. Standalone, `OnPush`, signal I/O.
The host takes itself out of layout with `display: contents` and the real `<footer>` is inside,
because a contentinfo landmark has to be that element.

```html
<arena-site-footer note="© 2026 Meridian Roasters. Roasted in Bilbao.">
  <div>
    <arena-app-logo size="sm" name="Meridian" />
    <p>Single origin, traceable to the farm.</p>
  </div>
  <div>
    <h2>Shop</h2>
    <ul>@for (l of shopLinks(); track l.href) { <li><a [routerLink]="l.href">{{ l.label }}</a></li> }</ul>
  </div>
</arena-site-footer>
```

<!-- @api GENERATED from contracts/api/components/ArenaSiteFooter.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `content` | slot |  |  | The columns, one per child, laid out by a grid that decides its own count from the room it is given rather than from a breakpoint anyone picked. A column of links, a signup, an address and a mark all land the same way. |
| `note` | primitive | `string` |  | The line under the columns, in the muted ink: the licence, the year, the company. Absent, the footer renders no line at all rather than an empty one. |

<!-- @api end -->

**One child is one column**, and the count comes from the room rather than from a breakpoint anyone
picked, the same way `arena-grid` decides its own. Nothing is wrapped: a column of links, a signup
form and an address all land as they were written.

**The band matches the bar at the top.** The fill and the hairline run edge to edge and the
contents stop at the page width, so the two ends of a page line up with each other.

**Do / Don't**
- **Do** give each column its own heading. A list of links with no name is a list a reader has to
  read to identify.
- **Do** put the licence and the year in `note`. It renders nothing at all when absent.
- **Don't** put a second `<footer>` at the top level of the page. Contentinfo is one per page.
- **Don't** reach for it as a card's footer. That is a slot on the card, and a `<footer>` inside a
  section is not this landmark.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/angular/components/layout/arena-site-footer/ArenaSiteFooter.demo.generated.html`:
- Narrow the window: the column count falls one step at a time and never overflows.
- The note sits under the columns and takes the muted ink in both themes.
- The band lines up with the content above it at every width.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
