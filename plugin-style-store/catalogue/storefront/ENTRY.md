# A storefront

The register of a product that sells what somebody else made: a grid of listings that are mostly
photograph, a price read at a glance, a marker saying why this one is different, and a buy column
ending in one button. It is measured on a commercial handmade marketplace, and what is written down
here is what the measurement found.

Take this entry when the thing on screen is a catalogue of items for sale, and when the picture and
the price are the two things a reader is comparing.

## What this register answered

| The decision | The roles | This entry's answer | Why the register asks for it |
|---|---|---|---|
| How round it is | `r-control`, `r-control-sm`, `r-field`, `r-surface`, `r-media` | the pill for every control and every field, the large step for surfaces and media | a search field shaped like a button is what says the page is for asking |
| What a marker is shaped like | `r-marker` | the smallest step, against the pill everything else takes | a stamp on a picture must not read as another control the reader could press |
| Whether an edge is drawn | every `bw-*`, and `edge-control` and `edge-field` against the other `edge-*` | a hairline throughout, and those two answered with the text colour where the other entries use the surface step | this entry's sharpest departure: a second action has to be refusable at a glance, and a hairline in the surface ramp is not |
| How loud type is | `fw-heading`, `fw-eyebrow`, `fw-control` | semibold for all three, and nothing above it | the picture is the loud thing, and a heavier title competes with the item it names |
| Whether small text shouts | `tt-eyebrow`, `tt-label`, `track-eyebrow`, `track-label` | capitals with the status tracking for an eyebrow, a plain word for a label | SALE is a stamp; a facet, a field label and a shop name are the reader's own words |
| Which face small text takes | `ff-eyebrow`, `ff-label` | the body face for both | a mono label reads as a system talking rather than as a shopfront |
| How big a card's own title is | `step-title-surface` | the body size, a step under the section register | a listing title is read to the end rather than scanned past |
| How tight it is to the hand | `pad-control-*`, `gap-*` | the widest control padding of the entries | a pill needs horizontal room before it reads as one |
| How wide it breathes | `container-max`, `grid-min`, `gutter`, `measure-prose` | the widest container, a card minimum near a phone's width, a narrow gutter, a measure under the default | the page gives the gutter back to the grid, and the measure only ever holds one description |
| Whether depth is real | `shadow-*`, `lift-control` | nothing at rest, the small shadow on a raised control, the soft one floating, and a real rise | a card carrying a photograph is already an object; the control that lifts is what answers a pointer |
| How it answers a hand | `press-scale`, `dur-*`, `ease-*` | a small shrink, the fast duration on both, an out curve | pressing is what this register is for |
| What shape a picture is | `aspect-media`, `fit-media`, `overlay-media` | portrait at four by five, filled, and the wash is the page's own surface | the entry that exercises the portrait answer: one crop is what makes a grid read as a grid, and a surface under a stamp keeps it legible over a photograph nobody chose |
| Which colours a surface takes | every `fill-*` | the page surface for a card and for a field, the sunken step only for a hover and a track | a card the same colour as the page leaves the photograph as the only object on it |

**The portrait crop and the drawn control edge are the pair that carries this register.** Everything
else is a shop being ordinary, and those two are what stop the same components reading as a console.

## The page it assumes

A band across the top holding the search field, a row of departments under it, then a single column
of results inside `container-max` with the gutter either side. The grid is `ArenaGrid` off
`grid-min`, because the column count is the room's answer rather than the design's.

A listing page is two columns, the gallery on the wider and the buy column on the narrower, falling
to one under the medium breakpoint. Air is the component step between components and the group step
inside the buy column. Density stays at the default: this register is looked at on a desk and
pressed on a phone, and neither is a console.

## The components it leans on

The app bar, the site footer, the figure, the grid, the scroller, the section, the breadcrumbs, the
pagination, the segmented control, the tag, the select, the input, the button, the key value list,
the alert, the avatar and the sheet. `frameworks/react/INDEX.md` names each under its category.

Three things fall outside the component list into markup of your own:

- **The listing card**, whose every field is that product's own. `ArenaFigure` is the frame inside
  it and answers the shape.
- **The marker**, which is neither a tag nor a badge: it stands in the figure's overlay slot and
  takes `r-marker`, `bw-marker` and `edge-marker` from the kernel by name.
- **The control laid over a picture**, the save on each card. Arena's icon button fills with the
  accent in its solid variant, and a plugin selects by part and never by the value of a variant, so
  that difference cannot be painted. The shop draws the control and stands it on `overlay-media`,
  which is what
  [`skills/design/references/media-register.md`](../../../skills/design/references/media-register.md)
  says to do for anything laid over media.

**A rating has no colour role and no palette key**, and a status colour would say the rating IS a
warning. This entry paints the mark from `ink-heading` and lets filled against outlined carry it.

**Three decisions are painted by hand**, in `plugin.css` beside this page: where a marker sits on a
frame, how much air the bar spends on itself, and a trail pitched as chrome. That sheet says which
and why, and it is the copy that stops being true the day a rule is dropped.

## What it does not bring

The palette and the fonts are the consumer's. This register leans on the palette harder than the
others, because the accent is the price and the marker at once, so a replacement accent changes more
here than a replacement face.

The copy, the brand mark, the currency and the question of being found from outside are still open,
and a shop almost always answers the last of those yes.
