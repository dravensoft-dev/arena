# A photo feed

The register of a product where the picture is the content and everything else gets out of its way:
a scrolling column of posts, a rail of stories, a viewer that opens a picture at full size. It is
measured on a commercial photo feed, and what is written down here is what the measurement found.

Take this entry when the thing on screen is the thing being looked at, rather than a container the
reader looks past.

## What this register answered

| The decision | The roles | This entry's answer | Why the register asks for it |
|---|---|---|---|
| How round it is | `r-control`, `r-field`, `r-media`, `r-surface` | a middle radius on controls and fields, and a square corner on media | the one entry that answers `r-media` with a literal zero, because a wall of pictures tiles and a rounded picture does not |
| Whether an edge is drawn | every `bw-*` | a hairline on surfaces and fields, no border at all on a control, a heavier one on a marker | a solid pill of accent is the button here, and a border on it would read as chrome |
| How loud type is | `fw-heading`, `fw-eyebrow`, `fw-control` | semibold throughout | type is a caption beside a picture and never competes with it |
| Whether small text shouts | `tt-label`, `tt-eyebrow`, `track-label`, `track-eyebrow` | no transform, normal tracking | a handle is a word rather than a label, and capitalising it would make it chrome |
| How tight it is to the hand | `pad-control-*`, `gap-*` | a generous horizontal padding on a control and a wide inline gap | a phone first product, read at arm's length |
| How wide it breathes | `container-max`, `measure-prose`, `grid-min`, `gutter` | a narrow container and the largest grid cell of the four | the feed is one column of large pictures rather than a wide grid of small ones |
| Whether depth is real | `shadow-surface-floating`, `shadow-control-raised` | the deepest and darkest floating shadow of the four, and nothing raised | a sheet over a picture has to separate from an image nobody chose, which a faint shadow cannot do |
| How it answers a hand | `press-scale`, `lift-control`, `dur-state`, `ease-state` | the strongest press shrink of the four, on an emphatic curve | the only feedback available on a surface with no chrome is the surface itself moving |
| What shape a picture is | `aspect-media`, `fit-media` | square, filled | the crop is the grid's decision rather than the photograph's, which is what makes a wall read as a wall |

Those last two matter more here than anywhere else. `skills/design/references/media-register.md`
says to answer the media roles first and look at the result before answering anything else, and this
is the entry that argument was written about.

## The page it assumes

A two column grid with a narrow icon rail and a main column on `minmax(0, 1fr)`. Inside the main
column the feed is itself two columns, the posts and a narrower aside, capped at `container-max`.
The rail is sticky.

Air between posts is the section step, which is larger than any other register spends between two
adjacent things, because a post is a whole object rather than a row. Density stays at the default:
this register neither compacts nor grows its controls, since almost none of the screen is a control.

## The components it leans on

Very few, and that is the register rather than a gap: the avatar, the button and icon button, the
menu, the dialog, the scroller for the story rail, and the people list. `frameworks/react/INDEX.md`
names each under its category.

The post, the wall and the viewer are markup you write, and
`skills/design/references/media-register.md` is what Arena hands you instead of a component: the
behaviour contract each element binds, the figure component for the frame, the parts already
shipped for a viewer, and the one rule that bends here.

## What it does not bring

The palette and the fonts are the consumer's, and this register is the one where that matters least,
because most of the screen is a photograph and takes its colour from the photograph.

The copy, the brand mark, and whether anything has to be found from outside are still open. This is
also the register most likely to answer yes to that last one, so settle it before the first route
rather than after.
