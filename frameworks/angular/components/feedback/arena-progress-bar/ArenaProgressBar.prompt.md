Arena progress bar, determinate by default, indeterminate for a wait with no percentage.
Standalone, `OnPush`, signal I/O. The host is the column the meter sits in: as a bar, an
optional head row carrying the label and the percentage with the track below it; as a ring,
the ring with the figure inside it and the label under that. The host shrinks to the ring
rather than filling the row, which is the one layout difference between the two shapes.

```html
<arena-progress-bar [progressPercentage]="uploaded()" label="Uploading build 482" />
<arena-progress-bar indeterminate label="Waiting for the build agent" tone="gold" />
<arena-progress-bar shape="radial" size="lg" [progressPercentage]="done()" label="Sprint 32" />

<arena-progress-bar shape="radial" size="lg" [showPercentage]="false"
                    [progressPercentage]="lesson()" label="Unit 3, lesson 4">
  <arena-icon-button icon="ph-fill ph-star" label="Start lesson 4" />
</arena-progress-bar>
```

A ring's middle is projected content, so it can measure something of yours instead of showing
a number. Turn the figure off yourself when you fill it: the two share that space, and this
component decides nothing from what was projected, because the other layer cannot see it either.

<!-- @api GENERATED from contracts/api/components/ArenaProgressBar.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `content` | slot |  |  | What sits in the middle of a ring, in place of the percentage: a glyph, a mark, or the control the ring measures. A bar has no middle, so a bar draws nothing for it. The ring's own `progressbar` element is the drawing rather than the box around it, because that role's children are presentational and a control projected inside it would be drawn and never announced; here it is a sibling of the meter and keeps everything it came with. |
| `progressPercentage` | primitive | `number` | `0` | How far along, 0-100. Clamped and rounded. Ignored when `indeterminate`. |
| `indeterminate` | primitive | `boolean` | `false` | A wait with no percentage; the bar sweeps instead of filling. |
| `tone` | enum | `ArenaProgressTone` | `"accent"` | The bar's colour. |
| `label*` | primitive | `string` |  | Names what is progressing. Drawn above the bar or under the ring, and it is the meter's accessible name. Required and guarded rather than defaulted: nothing can derive what is progressing, and a fallback of "Progress" satisfies roles.label mechanically while telling a screen-reader user only what the component is -- two of them on one page announce identically. |
| `showLabel` | primitive | `boolean` | `true` | Draws the label beside the meter. False leaves the meter alone and keeps the accessible name, which is carried by aria-label on the progressbar element rather than by the text. For a bar in a table cell or a card row, where the row already names what is progressing and repeating it is noise. `label` stays required either way, on the reading it already carries: what a screen reader announces is not a decision about what is drawn. It is the same escape ArenaIconButton.showLabel offers, and it is here because the two components pose one question. |
| `showPercentage` | primitive | `boolean` | `true` | Shows the percentage: beside the label on a bar, and in the middle of a ring, which is the figure a meter in a tile is read by. Determinate only. Turn it off when `content` fills a ring's middle: the two share that space, and Arena never derives what it draws from what a consumer projected, because projected content is not inspectable in at least one layer. |
| `size` | enum | `ArenaControlSize` | `"md"` | How heavy the meter is: the bar's thickness, and a ring's diameter with a band the same weight as the bar it replaces. |
| `shape` | enum | `ArenaProgressShape` | `"linear"` | Whether the meter is drawn as a bar or as a ring. A ring puts the percentage inside its own track and the label under it, which is the arrangement a tile wants and the one a row cannot give: a bar is as wide as its row and reads along it, while a ring is as wide as it is tall and reads at a glance. It is a shape rather than a second component because everything else is the same question answered once: the percentage, the tone, the required name, the announcement and the sweep a wait draws. |

<!-- @api end -->

`progressPercentage` is **clamped to 0–100 and rounded**, so a caller cannot report 143% or a
fraction; the same number drives `aria-valuenow` and the fill's width, which is the point,
what a sighted user sees and what a screen reader is told cannot drift apart.

**`indeterminate` is a different claim, not a styling flag.** It drops `aria-valuenow`
altogether, because ARIA expresses indeterminacy by *omitting* the value rather than by
reporting zero: zero is a determinate claim that no progress has been made. `aria-valuemin` and
`aria-valuemax` stay, because they are still true. It also hides the percentage whatever
`showPercentage` says: there is no percentage to show.

**The live region is explicit, and it has content to announce.** `role="progressbar"` carries no
implicit politeness the way `role="status"` does, so the track sets `aria-live="polite"` itself.
A live region reports changes to its **content**, so the percentage is repeated inside the track
as visually-hidden text: reporting progress through the `aria-valuenow` attribute alone leaves a
polite region whose content never changes, and whether an AT announces that at all varies by AT.
`showPercentage` governs the visible number beside the label and never this copy.

`label` names the bar for assistive technology and heads it visually. With none, the accessible
name falls back to `Progress`, which is honest but says nothing about what is progressing,
supply one for anything a user is waiting on.

**Do / Don't**
- **Do** reach for `indeterminate` the moment the percentage stops being knowable. A bar frozen
  at 90% is worse than one that says it is still working.
- **Do** use `tone` for what the progress *means*: `danger` for a failing rollout, `success`
  for one that finished. The track stays the neutral rail in every tone; only the fill is inked,
  because danger is outline in Arena and a progress bar is not the exception.
- **Do** put a ring where the meter is the tile rather than a line in one: a completion ring on
  a dashboard, a node on a path. `size` moves its diameter and its band together, so there is
  nothing else to tune.
- **Don't** use this for a wait with no measurable end and no room for a label. That is
  `arena-spinner`. An indeterminate ring turns, which is close to what a spinner does, and the
  difference is that this one is still a labelled meter and reports a range.
- **Don't** project into a bar: a bar has no middle and the projection is dropped.
- **Don't** reach for a ring to save room. A ring at `sm` is smaller than a bar is long and
  harder to read, and the figure inside it is the point.
- **Don't** put two bars in one row expecting them to read as one process. They are two live
  regions, and a screen reader will announce both.

**By hand, in real Chromium**: the sweep is an animation and happy-dom has none. Run
`bun run demos` and open
`/frameworks/angular/components/feedback/arena-progress-bar/ArenaProgressBar.demo.generated.html`:
- The indeterminate sweep travels left to right, continuously, and **slows** rather than stops
  under `prefers-reduced-motion`, motion that reports work in progress must keep reporting it.
- The determinate fill animates its width on `--dur-state`/`--ease-state` when the value changes,
  and does not
  animate on first paint.
- Each tone inks the fill only; the track behind it stays `--color-base-300` in all five.
- The three sizes differ in track height alone; the head row does not move with them.
- With `shape="radial"` the arc sweeps clockwise from twelve o'clock, its band is the weight of
  the bar it replaces, and an indeterminate ring turns a fixed quarter arc, slowing rather than
  stopping under `prefers-reduced-motion` for the reason the sweep gives.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
