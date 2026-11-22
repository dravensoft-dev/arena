# Colouring the `choices` group

Read this when your style plugin answers a slot of the `choices` group. [`index.md`](./index.md) holds the routes, the rules and what a silent slot paints.

Home of `ArenaCheckbox`, `ArenaRadio`, `ArenaSegmentedControl`, `ArenaSlider`, `ArenaSwitch`.

| part | option | answers | states | silent at rest | silent when selected |
| --- | --- | --- | --- | --- | --- |
| `box` |  | fill, edge | rest, selected, disabled, selected-disabled | fill `{fill-control}`, edge `{edge-control}` | fill `{fill-control-on}`, edge `transparent` |
| `mark` |  | ink | selected |  | ink `{emphasis-primary-ink}` |
| `knob` |  | fill, ink, edge | rest, selected | fill `{fill-knob-off}`, ink `{ink-knob-off}`, edge `{edge-control}` | fill `{fill-knob}`, ink `{ink-knob}`, edge `{edge-control}` |
| `segment` |  | fill, ink | rest, hover, pressed, selected, selected-hover, selected-pressed | fill `transparent`, ink `{ink-muted}` at `level-ink-muted` | fill `{fill-control}`, ink `{ink-body}` at `level-ink-body` |
| `track` |  | fill, edge | rest | fill `{fill-track}`, edge `{edge-control-quiet}` |  |

Under the pointer, `choices-segment-ink-hover` reads `{ink-body}` at `level-ink-body`.
