# Colouring the `overlays` group

Read this when your style plugin answers a slot of the `overlays` group. [`color-slots.md`](../color-slots.md) holds the routes, the rules and what a silent slot paints.

Home of `ArenaBulkActionBar`, `ArenaConfirmDialog`, `ArenaDialog`, `ArenaOnboarding`, `ArenaPopover`, `ArenaSheet`, `ArenaTooltip`. Also read by `ArenaBarChart.tooltip`, `ArenaCalendar.panel`, `ArenaCombobox.panel`, `ArenaCommandPalette.root`, `ArenaCommandPalette.panel`, `ArenaFunnelChart.tooltip`, `ArenaHeatmapChart.tooltip`, `ArenaHorizontalBarChart.tooltip`, `ArenaLineChart.tooltip`, `ArenaMenu.panel`, `ArenaPyramidChart.tooltip`, `ArenaRadarChart.tooltip`, `ArenaScatterChart.tooltip`, `ArenaSparkline.tooltip`.

| part | option | answers | states | silent at rest | silent when selected |
| --- | --- | --- | --- | --- | --- |
| `scrim` |  | fill | rest | fill `{overlay-scrim}` at `level-scrim` |  |
| `panel` |  | fill, ink, edge | rest | fill `{fill-surface-floating}`, ink `{ink-body}` at `level-ink-body`, edge `{edge-surface-floating}` |  |
| `section` |  | fill | rest | fill `{fill-surface-floating}` |  |
| `tip` |  | fill, ink | rest | fill `{fill-tip}`, ink `{ink-tip}` |  |
| `readout` |  | fill, edge | rest | fill `{fill-surface-raised}`, edge `{edge-surface-floating}` |  |
| `eyebrow` | `plain` | ink | rest | ink `{ink-eyebrow}` |  |
| `eyebrow` | `destructive` | ink | rest | ink `{hue-danger-ink}` |  |
