<!-- GENERATED from the contracts by bun run generate:skills. Edit the contracts, not this file. -->

# Arena charts components, the React layer

Every charts component this layer ships, under the names it binds them to. **This page is an
index, not a manual.** How to write one is its own prompt, linked in the last column.

**The rules every component below answers to are stated in
[`../../../../SKILL.md`](../../../../SKILL.md) before any component here**, and nothing on this
page restates them.

Import from the package root, never from a path inside it:

```tsx
import { ArenaButton, ArenaTag } from '@dravensoft/arena-react';
```

A member is a prop. The main slot is `children`, a named slot is a prop taking a node, and an
event is an `on`-prefixed handler. An icon is a Phosphor class-name string, never an element.

- Every other category this layer ships: [`../../SKILL.md`](../../SKILL.md).
- Installing the package, declaring your skin, and what it exports besides components:
  [`../../PACKAGE.md`](../../PACKAGE.md).
- **Takes** is the members the component's API contract declares, in contract order, under this
  layer's own names. A member marked `*` is required; the prompt gives its type and its default.
- **A member whose type is an object or an enum takes one this package exports.** The prompt
  names the type and says what it is for; the fields it holds are in the type declaration itself,
  which `import type { … } from '@dravensoft/arena-react'` brings in. That field list is in neither
  the prompt nor the contract, so the type is where you read it.

| Component | What it is | Takes | Usage |
|---|---|---|---|
| `ArenaBarChart` | Categorical bars on one axis. Dependency-free SVG that reads the token layer directly, with a visually-hidden table of the same numbers. | `labels*` `series*` `label*` `stack` `valueSuffix` `valuePrefix` `valueFormat` `height` `minPointSpacing` | [`ArenaBarChart.prompt.md`](./arena-bar-chart/ArenaBarChart.prompt.md) |
| `ArenaChartCard` | A titled card frame around a chart, with an optional actions slot in its head. | `title` `actions` `children` | [`ArenaChartCard.prompt.md`](./arena-chart-card/ArenaChartCard.prompt.md) |
| `ArenaDoughnutChart` | Parts of one whole, as a ring with a legend beside it. Identity only: a slice is a category by definition, so there is no tone. Dependency-free SVG with a visually-hidden table of the same numbers. | `labels*` `series*` `label*` `valueSuffix` `valuePrefix` `shape` `legendLayout` `onSliceActivate` `valueFormat` | [`ArenaDoughnutChart.prompt.md`](./arena-doughnut-chart/ArenaDoughnutChart.prompt.md) |
| `ArenaHorizontalBarChart` | Categorical bars running across the plot, with the categories down its left edge. The same data and the same table as ArenaBarChart with the axes transposed, which is a different component rather than an orientation flag because transposing changes what four of its members mean: the cursor answers the vertical arrows, the category gutter is its own token, height becomes the axis the data grows along, and there is no scrolling rail. | `labels*` `series*` `label*` `stack` `valueSuffix` `valuePrefix` `valueFormat` `height` | [`ArenaHorizontalBarChart.prompt.md`](./arena-horizontal-bar-chart/ArenaHorizontalBarChart.prompt.md) |
| `ArenaLineChart` | One series over an ordered sequence, on one axis. Dependency-free SVG with a crosshair that snaps to the nearest point, and a visually-hidden table of the same numbers. | `labels*` `series*` `label*` `area` `curve` `valueSuffix` `valuePrefix` `valueFormat` `height` `minPointSpacing` | [`ArenaLineChart.prompt.md`](./arena-line-chart/ArenaLineChart.prompt.md) |
| `ArenaPyramidChart` | A population pyramid: two counts per band, mirrored about a shared centre line, with the band names down the left edge. Diverging from a centre is the whole point rather than an option, which is why the two-series rule and the mirrored axis are the component instead of a flag on a bar chart. Dependency-free SVG with a visually-hidden table of the same numbers. | `labels*` `series*` `label*` `valueSuffix` `valuePrefix` `valueFormat` `height` | [`ArenaPyramidChart.prompt.md`](./arena-pyramid-chart/ArenaPyramidChart.prompt.md) |
| `ArenaRadarChart` | Several measures on one shape: an axis per label around a polar grid, one closed polygon per series. Reads a profile rather than a magnitude, which is what makes it a different chart from bars over the same numbers. Dependency-free SVG with a visually-hidden table of the same numbers. | `labels*` `series*` `label*` `fill` `valueSuffix` `valuePrefix` `valueFormat` `height` | [`ArenaRadarChart.prompt.md`](./arena-radar-chart/ArenaRadarChart.prompt.md) |
| `ArenaScatterChart` | Two quantities against each other, one mark per pair, and a third as the mark's size when a series carries one. The first chart here whose horizontal axis carries a value rather than a position, which is why it takes a series of parallel measurements and names every axis it draws. Dependency-free SVG with a visually-hidden table of the same numbers. | `series*` `label*` `xLabel*` `yLabel*` `sizeLabel` `sizeLegend` `valueSuffix` `valuePrefix` `valueFormat` `height` | [`ArenaScatterChart.prompt.md`](./arena-scatter-chart/ArenaScatterChart.prompt.md) |

8 charts components in this layer.
