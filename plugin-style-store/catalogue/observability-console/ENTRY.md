# An observability console

The register of a board somebody watches while something is on fire: a rail of dashboards, a row of
figures, a grid of panels that are mostly plot, and a table of what is currently wrong. It is
measured on a commercial metrics console, and what is written down here is what the measurement
found.

Take this entry when the screen is charts and figures rather than records somebody edits, and when
the reader is comparing two panels rather than reading one.

## What this register answered

| The decision | The roles | This entry's answer | Why the register asks for it |
|---|---|---|---|
| How round it is | every `r-*` | the smallest step for all of them, the next one up for a floating surface only | a panel is a pane of glass over data, and a corner is the only part of it that is not data |
| Whether an edge is drawn | every `bw-*`, every `edge-*` | a hairline throughout, on the surface step | a board is read by where one panel stops and the next begins, so the line is the layout |
| Which face small text takes | `ff-eyebrow`, `ff-label`, `tt-*`, `track-label` | the mono face in capitals, tracked at the column-header step | every small string on this screen is a unit, a percentile or a series name, and a proportional face makes two of those the same width by accident |
| How loud type is | `fw-heading`, `fw-eyebrow`, `fw-control` | semibold for a heading, medium for the other two | the figures are already the loudest thing, and a stat card sets its own weight |
| How big anything is | `step-title-*` | every register pitched down, the page title at the third heading size | a board title above thirty panels is a label rather than a headline |
| How tight it is to the hand | `pad-control-*`, `gap-*`, `pad-surface` | tight, a single step of vertical control padding, the small surface padding | every pixel of chrome is a pixel of plot, and this is the register where that trade is most obvious |
| Which density it assumes | the compact class rather than a role | `.arena-compact` on the document | shared with the inbox entry and for the same reason: the screen is read rather than pointed at |
| How wide it breathes | `container-max`, `grid-min`, `gutter` | the widest container of the entries, a panel minimum wide enough for an axis, the narrowest gutter | a board fills the window, and a panel narrower than its own axis labels is a panel nobody can read |
| Whether depth is real | `shadow-*`, `lift-control` | nothing at all, except the floating and deep surfaces a menu and a dialog stand on | a panel that appeared to float would claim it could be moved, and a shadow behind a plot is contrast the data did not ask for |
| How it answers a hand | `press-scale`, `dur-*`, `ease-*` | no shrink, the fast duration on both, an out curve | nothing here is pressed; a hover on a plot is a crosshair and it has to keep up with a pointer |
| What shape a picture is | `aspect-media`, `fit-media` | sixteen by nine, **contained rather than filled** | media in this register is a captured panel or a topology diagram, and a diagram that lost a corner to its frame is a diagram nobody can act on. This is the only entry that answers `fit-media` with anything but a fill |
| Which colours a surface takes | every `fill-*` | **the panel takes the second surface step and the page takes the first**, which is the reverse of what the other entries do | a board is panels ON a page rather than a page divided into regions, and the whole depth of the register is that one step |

**The categorical ramp is doing most of the work and the style plugin is doing least**, which is the
finding this entry exists to record. Seven of the eight charts draw geometry whose coordinates are
the data, so they carry no part hook at all: a plugin reaches the frame and nothing inside the plot.
What skins a plot is `cat-1` through `cat-8` in `arena.config.json`, in the order they are declared,
because a slot means the same thing in every chart on the screen.

## The page it assumes

A rail at the sidebar width and a board taking the rest, inside `container-max` with a narrow
gutter. The board is a stat row on `auto-fit`, then a panel grid of **three fixed columns** falling
to two under the large breakpoint, with the widest panel spanning the row.

The panel grid is fixed rather than auto-fit, and that is the departure worth copying: `ArenaGrid`
decides its own column count from the room it is given, which is right when the count is the data's
and wrong when an operator is comparing panel four against panel five and the window has just been
resized.

Air is the group step throughout. Density is the compact class on the document.

## The components it leans on

The whole chart family and `ArenaChartCard` around each one, the stat card, the table with its row
and cell, the side navigation, the alert, the select, the badge, the tag and the icon button.
`frameworks/react/INDEX.md` names each under its category.

Almost nothing falls outside the component list, which is the other half of this register's finding:
a console is the product Arena is written for, so the markup of your own is the two grids and the
rail head.

**A scatter carries one value suffix and two axes.** Where the two axes are different quantities,
the unit goes in the axis label rather than the suffix, or one of the two ends up labelled in the
other's unit.

**Two decisions are painted by hand**, in `plugin.css` beside this page: a rule under a panel head,
and a panel title tracked the way every other label is. That sheet says which and why.

## What it does not bring

The palette and the fonts are the consumer's, and in this register the palette is most of the
appearance: replacing the eight ramp slots changes this entry more than replacing every other answer
in it. The ramp shipped here is measured against the contrast and colour-vision gates on both
surfaces, so a replacement is measured the same way or the charts stop being readable for somebody.

The copy, the brand mark, the alert rules and the question of being found from outside are still
open, and a console behind a login answers the last of those no.
