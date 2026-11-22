# Colouring the `steps` group

Read this when your style plugin answers a slot of the `steps` group. [`color-slots.md`](../color-slots.md) holds the routes, the rules and what a silent slot paints.

Home of `ArenaStepper`. Also read by `ArenaOnboarding.dot`.

| part | option | answers | states | silent at rest | silent when selected |
| --- | --- | --- | --- | --- | --- |
| `marker` | `complete` | fill, ink, edge | rest | fill `transparent`, ink `{ink-body}` at `level-ink-body`, edge `{edge-control-quiet}` |  |
| `marker` | `current` | fill, ink, edge | rest | fill `{emphasis-primary-fill}`, ink `{emphasis-primary-ink}`, edge `{emphasis-primary-edge}` |  |
| `marker` | `upcoming` | fill, ink, edge | rest | fill `transparent`, ink `{ink-muted}` at `level-ink-muted`, edge `{edge-control}` |  |
| `marker` | `error` | fill, ink, edge | rest | fill `transparent`, ink `{hue-danger-ink}`, edge `{hue-danger-edge}` |  |
| `label` | `complete` | ink | rest | ink `{ink-body}` at `level-ink-body` |  |
| `label` | `current` | ink | rest | ink `{ink-heading}` |  |
| `label` | `upcoming` | ink | rest | ink `{ink-muted}` at `level-ink-muted` |  |
