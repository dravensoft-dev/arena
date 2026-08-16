Arena chart tile, the card a chart sits on, with a mono microlabel and an optional
action slot. Its title is a label and not a heading by default: a dashboard is a grid of
tiles, and a dozen tiles each opening a rung invents a document outline where the page
holds one region. The chart inside carries the accessible name through its own
`role="img"`, so nothing goes unnamed by it. A tile that genuinely is a region of the page
says so with `headingLevel`, and `h3` is the rung a chart card inside a section takes.

```html
<arena-chart-card title="Deployments per week">
  <arena-icon-button actions icon="ph-bold ph-download-simple" label="Export" />
  <arena-bar-chart label="Deployments per week" [labels]="weeks()" [series]="deployments()" />
</arena-chart-card>
```

<!-- @api GENERATED from contracts/api/components/ArenaChartCard.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `title` | primitive | `string` |  | The card heading. Absent renders no head unless `actions` is present. |
| `headingLevel` | enum | `ArenaHeadingLevel` | `"none"` | Which rung of the document outline the title takes. Only the element changes: the title's class is the same at every value, so the render is identical and no appearance follows from it, the micro register this title is drawn in included. It is the one title on the ladder that defaults to `none`, because the ordinary chart card is a tile in a dashboard grid and a dozen tiles each opening a rung invents an outline where a page has one region; the chart inside carries its own accessible name, so nothing goes unnamed. A tile that genuinely IS a region of the page says which rung it takes, and `h3` is the card rung a chart card inside a section would want. |
| `actions` | slot |  |  | Controls in the head row, right-aligned beside the title. |
| `content` | slot |  |  | The chart (or any body) the card frames. |

<!-- @api end -->

Import `ArenaActions` from `@dravensoft/arena-angular` alongside `ArenaChartCard` in the
host component's `imports`,
`actions` is a directive, not a plain attribute, because it is how the card
detects that actions were projected at all. Without it the attribute is inert, the
head row never renders when there is no title, and the button silently disappears.
`ArenaActions` is shared: every primitive with a plural, toolbar-shaped projected slot
imports the same directive rather than declaring its own, `arena-page-head` is the
other consumer.

The head row (title plus actions) renders only when one of them is actually present.
With neither, no empty row ships dead space above the chart.

**Do / Don't**
- Mark **each** control with `actions`, as siblings. The head row and the actions row both
  wrap their own children, so a single wrapper holding three buttons is one flex item that
  can never wrap and overflows the tile on a phone. `arena-page-head` says the same thing
  about the same slot.
- Keep the title short and in the tile's own words. It is a label, not a sentence.
- Let `title` and the chart's own `label` say the same thing when the card holds one chart.
  They are not redundant: `title` is what a sighted reader sees on the tile, `label` is what
  a screen reader hears and what captions the numbers table, and neither is derivable from
  the other.
- Don't put two charts in one card. A card is one question answered once.
- Don't reach for this as a general card: that is `mat-card` wearing Arena.

The card's own inner padding is not something a chart inside it needs to know. A chart that
overflows scrolls in its own rail rather than in the card's box, so `minPointSpacing` needs no
cooperation from here, and there is no member for the padding because nothing outside has to
reproduce it.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
