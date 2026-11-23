# Colouring the `feedback` group

Read this when your style plugin answers a slot of the `feedback` group. [`index.md`](./index.md) holds the routes, the rules and what a silent slot paints.

Home of `ArenaAlert`, `ArenaEmptyState`, `ArenaErrorState`, `ArenaToast`.

| part | option | answers | states | silent at rest | silent when selected |
| --- | --- | --- | --- | --- | --- |
| `banner` | `neutral` | fill, edge | rest | fill `{fill-surface}`, edge `{edge-surface-floating}` |  |
| `banner` | `plain` | edge | rest | edge `{accent-plain-side-edge}` |  |
| `banner` | `gold` | edge | rest | edge `{accent-gold-side-edge}` |  |
| `banner` | `danger` | fill, edge | rest | fill `{hue-danger-fill-soft}` at `level-hue-soft-danger`, edge `{hue-danger-edge}` |  |
| `banner` | `success` | fill, edge | rest | fill `{hue-success-fill-soft}` at `level-hue-soft-success`, edge `{hue-success-edge}` |  |
| `banner` | `warning` | fill, edge | rest | fill `{hue-warning-fill-soft}` at `level-hue-soft-warning`, edge `{hue-warning-edge}` |  |
| `banner` | `info` | fill, edge | rest | fill `{hue-info-fill-soft}` at `level-hue-soft-info`, edge `{hue-info-edge}` |  |
| `icon` | `neutral` | ink | rest | ink `{ink-muted}` at `level-ink-muted` |  |
| `icon` | `danger` | ink | rest | ink `{hue-danger-ink}` |  |
| `icon` | `success` | ink | rest | ink `{hue-success-ink}` |  |
| `icon` | `warning` | ink | rest | ink `{hue-warning-ink}` |  |
| `icon` | `info` | ink | rest | ink `{hue-info-ink}` |  |
| `action` | `neutral` | fill, ink | rest | fill `transparent`, ink `{ink-action}` at `level-ink-full` |  |
| `action` | `danger` | fill, ink | rest | fill `transparent`, ink `{ink-action}` at `level-ink-full` |  |
| `action` | `success` | fill, ink | rest | fill `transparent`, ink `{ink-action}` at `level-ink-full` |  |
| `action` | `warning` | fill, ink | rest | fill `transparent`, ink `{ink-action}` at `level-ink-full` |  |
| `action` | `info` | fill, ink | rest | fill `transparent`, ink `{ink-action}` at `level-ink-full` |  |
