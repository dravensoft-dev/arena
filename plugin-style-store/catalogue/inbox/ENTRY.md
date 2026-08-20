# An inbox

The register of a two pane client somebody keeps open and drives from the keyboard: a rail of
mailboxes, a dense list of conversations, and a reading column beside it. It is measured on a
commercial mail client, and what is written down here is what the measurement found.

Take this entry when the screen is a list against a reading column, when the reader is going through
items rather than choosing between them, and when the fastest way to do anything is a key.

## What this register answered

| The decision | The roles | This entry's answer | Why the register asks for it |
|---|---|---|---|
| How round it is | `r-control`, `r-control-sm`, `r-field`, `r-surface`, `r-marker` | the small step for a control, a field and a surface, the smallest for a control at size and for a marker | almost square, because a corner is a pixel of vertical rhythm and this register spends every one of them on another row |
| Whether an edge is drawn | every `bw-*`, every `edge-*` bar one | a hairline throughout on the surface step, and `edge-marker` on the muted text colour | a separator is the only chrome between two rows, and a keyboard cap is the one marker that has to be found rather than merely seen |
| Which face small text takes | `ff-eyebrow`, `ff-label` | the mono face for both, in capitals with the navigation tracking | a client driven by keys already speaks in keys, and a field label in mono is the register saying so before any shortcut is pressed |
| How loud type is | `fw-heading`, `fw-eyebrow`, `fw-control` | semibold for a heading, medium for the other two | weight is what separates an unread row from a read one, so it is spent there rather than on the furniture |
| How big anything is | `step-title-*`, `step-eyebrow` | every register pitched down a step, the page title at the third heading size and the hero at the first | a title bigger than a subject line would be a page announcing itself to a reader who is already inside it |
| How tight it is to the hand | `pad-control-*`, `gap-*`, `pad-surface` | the tightest of the entries, a single step of vertical control padding | the whole register is how many conversations fit above the fold |
| Which density it assumes | the compact class rather than a role | `.arena-compact` on the document, as the default rather than the desk option | this is the entry where the compact class is the product, and the comfortable one is what a touch build would opt into |
| How wide it breathes | `container-max`, `grid-min`, `gutter`, `measure-prose` | a very wide container, the narrowest gutter of the entries, and the widest prose measure | the panes fill the window and the reading column is the only thing that stops, so the measure is the one length that matters |
| Whether depth is real | `shadow-*`, `lift-control` | nothing anywhere, except the floating and deep surfaces the palette and the command palette stand on | nothing on this screen is an object: it is a list of text, and a shadow under a row would be a claim that it could be picked up |
| How it answers a hand | `press-scale`, `dur-*`, `ease-*` | no shrink at all, the fast duration on both, an out curve | a control that shrinks under a pointer is answering the wrong input device; the answer here is that the next row is already selected |
| What shape a picture is | `aspect-media`, `fit-media`, `overlay-media` | landscape at three by two, filled, the wash on the page surface | media in this register is an attachment preview and never the content, so the shape is a document's rather than a photograph's |
| Which colours a surface takes | every `fill-*` | the page surface for a surface and the sunken step for the rail, the field and every hover | the rail sits back and the two live panes come forward, which is the whole of the depth this register has |

**The compact class and the mono label are the pair that carries this register.** The first is what
makes the list a list, and the second is what makes a reader reach for a key instead of a pointer.

## The page it assumes

Three columns that fill the window: the rail at the sidebar width, the conversation list between a
phone's width and a little over, and the reading column taking the rest. The rail and the list are
sticky at full height and scroll inside themselves, so only the reading column moves.

Air is the group step almost everywhere, because a component step between two rows would halve the
list. The reading column stops at the prose measure plus a margin, and nothing else on the screen
has a maximum at all. Density is the compact class, declared on the document rather than reached
for per screen.

## The components it leans on

The side navigation family, the command palette, the segmented control, the input, the tag, the
avatar, the button, the icon button and the figure. `frameworks/react/INDEX.md` names each under its
category.

Two things fall outside the component list into markup of your own:

- **The conversation row.** A sender, a count, a subject run into its own snippet, a time and a
  clip: every one of those is that product's field, and the row is the densest thing on the screen.
  `ArenaActivityFeed` is the name a search returns and it is an event log with a fixed row.
- **The keyboard cap.** `r-marker`, `bw-marker` and `edge-marker` are written for exactly this and
  no component draws one, so a real `kbd` takes the three by name.

**A flag has no colour role and no palette key**, and a status colour would say the conversation IS
a warning. This entry paints the star from `ink-heading` and lets filled against absent carry it.

**Two decisions are painted by hand**, in `plugin.css` beside this page: a label that is a chip
rather than a pill, and a mailbox row at the density the rest of the screen keeps. That sheet says
which and why.

## What it does not bring

The palette and the fonts are the consumer's. This register leans on the mono face harder than the
others, so a config that answers all three font slots with one family loses most of what separates
it from a console.

The copy, the brand mark, the shortcut map and the question of being found from outside are still
open, and a client behind a login answers the last of those no.
