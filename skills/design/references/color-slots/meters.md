# Colouring the `meters` group

Read this when your style plugin answers a slot of the `meters` group. [`index.md`](./index.md) holds the routes, the rules and what a silent slot paints.

Home of `ArenaMeter`, `ArenaProgressBar`, `ArenaSpinner`.

| part | option | answers | states | silent at rest | silent when selected |
| --- | --- | --- | --- | --- | --- |
| `track` | `primary` | fill, ink | rest | fill `{fill-track}`, ink `{accent-primary-ink}` |  |
| `track` | `gold` | fill, ink | rest | fill `{fill-track}`, ink `{accent-gold-ink}` |  |
| `track` | `muted` | ink | rest | ink `{accent-muted-ink}` at `level-ink-muted` |  |
| `track` | `danger` | fill, ink | rest | fill `{fill-track}`, ink `{hue-danger-ink}` |  |
| `track` | `success` | fill, ink | rest | fill `{fill-track}`, ink `{hue-success-ink}` |  |
| `track` | `warning` | fill, ink | rest | fill `{fill-track}`, ink `{hue-warning-ink}` |  |
| `track` | `info` | fill, ink | rest | fill `{fill-track}`, ink `{hue-info-ink}` |  |
| `standing` | `neutral` | ink | rest | ink `{ink-muted}` at `level-ink-muted` |  |
| `standing` | `danger` | ink | rest | ink `{hue-danger-ink}` |  |
| `standing` | `success` | ink | rest | ink `{hue-success-ink}` |  |
| `standing` | `warning` | ink | rest | ink `{hue-warning-ink}` |  |
