The card a chart sits on: an uppercase muted microlabel, optional actions on the right, and the chart itself. Arena's charts are hand-written SVG with no dependency, they read the ramp tokens directly, so they re-theme with the page and need no configuration to do it.

```tsx
<ArenaChartCard title="Deploys per day">
  <ArenaBarChart label="Deploys per day" labels={['Mon','Tue','Wed','Thu','Fri']}
    series={[{ label: 'Deploys', values: [12,19,9,22,17] }]} />
</ArenaChartCard>

<ArenaChartCard title="p95 latency" actions={<ArenaSelect options={ranges} value={range} onChange={setRange} />}>
  <ArenaLineChart label="p95 latency" labels={days}
    series={[{ label: 'p95', values: latency, slot: 5 }]} area valueSuffix=" ms" />
</ArenaChartCard>
```

<!-- @api GENERATED from contracts/api/components/ArenaChartCard.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `title` | primitive | `string` |  | The card heading. Absent renders no head unless `actions` is present. |
| `headingLevel` | enum | `ArenaHeadingLevel` | `"none"` | Which rung of the document outline the title takes. Only the element changes: the title's class is the same at every value, so the render is identical and no appearance follows from it, the micro register this title is drawn in included. It is the one title on the ladder that defaults to `none`, because the ordinary chart card is a tile in a dashboard grid and a dozen tiles each opening a rung invents an outline where a page has one region; the chart inside carries its own accessible name, so nothing goes unnamed. A tile that genuinely IS a region of the page says which rung it takes, and `h3` is the card rung a chart card inside a section would want. |
| `actions` | slot |  |  | Controls in the head row, right-aligned beside the title. |
| `children` | slot |  |  | The chart (or any body) the card frames. |

<!-- @api end -->

**Do**
- Let `title` and the chart's own `label` say the same thing when the card holds one chart. They are not redundant: `title` is what a sighted reader sees on the tile, `label` is what a screen reader hears and what captions the numbers table, and neither is derivable from the other.
- Keep `title` to a short uppercase microlabel, like every other label in Arena (H2/H6/H8).
- Put the range picker or the export button in `actions`, not above the card.
- Pass several controls as siblings, in a fragment. The head row and the actions row both
  wrap, and they wrap their own children: a `<div>` of your own holding three buttons is one
  flex item that can never wrap, and overflows the tile at 390px.

**Don't**
- Don't pass a heading into `title` expecting an element: it renders a label on purpose, because a dashboard is a grid of tiles and not a document outline. A tile that genuinely is a region of the page asks for its rung with `headingLevel`, and `h3` is the one a chart card inside a section takes.
- Don't nest an `ArenaChartCard` inside an `ArenaCard`. It *is* the card surface; nesting doubles the border and the padding.

The card's own inner padding is not something a chart inside it needs to know. A chart that
overflows scrolls in its own rail rather than in the card's box, so `minPointSpacing` needs no
cooperation from here, and there is no member for the padding because nothing outside has to
reproduce it.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
