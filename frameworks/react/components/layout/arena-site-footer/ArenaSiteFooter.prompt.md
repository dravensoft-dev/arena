The band across the bottom of every screen: what a page says about itself once it has finished. The footer is the contentinfo landmark, so a page carries one.

```tsx
<ArenaSiteFooter note="© 2026 Meridian Roasters. Roasted in Bilbao.">
  <div><ArenaAppLogo size="sm" name="Meridian" /><p>Single origin, traceable to the farm.</p></div>
  <div><h2>Shop</h2><ul>{shopLinks.map((l) => <li key={l.href}><Link to={l.href}>{l.label}</Link></li>)}</ul></div>
  <div><h2>Company</h2><ul>{aboutLinks.map((l) => <li key={l.href}><Link to={l.href}>{l.label}</Link></li>)}</ul></div>
</ArenaSiteFooter>
```

<!-- @api GENERATED from contracts/api/components/ArenaSiteFooter.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `children` | slot |  |  | The columns, one per child, laid out by a grid that decides its own count from the room it is given rather than from a breakpoint anyone picked. A column of links, a signup, an address and a mark all land the same way. |
| `note` | primitive | `string` |  | The line under the columns, in the muted ink: the licence, the year, the company. Absent, the footer renders no line at all rather than an empty one. |

<!-- @api end -->

**One child is one column**, and the count comes from the room rather than from a breakpoint
anyone picked, the same way `ArenaGrid` decides its own. Nothing is wrapped: a column of links, a
signup form and an address all land as they were written.

**The band matches the bar at the top.** The fill and the hairline run edge to edge, and the contents stop at the page width. The two ends of a page then line up with each other and with everything between them.

**Do / Don't**
- **Do** give each column its own heading. A list of links with no name is a list a reader has to
  read to identify.
- **Do** put the licence and the year in `note`. The slot is the line under the columns, in the muted ink, and it renders nothing at all when absent.
- **Don't** put a second `<footer>` at the top level of the page. Contentinfo is one per page.
- **Don't** reach for it as a card's footer. The card's own footer is a slot on the card, and a `<footer>` inside a section is not this landmark.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component is not a styling surface, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena-to-prod --audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
