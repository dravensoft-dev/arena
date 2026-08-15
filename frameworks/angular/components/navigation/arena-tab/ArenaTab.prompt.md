Arena tab, one view inside an `arena-tabs` strip. Standalone, `OnPush`, signal I/O. It exists
because a consumer's own content has to go inside **one** item of something Arena draws: the
moment there is one element per view, per-item projection stops being the problem it would be
otherwise.

```html
<arena-tabs [value]="view()" (change)="view.set($event)">
  <arena-tab value="overview" label="Overview">
    <arena-stat-card label="Uptime" value="99.98%" />
  </arena-tab>
  <arena-tab value="settings" label="Settings">…</arena-tab>
</arena-tabs>
```

<!-- @api GENERATED from contracts/api/components/ArenaTab.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `value*` | primitive | `string` |  | What this tab selects, and what the parent's `change` carries. |
| `label*` | primitive | `string` |  | What the tab reads. Arena draws the button; the consumer names it. |
| `content` | slot |  |  | What the panel shows while this tab is selected. ArenaTabs places it; ArenaTab never renders it, because a tabpanel may not sit inside a tablist. |

<!-- @api end -->

**It draws the panel, not the button.** `arena-tabs` renders the tablist and every tab button in
it from this component's `label`; `arena-tab`'s own host **is** the tabpanel. That split is not a
style choice, a tabpanel may not sit inside a tablist, so the two cannot be one element.

**Do / Don't**
- **`value` and `label` are both required.** `value` is what the parent's `change` carries;
  `label` is what the button reads.
- **It only works inside `arena-tabs`.** It injects the parent's state to learn whether it is
  selected and which ids wire it to its button; on its own it has nothing to inject and Angular
  reports it as a missing provider.
- **Values must be distinct within one strip.** The parent resolves both ids by finding the tab
  with that value, so a duplicate makes two panels answer to one button.
- **Its content mounts whether or not it is selected**, and is hidden rather than removed when it
  is not. Anything expensive belongs behind a guard inside the content, not behind the tab.
- It binds the `none` pattern, and that is not an absence: every requirement that applies to a tab
  is a clause of the `tabs` pattern, which `arena-tabs` binds and its suite verifies.
- Don't reach for `arena-tab` to make a panel you place yourself. It renders where the parent puts
  it, which is after the tablist and nowhere else.

**By hand, in real Chromium**: checked from the parent's page, since a tab alone renders nothing
useful. Run `bun run demos` and open
`/frameworks/angular/components/navigation/arena-tabs/ArenaTabs.demo.generated.html`, then walk the checklist in
`ArenaTabs.prompt.md`.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
