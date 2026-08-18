Progress bar (H1). Gives visible status to measurable processes outside the splash: deployments, uploads, migrations. Respects `prefers-reduced-motion` in indeterminate mode.

```tsx
<ArenaProgressBar label="Deploying build #4821" progressPercentage={64} />
<ArenaProgressBar tone="success" progressPercentage={100} label="Published" />
<ArenaProgressBar indeterminate tone="accent" label="Connecting…" />
<ArenaProgressBar shape="radial" size="lg" progressPercentage={64} label="Lesson 4" />
```

`shape="radial"` draws the same meter as a ring: the figure sits in the middle and the label
under it. Reach for it where the meter is the tile rather than a line in one, a completion
ring on a dashboard or a node on a path, and keep the bar for a row.

The middle is a slot, so a ring measures something of yours instead of showing a number.
Turn the figure off yourself when you fill it: the two share that space, and no component
here decides what it draws from what you projected.

```tsx
<ArenaProgressBar shape="radial" size="lg" showPercentage={false}
  progressPercentage={40} label="Unit 3, lesson 4">
  <ArenaIconButton icon="ph-fill ph-star" label="Start lesson 4" />
</ArenaProgressBar>
```

<!-- @api GENERATED from contracts/api/components/ArenaProgressBar.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `children` | slot |  |  | What sits in the middle of a ring, in place of the percentage: a glyph, a mark, or the control the ring measures. A bar has no middle, so a bar draws nothing for it. The ring's own `progressbar` element is the drawing rather than the box around it, because that role's children are presentational and a control projected inside it would be drawn and never announced; here it is a sibling of the meter and keeps everything it came with. |
| `progressPercentage` | primitive | `number` | `0` | How far along, 0-100. Clamped and rounded. Ignored when `indeterminate`. |
| `indeterminate` | primitive | `boolean` | `false` | A wait with no percentage; the bar sweeps instead of filling. |
| `tone` | enum | `ArenaProgressTone` | `"accent"` | The bar's colour. |
| `label*` | primitive | `string` |  | Names what is progressing. Drawn above the bar or under the ring, and it is the meter's accessible name. Required and guarded rather than defaulted: nothing can derive what is progressing, and a fallback of "Progress" satisfies roles.label mechanically while telling a screen-reader user only what the component is -- two of them on one page announce identically. |
| `showLabel` | primitive | `boolean` | `true` | Draws the label beside the meter. False leaves the meter alone and keeps the accessible name, which is carried by aria-label on the progressbar element rather than by the text. For a bar in a table cell or a card row, where the row already names what is progressing and repeating it is noise. `label` stays required either way, on the reading it already carries: what a screen reader announces is not a decision about what is drawn. It is the same escape ArenaIconButton.showLabel offers, and it is here because the two components pose one question. |
| `showPercentage` | primitive | `boolean` | `true` | Shows the percentage: beside the label on a bar, and in the middle of a ring, which is the figure a meter in a tile is read by. Determinate only. Turn it off when `content` fills a ring's middle: the two share that space, and Arena never derives what it draws from what a consumer projected, because projected content is not inspectable in at least one layer. |
| `size` | enum | `ArenaControlSize` | `"md"` | How heavy the meter is: the bar's thickness, and a ring's diameter with a band the same weight as the bar it replaces. |
| `shape` | enum | `ArenaProgressShape` | `"linear"` | Whether the meter is drawn as a bar or as a ring. A ring puts the percentage inside its own track and the label under it, which is the arrangement a tile wants and the one a row cannot give: a bar is as wide as its row and reads along it, while a ring is as wide as it is tall and reads at a glance. It is a shape rather than a second component because everything else is the same question answered once: the percentage, the tone, the required name, the announcement and the sweep a wait draws. |

<!-- @api end -->

`progressPercentage` is 0–100, clamped and rounded; it is not a form control's `value`,
which is what that name means everywhere else in this library. `showPercentage` (default
`true`) shows the number beside the label; it is drawn in determinate mode only.

**Do**
- Use *determinate* mode whenever a real percentage exists; it communicates remaining time.
- Align `tone` with the state (success when done, danger if it fails).
- Put a ring where it has room to be read: a ring's own size is its whole geometry, so `size`
  moves the diameter and the band together and there is nothing else to tune.
- Pass a `label`: it is drawn beside the meter **and** is its accessible name. Without one
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
- Don't project a control into a bar's middle: a bar has no middle and draws nothing for it.
- Don't reach for a ring to save room. A ring at `sm` is smaller than a bar is long and
  harder to read, and the figure inside it is the point: a meter nobody can read a number off
  is a decoration.
- Don't read `showPercentage={false}` as silence. It drops the number beside the label; the
  region keeps its own copy, because hiding a number visually is a layout choice and not a
  reason to stop reporting progress.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
