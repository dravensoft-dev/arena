A row of tabs and the one panel they switch between. The active tab has a crimson underline.

```tsx
<ArenaTabs defaultValue="overview" onChange={setView}>
  <ArenaTab value="overview" label="Overview"><ServiceHealth /></ArenaTab>
  <ArenaTab value="deployments" label="Deployments"><DeployTable /></ArenaTab>
</ArenaTabs>
```

<!-- @api GENERATED from contracts/api/components/ArenaTabs.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `children` | slot |  |  | The tabs. Which one is selected, which is the strip's tab stop, the ids wiring each to its panel and how the choice is reported are the strip's to settle, and none of it is a member here. EVERY tab's content mounts: one panel per tab is rendered and the inactive ones are hidden, because each tab's aria-controls must reference a tabpanel that exists. So a panel's side effects run immediately rather than on first selection. |
| `value` | primitive | `string` |  | The selected tab's value. Omit and pass `defaultValue` to let it govern itself. |
| `defaultValue` | primitive | `string` |  | The initially selected value when uncontrolled. Defaults to the first tab. |
| `onChange` | event | `string` |  | A different tab was chosen; carries its value. |

<!-- @api end -->

**Do / Don't**
- Do write one `<ArenaTab>` per view, with that view as its children. There is no `tabs` array and no
  item type: a tab is a component, so its panel can be your own markup.
- Do write tabs as siblings or in an array. Don't wrap them in a fragment or a component of your
  own: `React.Children.toArray` cannot see through either, so nothing would be injected and the
  strip would render inert.
- Don't render your own panel, and don't switch on the value yourself. Arena renders one tabpanel
  per tab and shows exactly one of them; a panel of your own is a panel no tab controls.
- **Do expect every tab's content to mount immediately.** Arena renders all the panels and hides the
  inactive ones, because the `tabs` pattern requires *each* tab to have an `aria-controls`
  referencing its tabpanel, and a reference to an id nothing renders is not a reference. So a
  panel's effects run on mount, not on first selection.
- **Don't put a cost you only want to pay on selection inside a `<ArenaTab>`'s children**: a fetch, a
  chart that measures itself, a subscription. Guard it on the value you already have from
  `onChange`, or render that view's body only once its tab has been chosen. Arena cannot make this
  decision for you: deferring the mount is what dangles the other tabs' `aria-controls`.
- Don't reach for `style` to space the strip. It takes none; the panel already carries the gap
  below the underline.

**Checked by hand, because a suite cannot hold it:** happy-dom has no sequential focus navigation,
so nothing asserts that Tab from a tab reaches the panel rather than the next tab. Serve the tree
with `bun run demos`, open `frameworks/react/components/navigation/arena-tabs/ArenaTabs.demo.generated.html`,
and check it in a real browser.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
