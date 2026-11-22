# Colouring the `data` group

Read this when your style plugin answers a slot of the `data` group. [`color-slots.md`](../color-slots.md) holds the routes, the rules and what a silent slot paints.

Home of `ArenaActivityFeed`, `ArenaCalendar`, `ArenaKeyValue`, `ArenaPeopleList`, `ArenaStatCard`, `ArenaTable`, `ArenaTimeline`.

| part | option | answers | states | silent at rest | silent when selected |
| --- | --- | --- | --- | --- | --- |
| `row` |  | fill, edge | rest, hover | fill `transparent`, edge `{edge-separator}` |  |
| `header` |  | fill, ink, edge | rest, hover | fill `{fill-track}`, ink `{ink-muted}` at `level-ink-muted`, edge `{edge-separator}` |  |
| `today` |  | ink | rest | ink `{accent-primary-ink}` |  |
| `now` |  | fill, edge | rest | fill `{emphasis-primary-fill}`, edge `{emphasis-primary-edge}` |  |
| `current` |  | fill | selected |  | fill `{fill-surface-sunken}` |

Under the pointer, `data-header-edge-hover` reads `{edge-separator}`, `data-header-fill-hover` reads `{fill-track}`, `data-header-ink-hover` reads `{ink-body}` at `level-ink-full`, `data-row-fill-hover` reads `{fill-hover}`.
