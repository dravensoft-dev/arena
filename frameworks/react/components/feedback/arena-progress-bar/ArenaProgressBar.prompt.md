Progress bar (H1). Gives visible status to measurable processes outside the splash: deployments, uploads, migrations. Respects `prefers-reduced-motion` in indeterminate mode.

```tsx
<ArenaProgressBar label="Deploying build #4821" progressPercentage={64} />
<ArenaProgressBar tone="success" progressPercentage={100} label="Published" />
<ArenaProgressBar indeterminate tone="accent" label="Connecting…" />
```

<!-- @api GENERATED from contracts/api/components/ArenaProgressBar.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `progressPercentage` | primitive | `number` | `0` | How far along, 0-100. Clamped and rounded. Ignored when `indeterminate`. |
| `indeterminate` | primitive | `boolean` | `false` | A wait with no percentage; the bar sweeps instead of filling. |
| `tone` | enum | `ArenaProgressTone` | `"accent"` | The bar's colour. |
| `label*` | primitive | `string` |  | Names what is progressing. Drawn above the bar, and it is the bar's accessible name. Required and guarded rather than defaulted: nothing can derive what is progressing, and a fallback of "Progress" satisfies roles.label mechanically while telling a screen-reader user only what the component is -- two of them on one page announce identically. |
| `showPercentage` | primitive | `boolean` | `true` | Shows the percentage beside the label. Determinate only. |
| `size` | enum | `ArenaControlSize` | `"md"` | The bar's thickness. |

<!-- @api end -->

`progressPercentage` is 0–100, clamped and rounded; it is not a form control's `value`,
which is what that name means everywhere else in this library. `showPercentage` (default
`true`) shows the number beside the label; it is drawn in determinate mode only.

**Do**
- Use *determinate* mode whenever a real percentage exists; it communicates remaining time.
- Align `tone` with the state (success when done, danger if it fails).
- Pass a `label`: it is drawn above the bar **and** is the bar's accessible name. Without one
  the bar is announced as the generic "Progress", which tells a screen-reader user nothing
  about which of the page's bars it is.

**Don't**
- Don't use `indeterminate` for processes you do know: it degrades visibility (H1).
- Don't pass markup as `label`. It is a plain string, precisely so the accessible name is the
  same words the sighted reader sees.
- Don't replace a result ArenaToast with the bar; the bar reports progress, the ArenaToast reports the outcome.
- Don't expect the bar to narrate every step. It carries `aria-live="polite"` because
  `role="progressbar"` has no implicit live region, and the percentage is repeated inside that
  region as visually-hidden text so the announcement is an ordinary content change rather than
  an attribute-only one, but a bar that ticks continuously is chatty by construction. Announce
  a milestone that matters with an `ArenaToast`.
- Don't read `showPercentage={false}` as silence. It drops the number beside the label; the
  region keeps its own copy, because hiding a number visually is a layout choice and not a
  reason to stop reporting progress.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
