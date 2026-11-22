# Colouring the `fields` group

Read this when your style plugin answers a slot of the `fields` group. [`color-slots.md`](../color-slots.md) holds the routes, the rules and what a silent slot paints.

Home of `ArenaCombobox`, `ArenaFieldset`, `ArenaFileInput`, `ArenaInput`, `ArenaNumberField`, `ArenaPinInput`, `ArenaSelect`, `ArenaTextarea`. Also read by `ArenaCommandPalette.search`, `ArenaCommandPalette.input`, `ArenaConfirmDialog.input`.

| part | option | answers | states | silent at rest | silent when selected |
| --- | --- | --- | --- | --- | --- |
| `field` | `neutral` | fill, edge | rest, hover, disabled | fill `{fill-field}`, edge `{edge-field}` |  |
| `field` | `error` | fill, edge | rest, hover, disabled | fill `{fill-field}`, edge `{edge-invalid}` |  |
| `field` | `valid` | fill, edge | rest, hover, disabled | fill `{fill-field}`, edge `{hue-success-edge}` |  |
| `field` | `readonly` | fill | rest, disabled | fill `{fill-surface}` |  |
| `value` |  | fill, ink | rest | fill `transparent`, ink `{ink-body}` |  |
| `required` |  | ink | rest | ink `{accent-primary-ink}` |  |
| `status` | `error` | ink | rest | ink `{ink-invalid}` |  |
| `status` | `valid` | ink | rest | ink `{hue-success-ink}` |  |
| `error` |  | ink | rest | ink `{ink-invalid}` |  |
| `counter` | `neutral` | ink | rest | ink `{ink-muted}` at `level-ink-muted` |  |
| `counter` | `warning` | ink | rest | ink `{hue-warning-ink}` |  |
| `stepper` |  | fill, ink, edge | rest, hover, pressed, disabled | fill `transparent`, ink `{ink-muted}` at `level-ink-muted`, edge `{edge-control}` |  |

Under the pointer, `fields-error-field-fill-hover` reads `{fill-hover}`, `fields-neutral-field-fill-hover` reads `{fill-hover}`, `fields-stepper-fill-hover` reads `{fill-hover}`, `fields-stepper-ink-hover` reads `{ink-body}` at `level-ink-body`, `fields-valid-field-fill-hover` reads `{fill-hover}`.
