# Colouring the `surfaces` group

Read this when your style plugin answers a slot of the `surfaces` group. [`index.md`](./index.md) holds the routes, the rules and what a silent slot paints.

Home of `ArenaBoard`, `ArenaCard`, `ArenaDivider`, `ArenaFigure`, `ArenaPaletteScope`, `ArenaSiteFooter`, `ArenaSkeleton`. Also read by `ArenaAccordion.item`, `ArenaActivityFeed.item`, `ArenaAppBar.root`, `ArenaBottomNav.root`, `ArenaBulkActionBar.divider`, `ArenaCalendar.headStrip`, `ArenaCalendar.rule`, `ArenaCalendar.column`, `ArenaChartCard.root`, `ArenaChartCard.head`, `ArenaErrorState.code`, `ArenaKeyValue.total`, `ArenaMenu.divider`, `ArenaSheet.head`, `ArenaSheet.foot`, `ArenaSideNav.separator`, `ArenaStatCard.root`, `ArenaStepper.connector`, `ArenaTable.root`, `ArenaTable.pager`. Also read by `ArenaTable.card`, `ArenaTable.cardBlock`, `ArenaTabs.root`, `ArenaTimeline.connector`.

| part | option | answers | states | silent at rest | silent when selected |
| --- | --- | --- | --- | --- | --- |
| `card` | `plain` | fill, edge | rest, hover | fill `{fill-surface}`, edge `{edge-surface}` |  |
| `card` | `primary` | fill, edge | rest, hover | fill `{fill-surface}`, edge `{accent-primary-edge}` |  |
| `sunken` | `plain` | fill, ink | rest | fill `{fill-surface-sunken}`, ink `{ink-muted}` at `level-ink-muted` |  |
| `sunken` | `media` | fill, ink, edge | rest | fill `{fill-surface-sunken}`, ink `{ink-eyebrow}`, edge `{edge-surface}` |  |
| `bar` | `page` | fill, edge | rest | fill `{fill-surface}`, edge `{edge-surface}` |  |
| `bar` | `floating` | fill, edge | rest | fill `{fill-surface-floating}`, edge `{edge-surface-floating}` |  |
| `separator` |  | edge | rest | edge `{edge-separator}` |  |
| `page` |  | fill, ink | rest | fill `{fill-page}`, ink `{ink-body}` |  |
| `media` |  | fill, ink | rest | fill `{overlay-media}` at `level-media`, ink `{ink-heading}` |  |
| `skeleton` |  | none | rest | Arena paints it, and no slot answers it |  |

Under the pointer, `surfaces-plain-card-fill-hover` reads `{fill-hover}`, `surfaces-primary-card-fill-hover` reads `{fill-hover}`.
