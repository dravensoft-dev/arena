# A language course

The register of a product that teaches by repetition and wants to be pressed: a lesson path, a
streak, a progress bar, and one big button that is the whole screen's reason. It is measured on a
commercial language course, and what is written down here is what the measurement found.

Take this entry when the product is used in short bursts, mostly by a thumb, and when getting the
next thing pressed matters more than getting more onto the screen.

## What this register answered

| The decision | The roles | This entry's answer | Why the register asks for it |
|---|---|---|---|
| How round it is | `r-control`, `r-field`, `r-media`, `r-surface` | the large radius step for controls, fields and media, and the extra large one for surfaces | the roundest of the four registers, because a soft object reads as safe to press |
| Whether an edge is drawn | every `bw-*` | a drawn line at twice the hairline | the border is part of the object rather than a separator, and a hairline would disappear under the fill |
| How loud type is | `fw-heading`, `fw-eyebrow`, `fw-control` | black, black, bold | the loudest of the four, and the only one that puts the display face on a button |
| Whether small text shouts | `tt-label`, `tt-eyebrow`, `track-label`, `track-eyebrow` | uppercase, with the badge tracking on a label | a control's own text is a shout, which is coherent with everything else here |
| How tight it is to the hand | `pad-control-*`, `gap-*` | the loosest padding of the four | a target sized for a thumb rather than for a pointer |
| How wide it breathes | `container-max`, `measure-prose`, `grid-min`, `gutter` | a moderate container and the narrowest prose measure of the four | a lesson is read one short line at a time |
| Whether depth is real | `shadow-surface-floating`, `shadow-control-raised` | a hard offset with no blur at all | depth here is a solid edge under the object rather than a soft cloud behind it |
| How it answers a hand | `press-scale`, `lift-control`, `dur-state`, `ease-state` | no shrink and no rise, on an emphatic curve | the press is painted instead, and the next section says why |
| What shape a picture is | `aspect-media`, `fit-media` | square, contained | an illustration has to survive whole, so nothing is cropped |

## What the kernel could not answer, and this entry paints

The voice of this register is one gesture: a control stands on a hard bottom edge and drops into it
when pressed. `lift-control` is a hover rise and `press-scale` is a press shrink, and neither is a
press travel, so `plugin.css` beside this file paints it through the button and icon button part
hooks. It is the clearest measured case of the kernel not reaching something, and it costs a few
rules rather than a fork.

## The page it assumes

A two column grid with a side rail wider than the other registers use, holding the lesson path, and
a main column on `minmax(0, 1fr)`. The rail is sticky rather than scrolling with the content. The
main column is a single centred stack and never a board.

Air between components is the component step almost everywhere, because this register has few
things on screen and gives each of them room. It expects the comfortable density class, which grows
the controls to a touch target, and it is the one entry of the four that does.

## The components it leans on

Few, and the fewness is the register: the button and the icon button, the card, the progress bar,
the avatar, and the people list for a leaderboard. `frameworks/react/INDEX.md` names each under
its category.

The lesson path itself is markup you write. It is a game map rather than furniture, so Arena hands
you the pattern instead of a component, and `skills/design/references/media-register.md` is that
handover.

## What it does not bring

The palette and the fonts are the consumer's. The ones shipped here are the measurement's, and the
display face carrying the weight is doing more work in this register than in any other, so a
replacement face that has no black weight changes the product more than it looks like it will.

The copy, the brand mark and the question of being found from outside are all still open.
