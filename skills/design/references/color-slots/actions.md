# Colouring the `actions` group

Read this when your style plugin answers a slot of the `actions` group. [`color-slots.md`](../color-slots.md) holds the routes, the rules and what a silent slot paints.

Home of `ArenaButton`, `ArenaCopyButton`, `ArenaIconButton`, `ArenaSplitButton`. Also read by `ArenaAlert.close`, `ArenaBulkActionBar.action`, `ArenaBulkActionBar.clear`, `ArenaCalendar.nav`, `ArenaCalendar.today`, `ArenaCombobox.clear`, `ArenaConfirmDialog.confirm`, `ArenaFileInput.trigger`, `ArenaFilterBar.clear`, `ArenaOnboarding.text`, `ArenaOnboarding.next`, `ArenaPagination.nav`, `ArenaSheet.close`, `ArenaSkipLink.root`, `ArenaTag.close`, `ArenaToast.close`.

| part | option | answers | states | silent at rest | silent when selected |
| --- | --- | --- | --- | --- | --- |
| `root` | `primary` | fill, ink, edge, icon | rest, hover, pressed, disabled | fill `{emphasis-primary-fill}`, ink `{emphasis-primary-ink}`, edge `{emphasis-primary-edge}` |  |
| `root` | `secondary` | fill, ink, edge, icon | rest, hover, pressed, disabled | fill `{emphasis-secondary-fill}`, ink `{emphasis-secondary-ink}`, edge `{emphasis-secondary-edge}` |  |
| `root` | `ghost` | fill, ink, edge, icon | rest, hover, pressed, selected, selected-hover, selected-pressed, disabled, selected-disabled | fill `transparent`, ink `{emphasis-ghost-ink}` at `level-ink-body`, edge `transparent` | fill `{fill-selected}` at `level-accent-soft-primary`, ink `{ink-selected}`, edge `{edge-selected}` |
| `root` | `solid` | fill, ink, edge, icon | rest, hover, pressed, selected, selected-hover, selected-pressed, disabled, selected-disabled | fill `{emphasis-solid-fill}`, ink `{emphasis-solid-ink}`, edge `transparent` | fill `{fill-selected}` at `level-accent-soft-primary`, ink `{ink-selected}`, edge `{edge-selected}` |
| `root` | `destructive` | fill, ink, edge, icon | rest, hover, pressed, disabled | fill `{hue-danger-fill-strong}`, ink `{hue-danger-ink}`, edge `{hue-danger-edge}` |  |
| `dismiss` |  | fill, ink, icon | rest, hover, pressed, disabled | fill `transparent`, ink `{ink-muted}` at `level-ink-muted` |  |

Under the pointer, `actions-destructive-root-fill-hover` reads `{fill-hover}`, `actions-dismiss-ink-hover` reads `{ink-body}` at `level-ink-body`, `actions-ghost-root-fill-hover` reads `{emphasis-ghost-fill-hover}`, `actions-secondary-root-fill-hover` reads `{emphasis-secondary-fill-hover}`.

While its slot is silent, `ArenaIconButton.root` paints `actions-ghost-root-edge-rest` with `{emphasis-ghost-icon-edge}`.
