# Colouring the `marks` group

Read this when your style plugin answers a slot of the `marks` group. [`color-slots.md`](../color-slots.md) holds the routes, the rules and what a silent slot paints.

Home of `ArenaAvatar`, `ArenaBadge`, `ArenaTag`. Also read by `ArenaActivityFeed.dot`, `ArenaBoard.title`, `ArenaCombobox.more`, `ArenaStatCard.value`, `ArenaStatCard.delta`, `ArenaTimeline.dot`, `ArenaToast.pinned`.

| part | option | answers | states | silent at rest | silent when selected |
| --- | --- | --- | --- | --- | --- |
| `soft` | `plain` | fill, ink | rest | fill `{accent-plain-fill-soft}`, ink `{ink-body}` at `level-ink-body` |  |
| `soft` | `primary` | fill, ink | rest | fill `{accent-primary-fill-soft}` at `level-accent-soft-primary`, ink `{ink-body}` at `level-ink-body` |  |
| `soft` | `gold` | fill, ink | rest | fill `{accent-gold-fill-soft}` at `level-accent-soft-gold`, ink `{ink-body}` at `level-ink-body` |  |
| `soft` | `danger` | fill, ink | rest | fill `{hue-danger-fill-soft}` at `level-hue-soft-danger`, ink `{ink-body}` at `level-ink-body` |  |
| `soft` | `success` | fill, ink | rest | fill `{hue-success-fill-soft}` at `level-hue-soft-success`, ink `{ink-body}` at `level-ink-body` |  |
| `soft` | `warning` | fill, ink | rest | fill `{hue-warning-fill-soft}` at `level-hue-soft-warning`, ink `{ink-body}` at `level-ink-body` |  |
| `soft` | `info` | fill, ink | rest | fill `{hue-info-fill-soft}` at `level-hue-soft-info`, ink `{ink-body}` at `level-ink-body` |  |
| `solid` | `neutral` | none | rest | Arena paints it, and no slot answers it |  |
| `solid` | `danger` | none | rest | Arena paints it, and no slot answers it |  |
| `solid` | `success` | none | rest | Arena paints it, and no slot answers it |  |
| `solid` | `warning` | none | rest | Arena paints it, and no slot answers it |  |
| `solid` | `info` | none | rest | Arena paints it, and no slot answers it |  |
| `outline` | `neutral` | ink, edge | rest | ink `{ink-muted}` at `level-ink-muted`, edge `{edge-marker}` |  |
| `outline` | `plain` | ink, edge | rest | ink `{accent-plain-quiet-ink}` at `level-ink-quiet`, edge `{accent-plain-edge}` |  |
| `outline` | `primary` | ink, edge | rest | ink `{accent-primary-ink}`, edge `{accent-primary-edge}` |  |
| `outline` | `danger` | ink, edge | rest | ink `{hue-danger-ink}`, edge `{hue-danger-edge}` |  |
| `outline` | `success` | ink, edge | rest | ink `{hue-success-ink}`, edge `{hue-success-edge}` |  |
| `outline` | `warning` | ink, edge | rest | ink `{hue-warning-ink}`, edge `{hue-warning-edge}` |  |
| `dot` | `neutral` | ink | rest | ink `{ink-body}` at `level-ink-body` |  |
| `dot` | `muted` | ink | rest | ink `{ink-muted}` at `level-presence` |  |
| `dot` | `primary` | ink | rest | ink `{accent-primary-ink}` |  |
| `dot` | `gold` | ink | rest | ink `{accent-gold-ink}` |  |
| `dot` | `danger` | ink | rest | ink `{hue-danger-ink}` |  |
| `dot` | `success` | ink | rest | ink `{hue-success-ink}` |  |
| `dot` | `warning` | ink | rest | ink `{hue-warning-ink}` |  |
| `dot` | `info` | ink | rest | ink `{hue-info-ink}` |  |
| `dot` | `neutral-complete` | fill, ink, edge | rest | fill `{fill-mark}`, ink `{ink-on-mark}`, edge `transparent` |  |
| `dot` | `neutral-current` | fill, ink, edge | rest | fill `{fill-surface}`, ink `{ink-body}` at `level-ink-body`, edge `{edge-mark}` |  |
| `dot` | `neutral-upcoming` | fill, ink, edge | rest | fill `{fill-surface}`, ink `{ink-muted}` at `level-ink-muted`, edge `{edge-mark}` at `level-presence` |  |
| `dot` | `danger-complete` | fill, ink, edge | rest | fill `{fill-surface}`, ink `{hue-danger-ink}`, edge `{hue-danger-edge}` |  |
| `dot` | `danger-current` | fill, ink, edge | rest | fill `{fill-surface}`, ink `{hue-danger-ink}`, edge `{hue-danger-edge}` |  |
| `dot` | `danger-upcoming` | fill, ink, edge | rest | fill `{fill-surface}`, ink `{hue-danger-ink}`, edge `{hue-danger-edge}` |  |
| `dot` | `success-complete` | fill, ink, edge | rest | fill `{hue-success-fill-strong}`, ink `{hue-success-on-ink}`, edge `transparent` |  |
| `dot` | `success-current` | fill, ink, edge | rest | fill `{fill-surface}`, ink `{hue-success-ink}`, edge `{hue-success-edge}` |  |
| `dot` | `success-upcoming` | fill, ink, edge | rest | fill `{fill-surface}`, ink `{hue-success-ink}`, edge `{hue-success-edge}` |  |
| `dot` | `warning-complete` | fill, ink, edge | rest | fill `{hue-warning-fill-strong}`, ink `{hue-warning-on-ink}`, edge `transparent` |  |
| `dot` | `warning-current` | fill, ink, edge | rest | fill `{fill-surface}`, ink `{hue-warning-ink}`, edge `{hue-warning-edge}` |  |
| `dot` | `warning-upcoming` | fill, ink, edge | rest | fill `{fill-surface}`, ink `{hue-warning-ink}`, edge `{hue-warning-edge}` |  |
| `dot` | `info-complete` | fill, ink, edge | rest | fill `{hue-info-fill-strong}`, ink `{hue-info-on-ink}`, edge `transparent` |  |
| `dot` | `info-current` | fill, ink, edge | rest | fill `{fill-surface}`, ink `{hue-info-ink}`, edge `{hue-info-edge}` |  |
| `dot` | `info-upcoming` | fill, ink, edge | rest | fill `{fill-surface}`, ink `{hue-info-ink}`, edge `{hue-info-edge}` |  |
| `tile` |  | fill, ink, edge | rest | fill `{fill-tile}`, ink `{ink-body}` at `level-ink-body`, edge `{edge-marker}` |  |
| `label` | `neutral` | ink | rest | ink `{ink-heading}` |  |
| `label` | `plain` | ink | rest | ink `{accent-plain-ink}` |  |
| `label` | `primary` | ink | rest | ink `{accent-primary-ink}` |  |
| `label` | `gold` | ink | rest | ink `{accent-gold-ink}` |  |
| `label` | `danger` | ink | rest | ink `{hue-danger-ink}` |  |
| `label` | `success` | ink | rest | ink `{hue-success-ink}` |  |
| `label` | `warning` | ink | rest | ink `{hue-warning-ink}` |  |
| `label` | `info` | ink | rest | ink `{hue-info-ink}` |  |
