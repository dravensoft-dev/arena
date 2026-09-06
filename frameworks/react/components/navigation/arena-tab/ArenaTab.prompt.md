One tab in an `ArenaTabs` strip, and the panel it shows. The tab draws the button; its children fill the
panel `ArenaTabs` renders below the strip.

```tsx
<ArenaTabs defaultValue="overview" onChange={setView}>
  <ArenaTab value="overview" label="Overview"><ServiceHealth /></ArenaTab>
  <ArenaTab value="activity" label="Activity"><ArenaActivityFeed items={items} /></ArenaTab>
</ArenaTabs>
```

<!-- @api GENERATED from contracts/api/components/ArenaTab.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `value*` | primitive | `string` |  | What this tab selects, and what the parent's `change` carries. |
| `label*` | primitive | `string` |  | What the tab reads. Arena draws the button; the consumer names it. |
| `children` | slot |  |  | What the panel shows while this tab is selected. ArenaTabs places it; ArenaTab never renders it, because a tabpanel may not sit inside a tablist. |

<!-- @api end -->

**Do / Don't**
- Do give every tab a `value` and a `label`. Both are required and both are guarded: a blank one
  throws rather than drawing a nameless tab.
- Do write tabs as siblings or in an array. Don't wrap them in a fragment or in a component of your own, because `React.Children.toArray` cannot see through either. `ArenaTabs` would have nothing to inject into, and the strip would render inert.
- Don't render the panel yourself. `ArenaTabs` draws exactly one, wired to the selected tab; a second
  one would be a panel no tab controls.
- Don't reach for `style`. The component takes none.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component is not a styling surface, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena-to-prod --audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
