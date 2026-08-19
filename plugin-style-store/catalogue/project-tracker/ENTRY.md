# A project tracker

The register of a tool a team runs its work in: a space tree down the side, a board of columns, a
table of records, widgets that count things, and a feed of what changed. It is measured on a
commercial project tracker, and what is written down here is what the measurement found rather than
what the product says about itself.

Take this entry when the thing being built is a console somebody keeps open all day and the screen
has to hold more than it comfortably fits.

## What this register answered

| The decision | The roles | This entry's answer | Why the register asks for it |
|---|---|---|---|
| How round it is | `r-control`, `r-field`, `r-media`, `r-surface` | the small radius step for controls, fields and media, and the middle one for surfaces | a corner large enough to read as deliberate and small enough that a dense row of them does not turn into a row of pills |
| Whether an edge is drawn | every `bw-*` | a hairline throughout | a console separates by line rather than by air, because air is the thing it does not have |
| How loud type is | `fw-heading`, `fw-eyebrow`, `fw-control` | bold, bold, semibold | the head of a widget has to win against the figure inside it |
| Whether small text shouts | `tt-label`, `tt-eyebrow`, `track-label`, `track-eyebrow` | uppercase, with the standard uppercase tracking | a status and a column head are labels rather than words, and capitals is how this register says so |
| How tight it is to the hand | `pad-control-*`, `gap-*` | the low steps of the spacing scale throughout | every pixel of padding is a row the screen stops holding |
| How wide it breathes | `container-max`, `measure-prose`, `grid-min`, `gutter` | the widest container of the four registers, a moderate prose measure, a mid grid cell | a board is read across, so the column runs to the window |
| Whether depth is real | `shadow-surface-floating`, `shadow-control-raised` | a soft near shadow on both, and no shadow at rest | a menu and a pressed control lift off the page, and nothing else does |
| How it answers a hand | `press-scale`, `lift-control`, `dur-state`, `ease-state` | a slight shrink, a one pixel rise, a middle duration on an out curve | the feedback is confirmation and never celebration |
| What shape a picture is | `aspect-media`, `fit-media` | a landscape crop, filled | an attachment thumbnail is a preview of a document rather than a picture somebody chose |

The colour roles are answered the way every measured product answers them, so the palette in
`arena.config.json` beside this file is what makes it look like a brand rather than like this
entry.

## The page it assumes

A two column grid: a fixed side rail holding the space tree, and a main column that takes the rest
with `minmax(0, 1fr)` so a wide table cannot push the rail. The rail collapses to nothing rather
than narrowing. The main column carries a bar of chrome at the top, a breadcrumb trail under it,
and the work below that.

The measured product writes that grid itself, on elements of its own, which is what Arena expects:
the pieces are shipped and the shape is not. Air between two components comes from the rhythm
classes on your own containers, and this register spends the group step between rows of a widget
and the component step between widgets. It expects the compact density class on the desk and never
the comfortable one.

## The components it leans on

Almost the whole product register, which is why it is the entry that reaches furthest into Arena:
the side navigation family, the board, the table, the chart cards and the stat cards, the command
palette, the tag, the bulk action bar and the activity feed. `frameworks/react/INDEX.md` names
each under the category it is filed under.

Nothing in this register falls outside Arena's component list, so no part of this screen is markup
you write for want of a component.

## What it does not bring

The palette and the fonts are the consumer's, and the ones shipped here are the measurement's.
Replacing them is the ordinary case and changes nothing this entry decided, because a colour role
says which of your colours a surface takes and never which colour that is.

The copy, the brand mark and whether anything has to be found from outside the product are all
still open. Choosing this entry settles how the product looks and settles nothing about what it is.
