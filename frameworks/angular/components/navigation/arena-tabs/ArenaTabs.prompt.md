Arena tabs, a row of tabs and the panels they switch between, for **views of one subject**, never
for steps in a flow. Standalone, `OnPush`, signal I/O. A compound family: write one `arena-tab` per
view and `arena-tabs` draws the tablist, places the panels, and owns the keyboard.

```html
<arena-tabs [value]="view()" (change)="view.set($event)">
  <arena-tab value="overview" label="Overview">…</arena-tab>
  <arena-tab value="deployments" label="Deployments">…</arena-tab>
  <arena-tab value="settings" label="Settings">…</arena-tab>
</arena-tabs>

<arena-tabs defaultValue="deployments">
  <arena-tab value="overview" label="Overview">…</arena-tab>
  <arena-tab value="deployments" label="Deployments">…</arena-tab>
</arena-tabs>
```

<!-- @api GENERATED from contracts/api/components/ArenaTabs.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `content` | slot |  |  | The tabs. Which one is selected, which is the strip's tab stop, the ids wiring each to its panel and how the choice is reported are the strip's to settle, and none of it is a member here. EVERY tab's content mounts: one panel per tab is rendered and the inactive ones are hidden, because each tab's aria-controls must reference a tabpanel that exists. So a panel's side effects run immediately rather than on first selection. |
| `value` | primitive | `string` |  | The selected tab's value. Omit and pass `defaultValue` to let it govern itself. |
| `defaultValue` | primitive | `string` |  | The initially selected value when uncontrolled. Defaults to the first tab. |
| `change` | event | `string` |  | A different tab was chosen; carries its value. |

<!-- @api end -->

**The children pull; the parent pushes nothing.** `arena-tabs` provides an injectable
`ArenaTabsState` and each `arena-tab` injects it and pulls, its selected state, and the two ids
wiring it to its button. Nothing is pushed, and **no member of either contract describes any of it**. The state
object is not exported from the barrel: it is coordination, not API.

**Every panel mounts.** One `arena-tab` renders one tabpanel, and the unselected ones are hidden
rather than removed, because each tab's `aria-controls` must reference a tabpanel that exists,
a reference pointing at nothing is worse than an absent one. The consequence is real and the
contract states it: **a panel's side effects run immediately**, not on first selection. If a view
is expensive, guard it inside the view rather than expecting the tab to defer it.

**Do / Don't**
- **`value` and `label` are required on every `arena-tab`.** `label` is what the tab reads; Arena
  draws the button, the consumer names it.
- Controlled or not: pass `value` and it is yours, or pass `defaultValue` and the strip remembers
  its own choice. With neither, **the first tab wins**, so a panel is always showing.
- `change` fires only when a **different** tab is chosen. Re-selecting the active tab reports
  nothing.
- **The panels sit outside the tablist**, which is why `arena-tab` renders its content into its own
  host rather than into the row. A tabpanel inside a tablist is invalid, and the compliance suite
  asserts it by containment.
- **The host takes itself out of layout** with `display: contents`, so the tablist and the panels
  stack in the consumer's own flow instead of inside a box `arena-tabs` adds.
- **The roving tab stop and the arrow keys are Arena's**, through `@angular/cdk/a11y`'s
  `FocusKeyManager`: one tab stop into the strip, Left/Right walk and wrap, and the selection
  follows the focus. Up/Down do nothing on purpose, so a horizontal strip does not fight a vertical
  list nested near it.
- **The CDK reads the deprecated `event.keyCode`, not `event.key`.** A browser fills it in, so this
  works in Chromium; a synthetic event that omits it is ignored entirely. Any suite dispatching a
  key at this component must set `keyCode`; happy-dom leaves it `0`, so a suite that sets only
  `key` asserts nothing and passes.
- With no tabs at all it draws an **empty tablist and no tabpanel**, and guards nothing. A root
  promises nothing an empty render would break, but it must not ship an invalid one.
- Don't use it for steps in a sequence, or for anything a person should be able to open in a new
  window. Those are `arena-side-nav` items or links, not tabs.
- Don't fill the selected tab. It is marked by a crimson underline and by weight; a filled tab
  spends the view's primary accent on navigation.

**By hand, in real Chromium**: the keyboard is asserted for real, but the ink and the ring are not.
Run `bun run demos` and open
`/frameworks/angular/components/navigation/arena-tabs/ArenaTabs.demo.generated.html`:
- Tab into the strip **once**: the ring lands on the selected tab, and Tab again leaves the strip
  rather than walking the tabs.
- Left and Right walk the strip and wrap at both ends, and the panel below changes with them.
- The crimson underline sits flush on the strip's own hairline rule rather than floating above it.
- The panel's top gap does not change when switching tabs, the layout must not shift.
- Two strips on the page switch independently, which is the generated id base working.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
