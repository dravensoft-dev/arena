# A document workspace

The register of a product somebody writes in: a page tree down the side, a document in the middle,
a database that is a grid of records, and as little chrome as the job allows. It is measured on a
commercial document workspace, and what is written down here is what the measurement found.

Take this entry when the product is mostly text the user made, and when the interface succeeds by
being hard to notice.

## What this register answered

| The decision | The roles | This entry's answer | Why the register asks for it |
|---|---|---|---|
| How round it is | `r-control`, `r-field`, `r-media`, `r-surface` | the smallest radius step for every one of them | nearly square, because a rounded corner is a visible object and this register is trying not to have any |
| Whether an edge is drawn | every `bw-*` | a hairline throughout | the line is there to be found rather than seen |
| How loud type is | `fw-heading`, `fw-eyebrow`, `fw-control` | bold for a heading, medium for the other two | the quietest of the four, and the only one that leaves a control at a text weight |
| Whether small text shouts | `tt-label`, `tt-eyebrow`, `track-label`, `track-eyebrow` | no transform, normal tracking | a page name is the user's word and capitalising it would overwrite their intent |
| How tight it is to the hand | `pad-control-*`, `gap-*` | the tightest padding of the four | a page tree is a long list, and the chrome around the document is trying to disappear |
| How wide it breathes | `container-max`, `measure-prose`, `grid-min`, `gutter` | a narrow container, the widest prose measure of the four, and by far the largest gutter | the document is a reading column with a lot of margin around it |
| Whether depth is real | `shadow-surface-floating`, `shadow-control-raised` | a soft shadow on a floating surface only, and none at rest or on a control | a menu floats and nothing else does, because a raised control would be an object on a page that has none |
| How it answers a hand | `press-scale`, `lift-control`, `dur-state`, `ease-state` | no shrink, no rise, the fast duration on an out curve | the least physical of the four, and the quickest, because the interface is trying to keep up with typing |
| What shape a picture is | `aspect-media`, `fit-media` | a wide landscape, filled | a cover image at the head of a document rather than a picture in a grid |

The widest prose measure and the largest gutter are the pair that carry this register. They are what
turn the same components into a reading surface rather than a console.

## The page it assumes

A two column grid: a side rail holding the page tree, and a main column on `minmax(0, 1fr)`. The
rail collapses to nothing rather than narrowing. Inside the main column the document sits in a
centred column capped by `measure-prose`, with the gutter doing the rest.

Air between components is the component step around the document and the group step inside the page
tree. Density stays at the default on the desk, and the compact class is a reasonable answer for the
tree alone if the tree is long.

## The components it leans on

The side navigation family, the table, the tabs, the breadcrumbs, the command palette, the board,
the grid and the figure, the tag, the checkbox and the input.
`frameworks/react/INDEX.md` names each under its category.

The document itself is markup you write. A paragraph, a heading, a quote, a callout, a toggle, a
code block and a figure are the block family of a document editor, and
`skills/design/references/style-kernel.md` says in as many words that the kernel does not reach
them. The skin still travels, so those blocks are written against the same tokens.

## What it does not bring

The palette and the fonts are the consumer's. This register leans harder on the type ramp than on
colour, so a replacement body face changes it more than a replacement accent does.

The copy, the brand mark and the question of being found from outside are still open.
