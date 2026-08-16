The opening of a landing page: one line the page is built around, what sits above and below it,
the actions it asks for, and a figure beside or behind it. Its title takes the hero register, the
top rung of the title ladder and the only one above a page head.

```tsx
<ArenaHero
  eyebrow="Single origin"
  title="Coffee that tells you where it grew"
  lede="Every lot is traceable to the farm, the altitude and the week it was picked."
  actions={<>
    <ArenaButton variant="primary" size="lg" icon="ph-bold ph-storefront">Shop the lots</ArenaButton>
    <ArenaButton variant="ghost" size="lg" iconRight="ph-bold ph-arrow-right">How we buy</ArenaButton>
  </>}
  figure={<ArenaFigure fallback={<i className="ph-bold ph-mountains" aria-hidden="true" />} />} />
```

<!-- @api GENERATED from contracts/api/components/ArenaHero.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `title*` | primitive | `string` |  | The one line the page is built around. Required, and guarded at runtime after trimming: a hero is that line plus its setting, and a hero without it is a figure with buttons under it. The guard trims first because the value it exists to catch is a present and useless one, not an absent one, which the type already refuses. |
| `headingLevel` | enum | `ArenaHeadingLevel` | `"h1"` | Which rung of the document outline the title takes. Only the element changes: the title's class is the same at every value, so the render is identical and no appearance follows from it. It defaults to `h1` because a hero opens the page it sits on and a landing page carries no other title. A page carrying a hero AND a page head has two candidates for one rung, and the ladder settles which yields rather than the markup order: the hero is the rung above, so it keeps the `h1` and the page head is what steps down. Nothing here reads the page to work that out, because what a component renders is never derived from what sits above it. `none` is refused at runtime, the rule every component whose `title` is required follows: a title required because it names the thing it draws cannot also be told that the name is not one. |
| `eyebrow` | primitive | `string` |  | A line above the title saying what kind of page this is. Same register as every other eyebrow in the system, so a style plugin that takes them out of the console's mono capitals takes this one with them. |
| `lede` | primitive | `string` |  | The paragraph under the title, held to a reading width rather than to the column's, because a line that runs the whole width of a hero loses its return sweep. Named lede and not description, since this is the sentence that carries the page and not a note about the heading. |
| `actions` | slot |  |  | What the page asks the reader to do, in a wrapping row under the lede. Arena draws the row; the consumer draws what sits in it, and one primary action beside one secondary is the shape this is sized for. |
| `figure` | slot |  |  | The picture, the mark or the shape beside the words, or behind them under the bleed layout. It is a slot rather than a source, so an ArenaFigure, an illustration or a single glyph all land the same way. |
| `layout` | enum | `ArenaHeroLayout` | `"split"` | How the words sit against the figure. Split puts them side by side and falls to one column when the room runs out, with no breakpoint deciding when; stacked keeps them in one column at every width, for a hero whose figure is a band rather than a partner; bleed lays the words on the figure, over the wash the media overlay role paints, which is the arrangement that needs that role to be readable. |
| `align` | enum | `ArenaHeroAlign` | `"start"` | Whether the words run from the start edge or are centred in their column. Centred is what a bleed hero usually wants and a split one usually does not, and it is a separate decision from the layout because a stacked hero can want either. |

<!-- @api end -->

**`split` falls to one column with no breakpoint deciding when.** The threshold is derived from
`--grid-min`, the role that already answers how narrow a card may get, so a style plugin that widens the
grid minimum widens when a hero splits: one decision about how dense a page is rather than two
that can disagree.

**`bleed` lays the words on the figure**, which is the arrangement that makes the media overlay
role load-bearing. Give the figure something that fills its box, and give the words `align="center"`
unless the picture has an empty corner they can sit in.

**It claims no `banner` landmark.** Banner is the site header, one per page, and a hero is content
inside the main region rather than the furniture around it. The heading is what a reader navigates
to.

**A page carrying a hero and a page head has two candidates for one `h1`, and the ladder says
which yields.** The hero is the rung above, so it keeps the `h1` and the page head takes
`headingLevel="h2"`. Neither component reads the page to work that out, because what an Arena
component renders never follows from what sits above it, so the screen that carries both is the
screen that has to say so. On its own the hero is right as it stands.

**Do / Don't**
- **Do** keep the lede to a sentence or two. It is held to a reading width rather than the
  column's, because a line that runs the whole width of a hero loses its return sweep.
- **Do** put one primary action beside one secondary. The row is sized for that shape.
- **Don't** leave a second `h1` on the page. The hero already opened it, so the page head beside
  it steps down and anything you write of your own starts at `h2`.
- **Don't** reach for `bleed` over a photograph with detail where the words go. The wash keeps
  text readable; it does not make a busy picture quiet.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
