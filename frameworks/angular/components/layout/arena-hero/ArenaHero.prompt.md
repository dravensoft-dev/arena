Arena hero, the opening of a landing page. Standalone, `OnPush`, signal I/O. The host **is** the
hero, so `<arena-hero>` is the element you place. Its title takes the hero register, the top rung
of the title ladder and the only one above a page head.

```html
<arena-hero eyebrow="Single origin" title="Coffee that tells you where it grew"
  lede="Every lot is traceable to the farm, the altitude and the week it was picked.">
  <div actions>
    <arena-button variant="primary" size="lg" icon="ph-bold ph-storefront">Shop the lots</arena-button>
    <arena-button variant="ghost" size="lg" iconRight="ph-bold ph-arrow-right">How we buy</arena-button>
  </div>
  <arena-figure figure>
    <i fallback class="ph-bold ph-mountains" aria-hidden="true"></i>
  </arena-figure>
</arena-hero>
```

<!-- @api GENERATED from contracts/api/components/ArenaHero.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `title*` | primitive | `string` |  | The one line the page is built around. Required, and guarded at runtime after trimming: a hero is that line plus its setting, and a hero without it is a figure with buttons under it. The guard trims first because the value it exists to catch is a present and useless one, not an absent one, which the type already refuses. |
| `eyebrow` | primitive | `string` |  | A line above the title saying what kind of page this is. Same register as every other eyebrow in the system, so a style plugin that takes them out of the console's mono capitals takes this one with them. |
| `lede` | primitive | `string` |  | The paragraph under the title, held to a reading width rather than to the column's, because a line that runs the whole width of a hero loses its return sweep. Named lede and not description, since this is the sentence that carries the page and not a note about the heading. |
| `actions` | slot |  |  | What the page asks the reader to do, in a wrapping row under the lede. Arena draws the row; the consumer draws what sits in it, and one primary action beside one secondary is the shape this is sized for. |
| `figure` | slot |  |  | The picture, the mark or the shape beside the words, or behind them under the bleed layout. It is a slot rather than a source, so an ArenaFigure, an illustration or a single glyph all land the same way. |
| `layout` | enum | `ArenaHeroLayout` | `"split"` | How the words sit against the figure. Split puts them side by side and falls to one column when the room runs out, with no breakpoint deciding when; stacked keeps them in one column at every width, for a hero whose figure is a band rather than a partner; bleed lays the words on the figure, over the wash the media overlay role paints, which is the arrangement that needs that role to be readable. |
| `align` | enum | `ArenaHeroAlign` | `"start"` | Whether the words run from the start edge or are centred in their column. Centred is what a bleed hero usually wants and a split one usually does not, and it is a separate decision from the layout because a stacked hero can want either. |

<!-- @api end -->

**The two slots are attributes**, `actions` and `figure`, projected through the marker directives.
The actions slot takes one element, so wrap your buttons in a container of your own if there is
more than one.

**`split` falls to one column with no breakpoint deciding when.** The threshold is derived from
`--grid-min`, the role that already answers how narrow a card may get, so a style plugin that widens the
grid minimum widens when a hero splits: one decision about how dense a page is rather than two
that can disagree.

**`bleed` lays the words on the figure**, which is the arrangement that makes the media overlay
role load-bearing. Give the figure something that fills its box, and give the words
`align="center"` unless the picture has an empty corner they can sit in.

**It claims no `banner` landmark.** Banner is the site header, one per page, and a hero is content
inside the main region rather than the furniture around it. The `<h1>` is what a reader navigates
to.

**Do / Don't**
- **Do** keep the lede to a sentence or two. It is held to a reading width rather than the
  column's, because a line that runs the whole width of a hero loses its return sweep.
- **Do** put one primary action beside one secondary. The row is sized for that shape.
- **Don't** open a second `<h1>` on the page. The hero already opened it.
- **Don't** reach for `bleed` over a photograph with detail where the words go. The wash keeps
  text readable; it does not make a busy picture quiet.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/angular/components/layout/arena-hero/ArenaHero.demo.generated.html`:
- Narrow the window from wide: the split falls to one column at one step and never overflows.
- Under `bleed`, the words stay readable over the wash in both themes.
- Under `align="center"` the whole column centres, including the actions row.
- With a screen reader running, the title is announced as a level one and the hero announces no
  landmark of its own.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
