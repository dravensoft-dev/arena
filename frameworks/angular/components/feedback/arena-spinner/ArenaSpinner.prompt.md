Arena spinner, an indeterminate wait indicator. Standalone, `OnPush`, signal I/O. The host
**is** the indicator, and it is the live region: `role="progressbar"`, `aria-live="polite"`
and the accessible name all sit on it, with the spinning ring a decorative `aria-hidden` child.

```html
<arena-spinner label="Fetching deployments" />
<arena-spinner size="sm" tone="on-accent" label="Saving" />
```

<!-- @api GENERATED from contracts/api/components/ArenaSpinner.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `size` | enum | `ArenaControlSize` | `"md"` | Diameter. 'sm' is --icon-sm exactly, so a spinner at that size sits inline with control text. |
| `tone` | enum | `ArenaSpinnerTone` | `"accent"` | Colour of the ring. 'on-accent' inside a filled button; 'accent' on a page surface. |
| `label` | primitive | `string` | `"Loading"` | Accessible name, announced by the status role. Say what is loading when you can. |

<!-- @api end -->

It reports **no value at all**: no `aria-valuenow`, no `aria-valuemin`, no `aria-valuemax`,
because a spinner is indeterminate by definition and ARIA expresses that by omitting the value.
Reporting zero would be a determinate claim that nothing has happened.

**The live region is explicit**, the same way `arena-progress-bar`'s is: `role="progressbar"`
carries no implicit politeness, `MatProgressSpinner` set no `aria-live` at all, and that was the
exception the delegated binding carried. This clears it.

`label` defaults to `Loading`, which is a name rather than an absence, but it is a name that
says what the component is instead of what the user is waiting for. Set it.

`tone="on-accent"` exists for a spinner sitting **on** a filled brand surface, inside a loading
button, on a crimson banner, where the accent ink would disappear into its own background.

**Do / Don't**
- **Do** reach for `arena-progress-bar` the moment the wait has a measurable end. A spinner says
  "something is happening"; a bar says how much is left, and a user who can see the end waits
  better.
- **Do** keep one spinner per wait. Three of them in a row are three live regions announcing the
  same thing.
- **Don't** size it with a wrapper. `size` is the axis, `sm` matches an icon, `md` a control,
  `lg` a page-level wait, and a scaled wrapper puts the ring's border width off the token.
- **Don't** leave it on screen with nothing behind it. A spinner that never resolves is the one
  state `arena-error-state` is for.

**By hand, in real Chromium**: the rotation is an animation and happy-dom has none. Run
`bun run demos` and open `/frameworks/angular/components/feedback/arena-spinner/ArenaSpinner.demo.generated.html`:
- The ring rotates continuously on `--loop-spin`, and **slows** to `--loop-reduced` under
  `prefers-reduced-motion` rather than stopping, motion reporting work in progress keeps
  reporting it.
- The gap in the ring is the transparent top border, so the rotation is legible at every size;
  at `sm` it must still read as a ring rather than a dot.
- `on-accent` is the only tone that stays legible on a filled crimson surface, the card puts
  all four on one to show it.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
