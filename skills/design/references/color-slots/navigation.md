# Colouring the `navigation` group

Read this when your style plugin answers a slot of the `navigation` group. [`index.md`](./index.md) holds the routes, the rules and what a silent slot paints.

Home of `ArenaAccordion`, `ArenaAppBar`, `ArenaBottomNav`, `ArenaBreadcrumbs`, `ArenaFilterBar`, `ArenaLink`, `ArenaPagination`, `ArenaSideNav`, `ArenaSkipLink`, `ArenaTabs`, `ArenaTreeView`. Also read by `ArenaSheet.trigger`, `ArenaStepper.trigger`, `ArenaTable.link`.

| part | option | answers | states | silent at rest | silent when selected |
| --- | --- | --- | --- | --- | --- |
| `item` |  | fill, ink, edge, icon | rest, hover, pressed, selected, selected-hover, selected-pressed, disabled, selected-disabled | fill `transparent`, ink `{ink-muted}` at `level-ink-muted`, edge `transparent` | fill `{fill-selected}` at `level-accent-soft-primary`, ink `{ink-selected}`, edge `{edge-tab-selected}` |
| `badge` |  | fill, ink | rest, selected | fill `{fill-marker}`, ink `{ink-body}` at `level-ink-body` | fill `{emphasis-primary-fill}`, ink `{emphasis-primary-ink}` |
| `link` | `quiet` | ink | rest, hover | ink `{ink-muted}` at `level-ink-muted` |  |
| `link` | `plain` | ink | rest, hover | ink `{ink-link}` at `level-ink-body` |  |
| `disclosure` |  | fill, ink | rest, hover, pressed, disabled | fill `transparent`, ink `{ink-body}` at `level-ink-body` |  |

Under the pointer, `navigation-disclosure-fill-hover` reads `{fill-hover}`, `navigation-item-fill-hover` reads `{fill-hover}`, `navigation-item-ink-hover` reads `{ink-body}` at `level-ink-body`, `navigation-plain-link-ink-hover` reads `{ink-heading}`, `navigation-quiet-link-ink-hover` reads `{ink-body}` at `level-ink-body`.
