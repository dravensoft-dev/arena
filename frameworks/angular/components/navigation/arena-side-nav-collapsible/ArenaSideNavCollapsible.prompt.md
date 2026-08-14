Arena side-nav collapsible, a disclosure inside an `arena-side-nav`: a trigger row that shows and
hides a group of destinations. Standalone, `OnPush`, signal I/O.

```html
<arena-side-nav-collapsible id="deploys" icon="ph-bold ph-rocket-launch" label="Deployments"
                            (toggle)="remember('deploys', $event)">
  <arena-side-nav-item id="prod" label="Production" href="/prod" />
  <arena-side-nav-item id="staging" label="Staging" href="/staging" />
</arena-side-nav-collapsible>
```

<!-- @api GENERATED from contracts/api/components/ArenaSideNavCollapsible.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `id*` | primitive | `string` |  | Identifies the group. The disclosure pattern needs two DOM ids that resolve -- the trigger's aria-controls must name the region, and the region's aria-labelledby must name the trigger -- and Arena derives both from this member, as `${id}-trigger` and `${id}-region`. Neither wiring is conditional: every collapsible has a trigger and a region, so there is no shape in which the id goes unused, and that is why it is required rather than optional. A group is a thing a consumer names anyway. Falsy-guarded as well as required: a blank id yields the pair `-trigger`/`-region`, which every other blank-id collapsible on the page would share, and duplicate ids make aria-controls resolve to the wrong element rather than to none. A consumer can address either element from outside as a consequence -- an aria-describedby, a deep link, a test hook -- but that is a benefit of the derivation, not the reason for it. |
| `label*` | primitive | `string` |  | What the trigger reads, and the accessible name of both the trigger and the region it controls. Required and falsy-guarded. |
| `icon` | primitive | `string` |  | A Phosphor class name drawn before the label. The caret that reports expanded-ness is Arena's own and is not this member. |
| `defaultExpanded` | primitive | `boolean` | `false` | Whether the group starts open. It is a seed, not a control: after the first render the state is the component's, and the group also opens itself when it comes to hold the active destination. |
| `content` | slot |  |  | What the group holds -- items, sections, further collapsibles. Each sits one nesting level deeper. |
| `toggle` | event | `boolean` |  | The trigger was pressed, carrying the state it moved to. It fires on a press ONLY: the automatic expansion that follows the active destination is Arena's decision rather than the user's, and reporting it here would be a lie a consumer persists. |

<!-- @api end -->

The trigger is a native `<button type="button">` carrying `aria-expanded` and an `aria-controls`
naming its region. **The region is always rendered** and hidden by the `hidden` attribute alone,
the preflight's `[hidden] { display: none !important }` outranks the region's own `flex`, so
nothing has to hide it a second time. `aria-controls` therefore never points at
nothing, and a collapsed region's links are out of the tab order because `hidden` removes them.

**It opens itself around the active destination, and that is not a press.** If any row anywhere in
its subtree is `active`, the group expands, including a group two levels up from the row. That
expansion is Arena's decision, so it reports **nothing** through `toggle`; reporting it would be a
lie a consumer persists. A user may then collapse a group holding the active destination and it
stays collapsed: the state is derived at the seed and owned by the user afterwards.

Enter and Space are **intercepted and prevented**, then toggle. That is one rule shared with
`arena-menu`: leaving them to the platform means the synthesized click fires too, and the group
opens twice in a browser while a suite sees it open once.

`defaultExpanded` seeds the first render only. `toggle` carries the state it moved to.

**Do / Don't**
- **Do** persist `toggle` if the rail should remember itself across a reload. Arena keeps no
  storage of its own.
- **Do** nest one inside another when the hierarchy has three levels. They are independent
  disclosures and neither closes the other.
- **Don't** read this as a treeview. There is no `aria-level`, no roving tab stop and no arrow
  navigation, and that is refused rather than missing, a nav landmark full of links is a set of
  disclosures, and the binding states the cost.
- **Don't** put a destination on the trigger itself. It opens a group; a row that navigates is an
  `arena-side-nav-item`.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
