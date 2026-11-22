# Colouring the `menus` group

Read this when your style plugin answers a slot of the `menus` group. [`color-slots.md`](../color-slots.md) holds the routes, the rules and what a silent slot paints.

Home of `ArenaCommandPalette`, `ArenaMenu`. Also read by `ArenaCombobox.option`.

| part | option | answers | states | silent at rest | silent when selected |
| --- | --- | --- | --- | --- | --- |
| `item` | `plain` | fill, ink, icon | rest, hover, pressed, selected, disabled, selected-disabled | fill `transparent`, ink `{ink-body}` at `level-ink-body` | fill `{fill-selected}` at `level-accent-soft-primary`, ink `{ink-selected}` |
| `item` | `destructive` | fill, ink, icon | rest, hover, pressed, disabled | fill `transparent`, ink `{hue-danger-ink}` |  |

Under the pointer, `menus-destructive-item-fill-hover` reads `{fill-hover}`, `menus-plain-item-fill-hover` reads `{fill-hover}`.
